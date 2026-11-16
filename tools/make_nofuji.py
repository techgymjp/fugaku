"""原画と正解の輪郭線から「富士山を消した絵」を作る。

使い方:
    python3 tools/make_nofuji.py            # 全図
    python3 tools/make_nofuji.py kanagawa   # 指定した図だけ

仕組み:
  輪郭線（稜線）と、図ごとに指定した富士山の下端（OVERRIDES）で囲んだ範囲を
  「富士山の領域」とし、その領域を左右の背景（空）の色で横方向に補間して塗りつぶす。
  浮世絵の空は横縞のぼかしが多いので、横方向の補間が自然に見えやすい。
  下端の指定がない図は、稜線の両端を直線で結んで閉じる。
"""
import json
import re
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent

# 図ごとの調整（座標は画像の幅・高さに対する割合）
#   base:   富士山の見えている下端をなぞった線（左→右）。稜線とこの線で囲んだ範囲を消す。
#           線が複数ある図は {線の番号: 下端} で指定する。
#           指定がない線は、稜線の両端を直線で結んで閉じる。
#   join:   [i, j] 番目の線をつないで1つの範囲にする（雲などで稜線が途切れている図）
#   stroke: True なら稜線の墨線だけを消す（山肌が紙の地色と同じ図）
#   band:   稜線から下へこの幅だけ消す（山の中にいる図）
#   strips: [x0, x1, y0, y1] 空の見本から細い横帯を切り出し、ずらしながら積み重ねて埋める
#   clip:   消す範囲をこの多角形の内側に限る（紙の白い縁を残す）
#   feather: 消した範囲の境目をぼかす幅（px）
#   tile:   [x0, x1, y1, ywrap] 空だけが写っている四角の模様を繰り返して埋める
#           （富士山が画面の大半を占める図）
#   extra:  ほかに消す多角形のリスト（湖に映った逆さ富士など）
#   vref:   [x0, x1, (tol), (ymax)] 富士山の横の背景の列を、行ごとに延ばして埋める
#   side:   "left" / "right" 片側の背景色だけで埋める（左右で背景が違う図）
#   protect: 消さない多角形のリスト（手前の木の幹など）
#   keep:   "blue" / "teal" なら藍色 / 青緑色の画素（手前の木の幹など）は消さない
#   pad:    範囲を外側へ広げる幅（px）
FULL = [[0.0, 1.0], [1.0, 1.0]]
OVERRIDES = {
    "gaifu": {"base": FULL, "extra": [[[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]], "clip": [[0.011, 0.014], [0.989, 0.014], [0.989, 0.984], [0.011, 0.984]], "protect": [[[0.045, 0.045], [0.145, 0.045], [0.145, 0.33], [0.045, 0.33]]], "strips": [0.16, 0.62, 0.04, 0.34], "feather": 4, "pad": 0},
    "sanka": {"base": FULL, "extra": [[[0.0, 0.40], [0.21, 0.40], [0.21, 0.02], [1.0, 0.02], [1.0, 1.0], [0.0, 1.0]]], "vref": [0.25, 0.45, 0, 0.29]},
    "tozan": {"vref": [0.30, 0.45, 0, 0.36], "band": 0.08},
    "kajikazawa": {"vref": [0.40, 0.45]},
    "ejiri": {"stroke": True, "keep": "blue"},
    "kanagawa": {"vref": [0.72, 0.76], "base": [[0.582, 0.705], [0.60, 0.725], [0.65, 0.73], [0.689, 0.725]]},
    "kanaya": {"base": [[0.165, 0.19], [0.22, 0.19], [0.30, 0.20], [0.36, 0.215], [0.418, 0.225]]},
    "katakura": {"base": [[0.11, 0.30], [0.20, 0.31], [0.30, 0.315], [0.40, 0.315], [0.50, 0.31], [0.547, 0.30]]},
    "umezawa": {"base": [[0.21, 0.50], [0.35, 0.50], [0.48, 0.48], [0.55, 0.45], [0.60, 0.39], [0.65, 0.34], [0.72, 0.31], [0.82, 0.30]]},
    "totomi": {"base": [[0.217, 0.56], [0.23, 0.60], [0.27, 0.60], [0.301, 0.57]]},
    "mishima": {"protect": [[[0.515, 0.0], [0.630, 0.0], [0.630, 1.0], [0.515, 1.0]]], "join": [1, 2], "base": {1: [[0.585, 0.39], [0.585, 0.52], [0.66, 0.52], [0.74, 0.50], [0.88, 0.515]]}},
    "aoyama": {"vref": [0.64, 0.70], "base": [[0.04, 0.44], [0.15, 0.42], [0.30, 0.43], [0.45, 0.43], [0.55, 0.42], [0.596, 0.36]]},
    "enoshima": {"base": [[0.79, 0.53], [0.82, 0.545], [0.88, 0.55], [0.92, 0.535]]},
    "gotenyama": {"base": [[0.415, 0.445], [0.43, 0.455], [0.47, 0.46], [0.50, 0.455]]},
    "hakone": {"base": [[0.15, 0.41], [0.20, 0.425], [0.25, 0.43], [0.30, 0.415]]},
    "hodogaya": {"base": [[0.30, 0.565], [0.33, 0.585], [0.40, 0.585], [0.46, 0.58], [0.48, 0.56]]},
    "honganji": {"vref": [0.36, 0.39], "base": [[0.38, 0.52], [0.45, 0.535], [0.52, 0.53], [0.56, 0.50], [0.60, 0.47], [0.62, 0.445]]},
    "honjo": {"base": [[0.825, 0.37], [0.84, 0.385], [0.88, 0.385], [0.895, 0.38]]},
    "inume": {"vref": [0.08, 0.12], "base": [[0.17, 0.49], [0.30, 0.495], [0.40, 0.50], [0.50, 0.50], [0.58, 0.50], [0.67, 0.52], [0.705, 0.535]]},
    "koishikawa": {"base": [[0.613, 0.592], [0.70, 0.59], [0.80, 0.59], [0.86, 0.585], [0.88, 0.56]]},
    "mannenbashi": {"base": [[0.347, 0.605], [0.35, 0.645], [0.40, 0.645], [0.43, 0.64], [0.43, 0.62]]},
    "minobu": {"base": [[0.355, 0.26], [0.39, 0.29], [0.42, 0.32], [0.46, 0.35], [0.50, 0.36]]},
    "misaka": {"extra": [[[0.30, 0.71], [0.40, 0.70], [0.45, 0.69], [0.62, 0.66], [0.67, 0.66], [0.60, 0.72], [0.53, 0.80], [0.48, 0.87], [0.44, 0.85], [0.40, 0.78], [0.33, 0.74]]], "base": [[0.24, 0.39], [0.30, 0.385], [0.36, 0.38], [0.40, 0.37], [0.45, 0.36], [0.50, 0.355], [0.55, 0.35], [0.60, 0.35], [0.65, 0.34], [0.70, 0.335], [0.73, 0.33]]},
    "mitsui": {"base": [[0.28, 0.71], [0.35, 0.715], [0.45, 0.715], [0.535, 0.715]]},
    "nakahara": {"base": [[0.0, 0.34], [0.25, 0.28], [0.40, 0.235], [0.48, 0.232], [0.55, 0.228], [0.58, 0.21], [0.62, 0.18], [0.655, 0.155], [0.667, 0.151]]},
    "onden": {"base": [[0.72, 0.435], [0.80, 0.44], [0.88, 0.44], [0.917, 0.43]]},
    "ono": {"base": [[0.413, 0.205], [0.50, 0.20], [0.58, 0.195], [0.62, 0.185]]},
    "senju": {"base": {0: [[0.561, 0.405], [0.60, 0.40], [0.632, 0.40]], 1: [[0.65, 0.40], [0.66, 0.40]]}},
    "senjukagai": {"base": [[0.441, 0.25], [0.47, 0.26], [0.50, 0.26], [0.52, 0.27], [0.55, 0.26], [0.58, 0.25], [0.602, 0.245]]},
    "shichirigahama": {"vref": [0.88, 0.93, 250], "base": [[0.594, 0.375], [0.65, 0.40], [0.72, 0.425], [0.80, 0.435], [0.867, 0.432]]},
    "tagonoura": {"base": [[0.129, 0.392], [0.20, 0.38], [0.311, 0.375], [0.38, 0.37], [0.45, 0.367], [0.533, 0.355], [0.60, 0.33], [0.655, 0.30], [0.70, 0.29], [0.73, 0.27], [0.756, 0.243], [0.80, 0.24], [0.84, 0.24]]},
    "tamagawa": {"base": [[0.40, 0.24], [0.45, 0.255], [0.55, 0.26], [0.65, 0.265], [0.73, 0.262]]},
    "tsukudajima": {"base": [[0.45, 0.355], [0.50, 0.37], [0.58, 0.37], [0.603, 0.35]]},
    "sazaido": {"base": [[0.4056, 0.425], [0.42, 0.445], [0.47, 0.445], [0.4806, 0.428]]},
    "shimomeguro": {"vref": [0.47, 0.50], "base": [[0.519, 0.644], [0.55, 0.665], [0.58, 0.645], [0.603, 0.604]]},
    "yoshida": {"base": [[0.171, 0.50], [0.171, 0.525], [0.22, 0.525], [0.256, 0.522]]},
}


def load_outlines():
    src = (ROOT / "js/outlines.js").read_text(encoding="utf-8")
    start = src.index("{", src.index("FUJI_OUTLINES"))
    body = src[start: src.rindex("}") + 1]
    body = re.sub(r",\s*}", "}", body)
    return json.loads(body)


def region_mask(lines, w, h, opt):
    mask = np.zeros((h, w), np.uint8)
    P = lambda l: np.array([[x * w, y * h] for x, y in l], np.float32)
    pts_lines = [P(l) for l in lines]
    base = opt.get("base")
    if isinstance(base, list):
        base = {0: base}
    base = base or {}
    groups = []  # (稜線の点列, 番号)
    join = opt.get("join")
    for i, pts in enumerate(pts_lines):
        if join and i in join[1:]:
            continue
        if join and i == join[0]:
            pts = np.concatenate([pts_lines[j] for j in join])
        groups.append((pts, i))
    for pts, i in groups:
        if opt.get("stroke"):
            pass
        elif "band" in opt:
            band = np.array([[x, y + opt["band"] * h] for x, y in pts], np.float32)
            cv2.fillPoly(mask, [np.round(np.vstack([pts, band[::-1]])).astype(np.int32)], 255)
        elif i in base:
            poly = np.vstack([pts, P(base[i])[::-1]])
            cv2.fillPoly(mask, [np.round(poly).astype(np.int32)], 255)
        else:
            cv2.fillPoly(mask, [np.round(pts).astype(np.int32)], 255)
    for pts in pts_lines:
        # 稜線の墨線そのものも消す
        cv2.polylines(mask, [np.round(pts).astype(np.int32)], False, 255,
                      thickness=max(3, int(round(w * 0.006))))
    for poly in opt.get("extra", []):
        cv2.fillPoly(mask, [np.round(P(poly)).astype(np.int32)], 255)
    pad = opt.get("pad", 3)
    if pad:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (pad * 2 + 1, pad * 2 + 1))
        mask = cv2.dilate(mask, k)
    return mask


