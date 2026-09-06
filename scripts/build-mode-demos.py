"""Encode the user's cropped Fish and Order recordings. Requires imageio-ffmpeg."""
from pathlib import Path
import argparse
import subprocess
import imageio_ffmpeg

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("recordings", type=Path, help="Folder containing fish.mp4 and order.mp4")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = root / "assets/demos"
output.mkdir(parents=True, exist_ok=True)
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
for name in ("fish", "order"):
    source = args.recordings / f"{name}.mp4"
    target = output / f"{name}.mp4"
    if source.resolve() == target.resolve():
        raise ValueError("Source recordings must be outside the output folder")
    # Preserve the full crop and gesture timing; hold the result for one extra second.
    subprocess.run([
        ffmpeg, "-y", "-v", "error", "-i", str(source), "-an",
        "-vf", "tpad=stop_mode=clone:stop_duration=1",
        "-c:v", "libx264", "-crf", "23", "-preset", "slow",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(target),
    ], check=True)
    subprocess.run([
        ffmpeg, "-y", "-v", "error", "-i", str(target),
        "-frames:v", "1", "-quality", "85", str(output / f"{name}-poster.webp"),
    ], check=True)
    print(f"{name}: {target.stat().st_size:,} bytes")
