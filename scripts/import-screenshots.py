"""Convert Cardz captures without cropping or retouching.

A game's capture is named once, in data/roster.json, which build.mjs reads too,
so adding a screenshot to a game is one line there. Screens that are not a game
are listed here.

Cardz Lite's page shows Lite's own captures, which carry its LITE badge and only
its games and decks. They are a set of their own, converted with `lite`:

    python scripts/import-screenshots.py lite
"""
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
store = root.parent / "cardz-win/docs/screenshots/store"
lite = root.parent / "cardz-win/docs/lite/screenshots"

if sys.argv[1:] == ["lite"]:
    captures = {
        lite / "01-klondike-felthouse.png": "lite-klondike",
        lite / "02-freecell-monosolid.png": "lite-freecell",
        lite / "03-spider-neon.png": "lite-spider",
        lite / "04-tripeaks-felthouse.png": "lite-tri-peaks",
        lite / "05-pyramid-scarab.png": "lite-pyramid",
        lite / "06-yukon-colourblind.png": "lite-yukon",
        lite / "07-golf-scarab.png": "lite-golf",
        lite / "08-klondike-highcontrast.png": "lite-klondike-high-contrast",
    }
else:
    roster = json.loads((root / "data/roster.json").read_text(encoding="utf-8"))
    captures = {store / entry["capture"]["file"]: entry["slug"] for entry in roster["entries"] if "capture" in entry}
    captures[store / "10-sandbox-monosolid.png"] = "sandbox-monosolid"

for path, name in captures.items():
    with Image.open(path) as capture:
        for width in (960, 1600):
            resized = capture.resize((width, round(capture.height * width / capture.width)), Image.Resampling.LANCZOS)
            target = root / f"assets/screenshots/{name}-{width}.webp"
            resized.save(target, "WEBP", quality=85, method=6)
            print(f"{target.name}: {target.stat().st_size:,} bytes")
