# Cardz web

Landing page and privacy policy for Cardz for Windows.

## Run locally

This is a dependency-free static site. From the repository root:

```powershell
python -m http.server 4173
```

Then open <http://localhost:4173>.

## The game pages are generated

`games/<slug>/index.html`, the index roster, and the ticker are built from
`data/games.json` — a projection of the app's own preset catalog, so the site
cannot disagree with Cardz about which games exist or what their rules say.
Everything else on the site is hand-written and stays that way.

```powershell
node build.mjs      # no dependencies; rewrites games/ and two marked regions of index.html
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

See `docs/website-plan.md` in the app repo for why it is built this way and
what comes next (board diagrams, a decks gallery, localized pages).

## Deploy

The site can be deployed as-is to Netlify, Cloudflare Pages, or any static host.
For GitHub Pages, publish the `main` branch from the repository root. The
`.nojekyll` marker keeps the site on the direct static-file path.
