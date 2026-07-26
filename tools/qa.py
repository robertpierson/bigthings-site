"""QA sweep for bigthings-site against the running server on :8010.
Writes only tools/shots/*.png. Run: python tools/qa.py"""
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8010"
SHOTS = Path(__file__).resolve().parent / "shots"
VIEWPORTS = [(1440, 900), (1024, 768), (768, 1024), (390, 844)]
COPY = [".hero-lede", ".card p", ".faq details p", ".legal", ".slot p"]
BG = (6, 10, 16)  # #060a10
fails = []


def check(ok, msg):
    print(("PASS  " if ok else "FAIL  ") + msg)
    if not ok:
        fails.append(msg)


def lum(c):
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0] / 255) + 0.7152 * f(c[1] / 255) + 0.0722 * f(c[2] / 255)


def contrast(fg):
    hi, lo = sorted((lum(fg), lum(BG)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def over_bg(css):  # rgb()/rgba() string -> tuple composited onto BG
    n = [float(x) for x in re.findall(r"[\d.]+", css)]
    a = n[3] if len(n) > 3 else 1.0
    return tuple(round(v * a + b * (1 - a)) for v, b in zip(n[:3], BG))


def watch(page, errs):
    page.on("console", lambda m: errs.append(f"console.error: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))


def check_errs(errs, label):
    check(not errs, f"{label}: no console/page errors" + ("" if not errs else " -> " + " | ".join(errs)))


def check_overflow(page, label):
    sw, iw = page.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    check(sw <= iw + 1, f"{label}: no horizontal overflow (scrollWidth={sw}, innerWidth={iw})")


def settle(page, vh, scroll=True):
    page.evaluate("document.fonts.ready.then(() => true)")
    page.wait_for_timeout(700)
    if not scroll:
        return
    total = page.evaluate("document.documentElement.scrollHeight")
    for y in range(0, total, max(200, vh // 2)):
        page.evaluate(f"scrollTo({{top: {y}, behavior: 'instant'}})")
        page.wait_for_timeout(120)
    page.evaluate("scrollTo({top: document.body.scrollHeight, behavior: 'instant'})")
    page.wait_for_timeout(500)
    page.evaluate("scrollTo({top: 0, behavior: 'instant'})")
    page.wait_for_timeout(800)


def open_page(browser, w, h, url, **kw):
    ctx = browser.new_context(viewport={"width": w, "height": h}, **kw)
    page = ctx.new_page()
    errs = []
    watch(page, errs)
    page.goto(url, wait_until="load")
    return ctx, page, errs


def run(b):
    for w, h in VIEWPORTS:
        ctx, page, errs = open_page(b, w, h, BASE)
        settle(page, h)
        page.screenshot(path=SHOTS / f"home-{w}.png", full_page=True)
        page.screenshot(path=SHOTS / f"hero-{w}.png")
        check_overflow(page, f"home@{w}")
        check_errs(errs, f"home@{w}")
        n = page.evaluate("document.querySelectorAll('.reveal:not(.in)').length")
        check(n == 0, f"home@{w}: every .reveal got .in (still hidden={n})")
        cw = page.evaluate("document.getElementById('constellation').width")
        check(cw > 0, f"home@{w}: #constellation sized itself (canvas.width={cw})")
        if w == 1440:
            for sel in COPY:
                col = page.evaluate("s => getComputedStyle(document.querySelector(s)).color", sel)
                r = contrast(over_bg(col))
                check(r >= 4.5, f"contrast {sel}: {r:.2f}:1  [{col} on #060a10]")
        ctx.close()

    ctx, page, errs = open_page(b, 1440, 900, BASE, reduced_motion="reduce")
    settle(page, 900, scroll=False)
    n = page.evaluate("document.querySelectorAll('.reveal:not(.in)').length")
    check(n == 0, f"reduced-motion: reveals shown without scrolling (still hidden={n})")
    d = page.evaluate("getComputedStyle(document.getElementById('constellation')).display")
    check(d == "none", f"reduced-motion: constellation display={d}")
    page.screenshot(path=SHOTS / "reduced-motion.png", full_page=True)
    check_errs(errs, "reduced-motion")
    ctx.close()

    ctx, page, errs = open_page(b, 1440, 900, f"{BASE}/404.html")
    settle(page, 900, scroll=False)
    page.screenshot(path=SHOTS / "404.png", full_page=True)
    check_overflow(page, "404")
    check_errs(errs, "404")
    ctx.close()


if __name__ == "__main__":
    SHOTS.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run(browser)
        browser.close()
    print(f"\n{'FAILED: ' + str(len(fails)) if fails else 'ALL CHECKS PASSED'}")
    for f in fails:
        print("  - " + f)
    sys.exit(1 if fails else 0)
