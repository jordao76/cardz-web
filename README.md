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
# from cardz-win
.\scripts\run.ps1 -ExportDecks dist\deck-export
node .\scripts\build-deck-gallery.mjs --rendered dist\deck-export
```

`-ExportDecks` builds and launches the app, which draws the cards, writes them
and exits without opening a window. The script waits for that and lists what was
written.

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

`assets/screenshots/*.webp`, the home page's gallery, are eight of the Store
captures in cardz-win's `docs/screenshots/store/`, converted without cropping.
This one runs from this repo and needs Pillow:

```powershell
python scripts\import-screenshots.py
```

It names its eight sources by filename, so a renamed Store capture fails the
import rather than being picked up.

## Make a game is half generated

`make-a-game.html` is hand-written around three marked regions that `build.mjs`
fills: the starter-game links, the reference's table of contents, and the
reference itself, rendered from `data/rule-vocabulary.md`. That file is the app
repo's `docs/rule-vocabulary.md` byte for byte — the same document Cardz serves to
AI agents — so the page cannot describe a design format the app does not read.
The build fails if the kit is missing.

The kit comes from the app repo, on its own cadence like `games.json`:

```powershell
..\cardz-win\scripts\export-design-kit.ps1
```

It writes `data/rule-vocabulary.md`, `data/design-kit.json` (the starter list),
`designs/schema.json` (a JSON Schema generated from the design types, which a
design file can name in `"$schema"`), and `designs/*.cardz` — starter games cut
from built-ins, each checked to import before it is written.

See `docs/website-plan.md` in the app repo for why it is built this way and
what comes next (headless board renders, localized pages). Its "Refreshing the
site" section lists every export in one table: what each writes, what it needs,
and when to run it.

## Deploy

The site can be deployed as-is to Netlify, Cloudflare Pages, or any static host.
For GitHub Pages, publish the `main` branch from the repository root. The
`.nojekyll` marker keeps the site on the direct static-file path.