def fill_rows(img, mask, sample=4, tol=38.0, side=None):
    """マスクされた画素を、同じ行の左右の背景色で線形補間して埋める。

    上の行から順に処理し、左右の見本の色が上の行の見本から大きく外れたら
    （＝空ではなく手前の山や雲に当たったら）、上の行の色を引き継いで空を下へ延ばす。
    """
    out = img.astype(np.float32).copy()
    h, w = mask.shape
    prev = {}  # x位置 -> (左の色, 右の色)
    for y in range(h):
        row = mask[y] > 0
        if not row.any():
            prev = {}
            continue
        cur = {}
        x = 0
        while x < w:
            if not row[x]:
                x += 1
                continue
            x0 = x
            while x < w and row[x]:
                x += 1
            x1 = x
            left = img[y, max(0, x0 - sample):x0].reshape(-1, 3).astype(np.float32)
            right = img[y, x1:min(w, x1 + sample)].reshape(-1, 3).astype(np.float32)
            cl = np.median(left, axis=0) if len(left) else None
            cr = np.median(right, axis=0) if len(right) else None
            # 上の行で近い位置にあった区間の色
            key = min(prev, key=lambda k: abs(k - (x0 + x1) / 2), default=None)
            if key is not None and abs(key - (x0 + x1) / 2) < max(40, (x1 - x0)):
                pl, pr = prev[key]
                if cl is None or np.linalg.norm(cl - pl) > tol:
                    cl = pl
                if cr is None or np.linalg.norm(cr - pr) > tol:
                    cr = pr
            if side == "right" and cr is not None:
                cl = cr
            if side == "left" and cl is not None:
                cr = cl
            if cl is None:
                cl = cr
            if cr is None:
                cr = cl
            if cl is None:
                continue
            t = np.linspace(0, 1, x1 - x0 + 2)[1:-1, None]
            out[y, x0:x1] = cl * (1 - t) + cr * t
            cur[(x0 + x1) / 2] = (cl, cr)
        prev = cur
    return out


