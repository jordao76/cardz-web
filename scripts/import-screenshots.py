"""Convert Cardz captures without cropping or retouching.

A game's capture is named once, in data/roster.json, which build.mjs reads too,
so adding a screenshot to a game is one line there. Screens that are not a game
are listed here.
"""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root.parent / "cardz-win/docs/screenshots/store"
roster = json.loads((root / "data/roster.json").read_text(encoding="utf-8"))
captures = {entry["capture"]["file"]: entry["slug"] for entry in roster["entries"] if "capture" in entry}
captures["10-sandbox-monosolid.png"] = "sandbox-monosolid"
for filename, name in captures.items():
    with Image.open(source / filename) as capture:
        for width in (960, 1600):
            resized = capture.resize((width, round(capture.height * width / capture.width)), Image.Resampling.LANCZOS)
            target = root / f"assets/screenshots/{name}-{width}.webp"
            resized.save(target, "WEBP", quality=85, method=6)
            print(f"{target.name}: {target.stat().st_size:,} bytes")
