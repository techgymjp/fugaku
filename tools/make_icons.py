"""アプリのアイコンと起動画面の元画像（assets/）を作る。
夜空の背景に、星を線で結んだ星座のような富士山の稜線を描く。
  python3 tools/make_icons.py
  npx @capacitor/assets generate --android   # assets/ から Android 用の各サイズを生成
"""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)
S = 1024


def background(size):
    """藍色の夜空のグラデーションと小さな星"""
    im = Image.new("RGB", (size, size))
    top, bottom = (11, 16, 38), (36, 52, 110)
    px = im.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    d = ImageDraw.Draw(im)
    import random
    rnd = random.Random(3)
    for _ in range(int(90 * (size / S) ** 2)):
        x, y = rnd.random() * size, rnd.random() * size * 0.75
        r = rnd.choice([1, 1, 1.5, 2]) * size / S
        a = rnd.randint(90, 200)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(a, a, min(255, a + 30)))
    return im


def fuji_points(size, scale=1.0, cy=0.60):
    """稜線の点（左裾 → 山頂の平ら → 右裾）"""
    pts = [(-0.40, 0.20), (-0.27, 0.10), (-0.15, -0.02), (-0.07, -0.14), (-0.03, -0.20),
           (0.03, -0.20), (0.07, -0.14), (0.15, -0.02), (0.27, 0.10), (0.40, 0.20)]
    return [(size / 2 + x * size * scale, size * cy + y * size * scale) for x, y in pts]


def star(d, x, y, r, fill):
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.33
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    d.polygon(pts, fill=fill)


def constellation(size, scale=1.0, cy=0.60):
    """透明な画像に、光る星座の富士山を描く"""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pts = fuji_points(size, scale, cy)
    k = size / S * scale
    # 山の面をうっすら（雪の白）
    face = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fd = ImageDraw.Draw(face)
    fd.polygon(pts + [(pts[-1][0], pts[-1][1] + 6 * k), (pts[0][0], pts[0][1] + 6 * k)], fill=(120, 150, 220, 70))
    layer = Image.alpha_composite(layer, face)
    # 光のにじみ
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.line(pts, fill=(160, 210, 255, 255), width=int(26 * k), joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(18 * k))
    layer = Image.alpha_composite(layer, glow)
    d = ImageDraw.Draw(layer)
    d.line(pts, fill=(255, 255, 255, 255), width=max(2, int(12 * k)), joint="curve")
    for i, (x, y) in enumerate(pts):
        big = i in (0, 4, 5, 9)
        star(d, x, y, (40 if big else 28) * k, (255, 255, 255, 255))
    # なぞる指先の金色の光（左裾の手前）
    gx, gy = pts[2]
    g2 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(g2).ellipse([gx - 34 * k, gy - 34 * k, gx + 34 * k, gy + 34 * k], fill=(242, 193, 78, 230))
    g2 = g2.filter(ImageFilter.GaussianBlur(10 * k))
    layer = Image.alpha_composite(layer, g2)
    star(ImageDraw.Draw(layer), gx, gy, 30 * k, (255, 236, 170, 255))
    return layer


# 1. 背景だけ / 前景だけ（Android のアダプティブアイコン用。前景は中央 66% に収める）
bg = background(S)
bg.save(OUT / "icon-background.png")
fg = constellation(S, scale=0.74, cy=0.55)
fg.save(OUT / "icon-foreground.png")
# 2. 1 枚もの（透過なし）
only = Image.alpha_composite(bg.convert("RGBA"), constellation(S, scale=0.95, cy=0.62))
only.convert("RGB").save(OUT / "icon-only.png")
# 3. 起動画面（2732 四方。中央に小さめのアイコン）
SP = 2732
for name in ("splash.png", "splash-dark.png"):
    sp = Image.new("RGBA", (SP, SP), (11, 16, 38, 255))
    mark = constellation(1100, scale=0.95, cy=0.55)
    sp.alpha_composite(mark, ((SP - 1100) // 2, (SP - 1100) // 2))
    sp.convert("RGB").save(OUT / name)
print("ok")
