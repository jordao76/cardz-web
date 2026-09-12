"""Convert selected Cardz store captures without cropping or retouching."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root.parent / "cardz-win/docs/screenshots/store"
captures = {
    "01-klondike-felthouse.png": "klondike",
    "11-freecell-deepfield.png": "freecell",
    "08-yukon-filigree.png": "yukon",
    "10-sandbox-monosolid.png": "sandbox-monosolid",
    "02-labellelucie-olympus.png": "la-belle-lucie",
    "03-canfield-herbarium.png": "canfield",
    "05-pyramid-scarab.png": "pyramid",
    "07-crazyquilt-valhalla.png": "crazy-quilt",
}
for filename, name in captures.items():
    with Image.open(source / filename) as capture:
        existing_name = name in {"la-belle-lucie", "canfield", "pyramid", "crazy-quilt"}
        for width in ((1600,) if existing_name else (960, 1600)):
            resized = capture.resize((width, round(capture.height * width / capture.width)), Image.Resampling.LANCZOS)
            output_name = name if existing_name else f"{name}-{width}"
            target = root / f"assets/screenshots/{output_name}.webp"
            resized.save(target, "WEBP", quality=85, method=6)
            print(f"{target.name}: {target.stat().st_size:,} bytes")
