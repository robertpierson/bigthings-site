"""Rasterise images/favicon.svg to the PNG sizes that still matter.

iOS ignores SVG for apple-touch-icon, and older Android/Windows tiles want a
raster too. Everything else gets the SVG from index.html.
"""
import struct
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "favicon.svg"
SIZES = {"apple-touch-icon.png": 180, "icon-192.png": 192, "icon-512.png": 512}

PAGE = """<!DOCTYPE html><style>
html,body{{margin:0;width:{s}px;height:{s}px}}
body{{background:#060a10;display:grid;place-items:center}}
img{{width:{p}px;height:{p}px}}
</style><img src="{src}">"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, s in SIZES.items():
        page = browser.new_page(viewport={"width": s, "height": s}, device_scale_factor=1)
        page.set_content(PAGE.format(s=s, p=round(s * 0.72), src=SRC.as_uri()))
        page.wait_for_timeout(250)
        page.screenshot(path=ROOT / "images" / name)
        page.close()
    browser.close()

for name, s in SIZES.items():
    raw = (ROOT / "images" / name).read_bytes()
    w, h = struct.unpack(">II", raw[16:24])  # PNG IHDR
    assert (w, h) == (s, s), f"{name}: got {w}x{h}, expected {s}x{s}"
    print(f"images/{name} ok ({len(raw)} bytes, {w}x{h})")
