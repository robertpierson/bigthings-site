# Big Things — bigthingssoftware.org

Rebuild of the [bigthingssoftware.org](https://www.bigthingssoftware.org/) coming-soon page as a
complete static site: hero, what we do, how it works, projects, FAQ, CTA, footer.

Big Things is a nonprofit that provides exposure and support for community-centric software and
app development.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole page — every section, plus meta/OG tags and NGO JSON-LD |
| `styles.css` | All styling: palette, type scale, layout, ambient background, animation |
| `app.js` | Constellation canvas, scroll reveals, nav state |
| `404.html` | Not-found page, self-contained apart from `styles.css` |
| `robots.txt` | Allows everything, points at the sitemap |
| `sitemap.xml` | Single URL entry for the homepage |
| `images/` | `animated-logo.svg`, `logo-static.svg` (reduced-motion fallback), `favicon.svg`, `og.png` |
| `tools/` | Build and check scripts: `make_static_logo.py`, `og.html` + `render_og.py`, `qa.py` |

`images/og.jpg` (1200x630 social card) is generated — rebuild it with
`python tools/render_og.py` after editing `tools/og.html`.

Run the checks against a local server:

```
python tools/qa.py
```

Screenshots at 1440 / 1024 / 768 / 390, horizontal-overflow and console-error assertions,
reduced-motion behaviour, and WCAG contrast ratios for every body-copy color.

## Preview locally

```
python -m http.server 8000
```

Then open http://localhost:8000/ . (Use a server, not `file://` — relative paths and the fonts
behave differently otherwise.)

## Deploy

Pure static, no build step. Copy the directory to any host — Netlify, Cloudflare Pages, GitHub
Pages, S3, plain nginx. `404.html` is picked up automatically by most of them; on nginx point
`error_page 404` at it.

## Verify before launch

Copy written from the mission statement, not from confirmed fact. Someone at the org needs to
confirm each is true, or change it:

- **FAQ, "What does it cost?"** — answer says support costs nothing because Big Things is a
  nonprofit. Confirm there's no fee at any stage.
- **Exposure claims** — the page says projects get featured across YouTube, Instagram, and TikTok.
  Confirm all three channels are actually active and will carry features.
- **Footer "501(c)(3)"** — pre-existing line. Confirm the status is granted, not pending; the
  designation is legally meaningful.
- **Projects section** — `Slot 01/02/03 — Open` are placeholders. Replace with real projects at
  launch, or keep the empty-on-purpose framing deliberately.
