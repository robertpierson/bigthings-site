"""Render tools/og.html to images/og.png at 1200x630."""
import struct
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "og.html"
DST = ROOT / "images" / "og.png"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
    page.goto(SRC.as_uri())
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(1500)  # webfonts + logo SMIL settle
    page.screenshot(path=DST)
    browser.close()

size = DST.stat().st_size
w, h = struct.unpack(">II", DST.read_bytes()[16:24])  # PNG IHDR width/height
assert size < 900 * 1024, f"{size} bytes is over the 900KB budget"
assert (w, h) == (1200, 630), f"got {w}x{h}, expected 1200x630"

print(f"{DST} ok ({size} bytes, {w}x{h})")
