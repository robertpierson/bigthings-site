"""Build images/logo-static.svg: the brand logo with all motion stripped."""
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "animated-logo.svg"
DST = ROOT / "images" / "logo-static.svg"

src = SRC.read_text(encoding="utf-8")

# Drop whole <circle>...</circle> blocks that carry an <animateMotion>.
out = re.sub(
    r"[ \t]*<circle\b[^>]*>.*?</circle>\n?",
    lambda m: "" if "animateMotion" in m.group(0) else m.group(0),
    src,
    flags=re.DOTALL,
)
# Belt and braces: any stray motion tags left behind (e.g. self-closing circles).
out = re.sub(r"[ \t]*</?(?:animateMotion|mpath)\b[^>]*>\n?", "", out)

DST.write_text(out, encoding="utf-8")

assert "animate" not in out, "animation survived the strip"
assert re.findall(r'id="track', src) and re.findall(r'id="track', out) == re.findall(
    r'id="track', src
), "orbit track paths were lost"
ET.parse(DST)  # raises if the output is not well-formed XML

print(f"{DST} ok ({DST.stat().st_size} bytes, {src.count('animateMotion')} motions removed)")