def fill_tile(img, mask, x0, x1, y1, ywrap):
    """マスクされた画素を、空だけが写っている四角 [x0, x1) × [0, y1) の模様で埋める。
    横は同じ行の空を繰り返し（空の縦のぼかしを保つ）、y1 より下は [ywrap, y1) の行を繰り返す。"""
    out = img.astype(np.float32).copy()
    h, w = mask.shape
    X0, X1, Y1, YW = int(x0 * w), int(x1 * w), int(y1 * h), int(ywrap * h)
    ys, xs = np.nonzero(mask)
    sy = np.where(ys < Y1, ys, YW + (ys - Y1) % (Y1 - YW))
    sx = X0 + (xs - X0) % (X1 - X0)
    out[ys, xs] = img[sy, sx]
    return out


def fill_vref(img, mask, x0, x1, tol=110.0, ymax=None, sample=4):
    """マスクされた画素を、富士山の横にある背景の列 [x0, x1) の行ごとの色を元に埋める。
    （空 → 海の帯 → 霞 のような、縦に並んだ背景を延ばす）
    左右の境目の色との差が小さいときはその差を横方向に補間して足し、境目をなじませる。"""
    out = img.astype(np.float32).copy()
    h, w = mask.shape
    prof = np.median(img[:, int(x0 * w):int(x1 * w)].astype(np.float32), axis=1)
    if ymax is not None:
        # ymax より下は空ではないので、ymax の行の色を延ばす
        prof[int(ymax * h):] = prof[int(ymax * h) - 1]
    for y in range(h):
        row = mask[y] > 0
        x = 0
        while x < w:
            if not row[x]:
                x += 1
                continue
            a = x
            while x < w and row[x]:
                x += 1
            b = x
            dl = np.zeros(3, np.float32)
            dr = np.zeros(3, np.float32)
            if a > 0:
                c = np.median(img[y, max(0, a - sample):a].astype(np.float32), axis=0) - prof[y]
                if np.linalg.norm(c) < tol:
                    dl = c
            if b < w:
                c = np.median(img[y, b:min(w, b + sample)].astype(np.float32), axis=0) - prof[y]
                if np.linalg.norm(c) < tol:
                    dr = c
            t = np.linspace(0, 1, b - a + 2)[1:-1, None]
            out[y, a:b] = prof[y] + dl * (1 - t) + dr * t
    return out


