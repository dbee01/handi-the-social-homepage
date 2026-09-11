#!/usr/bin/env python3
"""
make_cork_icons.py — build the Cork PWA icon set from the two source images.

Sources (images/icons/cork/source/):
  cork-white-pwa.png  red mark on a white background -> background removed,
                      used for the standard "any" icons (transparent PNGs).
  cork-red-pwa.png    white mark on a red background -> red stays full-bleed,
                      used for the "maskable" icons with the mark scaled into
                      the maskable safe zone.

Usage:  python3 scripts/make_cork_icons.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "images", "icons", "cork", "source")
OUT = os.path.join(ROOT, "images", "icons", "cork")
SIZES = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512]


def median_border(img, band=6):
    w, h = img.size
    px = img.load()
    samples = []
    for x in range(0, w, 4):
        for y in list(range(0, band)) + list(range(h - band, h)):
            samples.append(px[x, y])
    samples.sort(key=lambda c: c[0] + c[1] + c[2])
    return samples[len(samples) // 2]


def extract_mark(img, bg, gain=0.9, cut=12):
    """Return an RGBA copy where pixels close to `bg` are transparent and the
    mark keeps its own colour (used for the white-background source)."""
    w, h = img.size
    src = img.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            dist = ((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2) ** 0.5
            a = int(min(255, dist * gain))
            if a < cut:
                a = 0
            dst[x, y] = (r, g, b, a)
    return out


def fit(mark, size, fill):
    """Fit `mark`'s alpha bounding box into a `size` square with `fill` fraction
    of the side (centred), on a transparent canvas."""
    bbox = mark.getbbox()
    if bbox:
        mark = mark.crop(bbox)
    target = max(1, int(size * fill))
    scale = min(target / mark.width, target / mark.height)
    new = (max(1, round(mark.width * scale)), max(1, round(mark.height * scale)))
    mark = mark.resize(new, Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(mark, ((size - new[0]) // 2, (size - new[1]) // 2))
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)

    white = Image.open(os.path.join(SRC, "cork-white-pwa.png")).convert("RGB")
    red = Image.open(os.path.join(SRC, "cork-red-pwa.png")).convert("RGB")

    # --- standard icons: red mark, transparent background ------------------
    white_bg = median_border(white)
    mark = extract_mark(white, white_bg)
    mark.save(os.path.join(OUT, "cork-mark.png"))
    for s in SIZES:
        fit(mark, s, 0.82).save(os.path.join(OUT, f"cork-{s}x{s}.png"))

    # --- maskable icons: the red artwork full-bleed, scaled into the safe
    #     zone so a maskable crop never clips the mark ----------------------
    red_bg = median_border(red)
    for s in SIZES:
        canvas = Image.new("RGBA", (s, s), red_bg + (255,))
        inner = red.resize(
            (max(1, int(s * 0.6)), max(1, int(s * 0.6))), Image.LANCZOS
        )
        canvas.paste(inner, ((s - inner.width) // 2, (s - inner.height) // 2))
        canvas.save(os.path.join(OUT, f"cork-maskable-{s}x{s}.png"))

    print("wrote", len(SIZES) * 2, "icons + cork-mark.png to", OUT)


if __name__ == "__main__":
    main()
