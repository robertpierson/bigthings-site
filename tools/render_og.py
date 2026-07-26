"""Render tools/og.html to images/og.jpg at 1200x630.

JPEG, not PNG: the card is three overlapping gradients, which cost ~500KB as
lossless PNG and ~90KB at quality 88 with no visible difference at preview size.
"""
import struct
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "og.html"
DST = ROOT / "images" / "og.jpg"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
    page.goto(SRC.as_uri())
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(1500)  # webfonts + logo SMIL settle
    page.screenshot(path=DST, type="jpeg", quality=88)
    browser.close()

raw = DST.read_bytes()
size = len(raw)
assert raw[:3] == b"\xff\xd8\xff", "not a JPEG"
assert size < 300 * 1024, f"{size} bytes is over the 300KB budget"

# walk the JPEG segments to the SOF marker, which carries the real dimensions
i = 2
while raw[i] == 0xFF and raw[i + 1] not in range(0xC0, 0xC4):
    i += 2 + struct.unpack(">H", raw[i + 2:i + 4])[0]
h, w = struct.unpack(">HH", raw[i + 5:i + 9])
assert (w, h) == (1200, 630), f"got {w}x{h}, expected 1200x630"

print(f"{DST} ok ({size} bytes, {w}x{h})")
