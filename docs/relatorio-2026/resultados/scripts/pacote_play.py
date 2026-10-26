"""Figura do pacote grafico da Play Store: recurso grafico, icone e as capturas de telefone de store/screenshots.

uso: python pacote_play.py <cerise-expo/store> <saida.png>
"""
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

store, out = sys.argv[1], sys.argv[2]


def font(size):
    for n in ('segoeuib.ttf', 'arialbd.ttf'):
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            pass
    return ImageFont.load_default()


feat = Image.open(os.path.join(store, 'feature-graphic-1024x500.png')).convert('RGB')
icon = Image.open(os.path.join(store, 'icon-512.png')).convert('RGBA')
shots = sorted(glob.glob(os.path.join(store, 'screenshots', 'phone-*.png')))
sw = 180
ims = []
for p in shots:
    im = Image.open(p).convert('RGB')
    ims.append(im.resize((sw, int(im.height * sw / im.width)), Image.LANCZOS))
gap, m = 14, 24
sh = max(i.height for i in ims)
icon_w = 260
W = max(m * 2 + icon_w + gap * 2 + len(ims) * (sw + gap), m * 2 + 1024)
H = m + 26 + 500 + 30 + sh + 60
c = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(c)
f = font(20)
fx = (W - 1024) // 2
d.text((fx, m - 4), 'Recurso gráfico 1024×500', fill=(40, 40, 40), font=f)
c.paste(feat, (fx, m + 22))
y0 = m + 22 + 500 + 30
ic = icon.resize((icon_w, icon_w), Image.LANCZOS)
bg = Image.new('RGBA', ic.size, (255, 255, 255, 255))
bg.alpha_composite(ic)
c.paste(bg.convert('RGB'), (m, y0 + 40))
d.text((m, y0 + 40 + icon_w + 12), 'Ícone 512×512', fill=(40, 40, 40), font=f)
x = m + icon_w + gap * 2
for i, im in enumerate(ims):
    c.paste(im, (x, y0))
    d.rectangle([x - 1, y0 - 1, x + sw, y0 + im.height], outline=(170, 170, 170))
    d.text((x + 4, y0 + im.height + 6), os.path.basename(shots[i]).split('-')[1], fill=(90, 90, 90), font=font(15))
    x += sw + gap
d.text((m + icon_w + gap * 2, y0 + sh + 30),
       f'Capturas de telefone ({len(ims)}) — emulador Android 16, 1080×2400; 2, 3 e 7 com o servidor 3D real',
       fill=(40, 40, 40), font=f)
c.save(out, dpi=(150, 150))
print(out, c.size, len(ims), 'capturas')