def fill_strips(img, mask, x0, x1, y0, y1, strip=0.03, seed=1):
    """マスクされた範囲を、空の見本 [x0,x1)×[y0,y1) から切り出した細い横帯を
    ランダムにずらして積み重ね、継ぎ目をぼかしてつないだ模様で埋める。
    （凱風快晴のように、横にたなびく雲が画面いっぱいに広がる図用）"""
    rng = np.random.default_rng(seed)
    h, w = mask.shape
    src = img[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)].astype(np.float32)
    sh, sw = src.shape[:2]
    sth = max(8, int(strip * h))
    ov = max(3, sth // 3)          # 帯どうしの重なり（上下）
    hov = max(20, sw // 6)         # 横につなぐときの重なり
    out = img.astype(np.float32).copy()
    canvas = np.zeros((h, w, 3), np.float32)
    weight = np.zeros((h, w, 1), np.float32)

    def row_band(sy):
        """見本の sy 行目から高さ sth+ov の帯を取り、横に何枚かつないで幅 w 以上にする。"""
        band = src[sy:sy + sth + ov]
        pieces, total = [], 0
        while total < w + hov:
            off = rng.integers(0, max(1, sw // 3))
            piece = band[:, off:]
            pieces.append(piece)
            total += piece.shape[1] - hov
        row = pieces[0]
        ramp = np.linspace(0, 1, hov)[None, :, None]
        for pc in pieces[1:]:
            blend = row[:, -hov:] * (1 - ramp) + pc[:, :hov] * ramp
            row = np.concatenate([row[:, :-hov], blend, pc[:, hov:]], axis=1)
        return row[:, :w]

    y = 0
    while y < h:
        sy = int(rng.integers(0, max(1, sh - sth - ov)))
        band = row_band(sy)
        hh = min(band.shape[0], h - y)
        wv = np.ones((hh, 1, 1), np.float32)
        r = np.linspace(0, 1, ov)[:, None, None]
        if y > 0:
            wv[:min(ov, hh)] = r[:min(ov, hh)]
        if hh == band.shape[0]:
            wv[-ov:] = r[::-1]
        canvas[y:y + hh] += band[:hh] * wv
        weight[y:y + hh] += wv
        y += sth
    canvas /= np.maximum(weight, 1e-3)
    m = mask > 0
    out[m] = canvas[m]
    return out


def make(pid, lines, opt):
    src = ROOT / f"images/original/{pid}.jpg"
    img = cv2.imread(str(src))
    h, w = img.shape[:2]
    mask = region_mask(lines, w, h, opt)
    if "clip" in opt:
        # 紙の白い縁は残す
        cm = np.zeros_like(mask)
        cv2.fillPoly(cm, [np.round(np.array([[x * w, y * h] for x, y in opt["clip"]])).astype(np.int32)], 255)
        mask[cm == 0] = 0
    for poly in opt.get("protect", []):
        pm = np.zeros_like(mask)
        cv2.fillPoly(pm, [np.round(np.array([[x * w, y * h] for x, y in poly])).astype(np.int32)], 255)
        mask[pm > 0] = 0
    if opt.get("keep"):
        # 手前の木の幹は消さない（藍色 / 青緑色）
        b, g, r = [img[..., i].astype(int) for i in range(3)]
        if opt["keep"] == "blue":
            keep = (b - r > 30)
        else:
            keep = (g - r > 20) & (np.abs(g - b) < 35)
        keep = cv2.dilate(keep.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        mask[keep] = 0
    if "strips" in opt:
        filled = fill_strips(img, mask, *opt["strips"])
        smooth = filled
    elif "vref" in opt:
        filled = fill_vref(img, mask, *opt["vref"])
        smooth = cv2.GaussianBlur(filled, (1, 5), 0)
    elif "tile" in opt:
        filled = fill_tile(img, mask, *opt["tile"])
        smooth = filled
    else:
        filled = fill_rows(img, mask, side=opt.get("side"))
        # 縦方向にも少しなじませて横縞のギザギザを抑える
        smooth = cv2.GaussianBlur(filled, (1, 9), 0)
    # 和紙の質感（細かいノイズ）を戻す
    rng = np.random.default_rng(0)
    grain = rng.normal(0, 3.0, filled.shape).astype(np.float32)
    patch = np.clip(smooth + grain, 0, 255)
    # 境目をぼかして合成
    alpha = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), opt.get("feather", 1.2))[..., None]
    out = img.astype(np.float32) * (1 - alpha) + patch * alpha
    dst = ROOT / f"images/nofuji/{pid}.jpg"
    cv2.imwrite(str(dst), np.clip(out, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
    return dst


def main():
    outlines = load_outlines()
    ids = sys.argv[1:] or list(outlines)
    for pid in ids:
        make(pid, outlines[pid], OVERRIDES.get(pid, {}))
        print("ok", pid)


if __name__ == "__main__":
    main()
