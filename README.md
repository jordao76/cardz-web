# Cardz web

Landing page and privacy policy for Cardz for Windows.

## Run locally

This is a dependency-free static site. From the repository root:

```powershell
python -m http.server 4173
```

Then open <http://localhost:4173>.

If the page stops reflecting what is on disk, that server is why: it sends
`Last-Modified` and no `Cache-Control`, so the browser caches on a heuristic of
roughly a tenth of the file's age — a file untouched for a fortnight is held for
over a day. `devserve.py` is the same server with caching off, and takes the same
port:

```powershell
python devserve.py 4173
```

## The game pages are generated

`games/<slug>/index.html` and the index roster are built from
`data/games.json` — a projection of the app's own preset catalog, so the site
cannot disagree with Cardz about which games exist or what their rules say.
Everything else on the site is hand-written and stays that way.

Each page's board diagram (`diagram.mjs`) is drawn to scale from the same file's
depot coordinates — no screenshot, so it cannot fall out of date with the game.

```powershell
node build.mjs      # no dependencies; rewrites games/ and one marked region of index.html
```

`data/games.json` comes from the app repo and is refreshed there, whenever you
like — it is deliberately not tied to a Store release:

```powershell
..\cardz-win\scripts\export-games.ps1
```

`data/roster.json` is the editorial half: display order, the website-voice
taglines, and which games wear a *New* badge. The build **fails** if
`games.json` contains a game `roster.json` never mentions, so a new release
cannot quietly go missing from the site.

`decks.html` is generated the same way, from `data/decks.json` (editorial) plus
`assets/decks/*.webp` — three-card fans composited by cardz-win's
`scripts/build-deck-gallery.mjs`. Run that when a deck's art changes.

Its card art comes from two places. Most decks ship their cards as PNGs, so the
fan is cut straight from those. The rest — the procedural decks, which have no
art on disk, and the hybrids, whose art carries no rank index because the app
draws that on top — are rendered by the app itself first:

```powershell
winapp run <build output> --detach --args "--export-decks=<dir>"
node ..\cardz-win\scripts\build-deck-gallery.mjs --rendered <dir>
```

The same script also cuts the single cards in `assets/cards/`, which decorate the
home page's hero and sandbox sections. Those used to be CSS rectangles with a
glyph in them.

`assets/ornament/*-court-band.webp` — the ornamental rules that divide the home
page's sections — are cut the same way, from the band a two-headed court draws
across its own mirror line:

```powershell
node ..\cardz-win\scripts\build-ornament-band.mjs
```

Each is a run of that band beside its own mirror image, so the tile's two edges
are identical and `repeat-x` shows no seam. Only Felt House and Valhalla qualify;
the script's header says why the other decks do not.

See `docs/website-plan.md` in the app repo for why it is built this way and
what comes next (board diagrams, a decks gallery, localized pages).

## Deploy

The site can be deployed as-is to Netlify, Cloudflare Pages, or any static host.
For GitHub Pages, publish the `main` branch from the repository root. The
`.nojekyll` marker keeps the site on the direct static-file path.
