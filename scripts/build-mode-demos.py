"""Encode the Sandbox page's mode recordings. Requires imageio-ffmpeg.

Each clip keeps its native crop and gesture timing, loses its audio track, and
holds its last frame for one extra second before the loop restarts. Crops vary
by a few pixels between recordings; they are not trimmed to a common size,
because the smallest would cut the top off a card in another clip. Each <video>
carries its own width and height instead, which this prints.

The poster comes from that held end state, so a reduced-motion visitor sees
what the gesture did rather than the untouched starting table.
"""
from pathlib import Path
import argparse
import re
import subprocess
import imageio_ffmpeg

# The clips sandbox.html plays, each with an optional end cut in seconds.
# grab.mp4 runs on after its cards land until the toolbar fades at 6.4 s, so it
# stops just before that. DESIGN-REVIEW.md §2 has every take as recorded.
CLIPS = {
    "fish": None,
    "order": None,
    "spread": None,
    "corral": None,
    "trawl": None,
    "grab": 6.3,
    "depot": None,
}

parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
parser.add_argument("recordings", type=Path, help="Folder containing " + ", ".join(f"{name}.mp4" for name in CLIPS))
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = root / "assets/demos"
output.mkdir(parents=True, exist_ok=True)
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

missing = [name for name in CLIPS if not (args.recordings / f"{name}.mp4").is_file()]
if missing:
    raise SystemExit(f"Missing from {args.recordings}: " + ", ".join(f"{name}.mp4" for name in missing))

for name, cut in CLIPS.items():
    source = args.recordings / f"{name}.mp4"
    target = output / f"{name}.mp4"
    if source.resolve() == target.resolve():
        raise ValueError("Source recordings must be outside the output folder")
    trim = ["-t", str(cut)] if cut else []
    subprocess.run([
        ffmpeg, "-y", "-v", "error", *trim, "-i", str(source), "-an",
        "-vf", "tpad=stop_mode=clone:stop_duration=1",
        "-c:v", "libx264", "-crf", "23", "-preset", "slow",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(target),
    ], check=True)
    # Half a second before the end lands inside the one-second hold.
    subprocess.run([
        ffmpeg, "-y", "-v", "error", "-sseof", "-0.5", "-i", str(target),
        "-frames:v", "1", "-quality", "85", str(output / f"{name}-poster.webp"),
    ], check=True)
    probe = subprocess.run([ffmpeg, "-hide_banner", "-i", str(target)], capture_output=True, text=True)
    size = re.search(r"Video:.*?(\d{3,5})x(\d{3,5})", probe.stderr)
    dims = f'width="{size[1]}" height="{size[2]}"' if size else "size unknown"
    print(f"{name}: {dims}, {target.stat().st_size:,} bytes")
