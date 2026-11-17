"""ストア用の画像を作る（docs/store/）。
  - スクリーンショット 1920×1080（上に見出し、下にゲーム画面）… docs/store/raw/ の画面写真から
  - フィーチャーグラフィック 1024×500
  - アイコン 512×512
画面写真は Playwright で撮影したもの（docs/store/raw/<lang>-<n>-<name>.png）
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ST = ROOT / "docs/store"
RAW = ST / "raw"
FONT_JA = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"
FONT_EN = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
NAVY, NAVY2, GOLD, INK = (11, 16, 38), (30, 44, 96), (242, 193, 78), (244, 236, 216)

CAPTIONS = {
    "ja": [
        ("北斎の名画から", "富士山が消えた！"),
        ("富士山の輪郭を", "指でなぞろう"),
        ("答えは星座のように", "浮かび上がる"),
        ("神奈川沖浪裏も", "全46図に挑戦"),
        ("称号は", "「画狂老人（北斎級）」"),
    ],
    "en": [
        ("Mt. Fuji has vanished", "from Hokusai's prints!"),
        ("Trace Fuji's outline", "with your finger"),
        ("The answer appears", "like a constellation"),
        ("The Great Wave and more", "— all 46 prints"),
        ("Earn the rank", "\"Old Man Mad About Painting\""),
    ],
}


def gradient(w, h, top=NAVY, bottom=NAVY2):
    im = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3)))
    return im


def text_center(d, cx, y, text, font, fill):
    w = d.textlength(text, font=font)
    d.text((cx - w / 2, y), text, font=font, fill=fill)


def screenshot(lang, idx, raw):
    W, H = 1920, 1080
    im = gradient(W, H)
    d = ImageDraw.Draw(im)
    f = FONT_JA if lang == "ja" else FONT_EN
    a, b = CAPTIONS[lang][idx]
    size = 64 if lang == "ja" else 58
    font = ImageFont.truetype(f, size)
    # 見出し: 1 行目は白、2 行目は金色。横に並べて 1 行にする
    full_w = d.textlength(a + "  ", font=font) + d.textlength(b, font=font)
    x = (W - full_w) / 2
    y = 42
    d.text((x, y), a + "  ", font=font, fill=INK)
    d.text((x + d.textlength(a + "  ", font=font), y), b, font=font, fill=GOLD)
    # ゲーム画面（角丸＋影）
    shot = Image.open(raw).convert("RGB")
    sh = 900
    sw = int(shot.width * sh / shot.height)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    sx, sy = (W - sw) // 2, H - sh - 30
    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle([sx, sy + 10, sx + sw, sy + sh + 10], 28, fill=150)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    im.paste((0, 0, 0), (0, 0), shadow)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], 28, fill=255)
    im.paste(shot, (sx, sy), mask)
    ImageDraw.Draw(im).rounded_rectangle([sx, sy, sx + sw - 1, sy + sh - 1], 28, outline=(255, 255, 255, 60), width=2)
    return im


def feature_graphic(lang="ja"):
    """1024×500。左に富士山を消した神奈川沖浪裏と星座の輪郭、右にタイトル"""
    W, H = 1024, 500
    im = gradient(W, H)
    # 右側に赤富士（凱風快晴）をうっすら、左に神奈川沖浪裏
    art = Image.open(ROOT / "images/original/kanagawa.jpg").convert("RGB")
    ah = H
    aw = int(art.width * ah / art.height)
    art = art.resize((aw, ah), Image.LANCZOS)
    # 富士山の部分を消した絵と、星座の輪郭
    nof = Image.open(ROOT / "images/nofuji/kanagawa.jpg").convert("RGB").resize((aw, ah), Image.LANCZOS)
    left = 520
    crop = nof.crop((aw - left - 40, 0, aw - 40, ah))
    fade = Image.new("L", (left, H), 255)
    fd = ImageDraw.Draw(fade)
    for x in range(left - 160, left):
        fd.line([(x, 0), (x, H)], fill=int(255 * (left - x) / 160))
    im.paste(crop, (0, 0), fade)
    # 輪郭線（星座）
    import json, re
    src = (ROOT / "js/outlines.js").read_text(encoding="utf-8")
    body = src[src.index("{", src.index("FUJI_OUTLINES")): src.rindex("}") + 1]
    O = json.loads(re.sub(r",\s*}", "}", body))
    d = ImageDraw.Draw(im)
    for line in O["kanagawa"]:
        pts = [(x * aw - (aw - left - 40), y * ah) for x, y in line]
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(glow).line(pts, fill=(160, 210, 255, 255), width=10, joint="curve")
        glow = glow.filter(ImageFilter.GaussianBlur(6))
        im.paste(glow, (0, 0), glow)
        d.line(pts, fill=(255, 255, 255), width=3, joint="curve")
        for x, y in pts[::2] + [pts[-1]]:
            d.polygon([(x, y - 7), (x + 2, y - 2), (x + 7, y), (x + 2, y + 2), (x, y + 7), (x - 2, y + 2), (x - 7, y), (x - 2, y - 2)], fill=(255, 255, 255))
    # タイトル
    cx = 770
    if lang == "ja":
        text_center(d, cx, 120, "葛飾北斎", ImageFont.truetype(FONT_JA, 30), (184, 178, 162))
        text_center(d, cx, 170, "富嶽三十六景", ImageFont.truetype(FONT_JA, 64), INK)
        text_center(d, cx, 260, "富士山どこだっけ？", ImageFont.truetype(FONT_JA, 40), GOLD)
        text_center(d, cx, 340, "消えた富士山の輪郭をなぞろう", ImageFont.truetype(FONT_JA, 26), INK)
    else:
        text_center(d, cx, 120, "Katsushika Hokusai", ImageFont.truetype(FONT_EN, 28), (184, 178, 162))
        text_center(d, cx, 175, "Where's Mt. Fuji?", ImageFont.truetype(FONT_EN, 56), GOLD)
        text_center(d, cx, 255, "Thirty-six Views of Mount Fuji", ImageFont.truetype(FONT_EN, 30), INK)
        text_center(d, cx, 340, "Trace the outline of the vanished Fuji", ImageFont.truetype(FONT_EN, 24), INK)
    return im


def main():
    for lang in ("ja", "en"):
        raws = sorted(RAW.glob(f"{lang}-*.png"))
        for i, raw in enumerate(raws):
            out = ST / raw.name
            screenshot(lang, i, raw).save(out)
            print("ok", out.name)
    feature_graphic("ja").save(ST / "feature-graphic.png")
    feature_graphic("en").save(ST / "feature-graphic-en.png")
    Image.open(ROOT / "assets/icon-only.png").convert("RGB").resize((512, 512), Image.LANCZOS).save(ST / "icon-512.png")
    print("ok feature-graphic.png icon-512.png")


if __name__ == "__main__":
    main()
