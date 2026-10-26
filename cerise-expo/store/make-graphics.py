#!/usr/bin/env python3
"""
Gera os recursos graficos da Play Store a partir dos assets do app:
  store/icon-512.png                 (icone 512x512)
  store/feature-graphic-1024x500.png (recurso grafico: paleta CERISE + emblema + print do app)
  store/screenshots/phone-*.png      (copias das capturas escolhidas, 1080x2400)

Uso: python store/make-graphics.py <pasta_com_capturas_do_emulador>
"""
import os
import shutil
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, "store")
ASSETS = os.path.join(ROOT, "assets")
FONT = os.path.join(ASSETS, "fonts", "WorkSans-Variable.ttf")

INK = (26, 16, 32)
PURPLE = (103, 4, 106)
CERISE = (198, 4, 99)
CYAN = (120, 213, 239)
WHITE = (255, 255, 255)

# capturas usadas na ficha (sem resultados do mock, para nao sugerir geracao que nao ocorreu)
SHOTS = [
    ("A01-home.png", "phone-1-home.png"),
    ("A06-criar-foto.png", "phone-2-criar-foto.png"),
    ("A08-gerando.png", "phone-3-gerando.png"),
    ("A15-visualizador-catalogo.png", "phone-4-visualizador-3d.png"),
    ("A18-visualizador-capacete.png", "phone-5-visualizador-pbr.png"),
    ("A16-sobre.png", "phone-6-sobre.png"),
]


def font(size, weight="Bold"):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def gradient(w, h):
    img = Image.new("RGB", (w, h), INK)
    px = img.load()
    for x in range(w):
        for y in range(h):
            t = x / (w - 1)
            u = y / (h - 1)
            r = INK[0] + (PURPLE[0] - INK[0]) * t * 0.9
            g = INK[1] + (PURPLE[1] - INK[1]) * t * 0.9
            b = INK[2] + (PURPLE[2] - INK[2]) * t * 0.9 + 10 * u
            px[x, y] = (int(r), int(g), int(min(255, b)))
    return img


def phone(shot_path, height):
    shot = Image.open(shot_path).convert("RGB")
    w = int(height * shot.width / shot.height)
    shot = shot.resize((w, height), Image.LANCZOS)
    pad = 10
    frame = Image.new("RGBA", (w + 2 * pad, height + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle((0, 0, frame.width - 1, frame.height - 1), radius=38, fill=(12, 8, 16, 255))
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, height - 1), radius=30, fill=255)
    frame.paste(shot, (pad, pad), mask)
    return frame


def feature_graphic(shots_dir):
    W, H = 1024, 500
    img = gradient(W, H).convert("RGBA")
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((560, -140, 1180, 480), fill=CERISE + (90,))
    gd.ellipse((-200, 300, 300, 700), fill=CYAN + (35,))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(70)))

    emblem = Image.open(os.path.join(ASSETS, "emblem.png")).convert("RGBA").resize((92, 92), Image.LANCZOS)
    img.alpha_composite(emblem, (64, 70))
    d = ImageDraw.Draw(img)
    d.text((170, 76), "CERISE", font=font(64), fill=WHITE)
    tw = d.textlength("CERISE ", font=font(64))
    d.text((170 + tw, 76), "AR", font=font(64), fill=CERISE)
    d.text((66, 200), "Da foto ao modelo 3D,", font=font(34, "SemiBold"), fill=WHITE)
    d.text((66, 242), "direto na realidade aumentada", font=font(34, "SemiBold"), fill=WHITE)
    d.text((66, 306), "Crie, guarde e posicione objetos 3D", font=font(21, "Regular"), fill=(220, 205, 216))
    d.text((66, 334), "no mundo real.", font=font(21, "Regular"), fill=(220, 205, 216))
    d.rounded_rectangle((66, 380, 330, 424), radius=22, fill=CERISE)
    d.text((88, 388), "CERISE · EMC · UFG", font=font(22, "SemiBold"), fill=WHITE)

    p1 = phone(os.path.join(shots_dir, "A15-visualizador-catalogo.png"), 430)
    p2 = phone(os.path.join(shots_dir, "A01-home.png"), 380)
    img.alpha_composite(p2, (W - p2.width - 190, 80))
    img.alpha_composite(p1, (W - p1.width - 30, 45))
    out = os.path.join(STORE, "feature-graphic-1024x500.png")
    img.convert("RGB").save(out, optimize=True)
    return out


def main():
    shots_dir = sys.argv[1]
    icon = Image.open(os.path.join(ASSETS, "icon.png")).convert("RGBA").resize((512, 512), Image.LANCZOS)
    icon.save(os.path.join(STORE, "icon-512.png"), optimize=True)
    os.makedirs(os.path.join(STORE, "screenshots"), exist_ok=True)
    for src, dst in SHOTS:
        p = os.path.join(shots_dir, src)
        if os.path.exists(p):
            shutil.copy(p, os.path.join(STORE, "screenshots", dst))
    print(feature_graphic(shots_dir))


if __name__ == "__main__":
    main()
