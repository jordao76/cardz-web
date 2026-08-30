"""Static dev server that refuses to be cached.

    python devserve.py [port] [directory]

Defaults to port 4173 and this file's own directory, so it serves the site
whatever directory you run it from.

WHY THIS EXISTS
    `python -m http.server` sends Last-Modified and nothing else — no
    Cache-Control, no ETag. With no explicit freshness a browser falls back to
    heuristic caching, roughly a tenth of the file's age, so a file untouched for
    two weeks is cached for over a day and edits stop appearing. That is correct
    behaviour for a real static host and useless while editing, and it bites
    hardest on the files you touch least.

    This sends no-store and drops the validators, so there is nothing for a
    conditional request to match and no 304s either: every reload is a real
    fetch. Serving on a fresh port also works, since the HTTP cache is keyed on
    the full URL — but only until that port is poisoned too.

`python -m http.server 4173` is still fine for a quick look; reach for this one
when the page stops reflecting what is on disk.
"""

import functools
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_header(self, keyword, value):
        # Drop the validators entirely. Without an ETag or a Last-Modified there
        # is nothing a conditional request can match, so the browser cannot
        # revalidate its way back to a stale copy.
        if keyword in ("Last-Modified", "ETag"):
            return
        super().send_header(keyword, value)

    def log_message(self, fmt, *args):
        # One line per request, without the date noise the base class prints.
        sys.stderr.write(f"{self.command} {self.path} -> {args[1] if len(args) > 1 else ''}\n")


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    directory = sys.argv[2] if len(sys.argv) > 2 else str(Path(__file__).resolve().parent)
    handler = functools.partial(NoCacheHandler, directory=directory)
    server = HTTPServer(("0.0.0.0", port), handler)
    print(f"serving {directory} on http://localhost:{port} — caching disabled", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped", flush=True)


if __name__ == "__main__":
    main()
