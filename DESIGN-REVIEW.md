# Design review and iteration queue

## 1. Show the game — implemented, awaiting visual review

Keep the paper, gold and serif identity. Give actual game captures more space:
an uncropped Klondike hero, a real Sandbox table, and six visible game previews
linking to their rules. Replace the hidden screenshot tabs with a static gallery.
Preserve the original explanatory hero copy and keep home navigation available on mobile.
Home content remains visible without JavaScript.

The original hero adds a simulated window bar and perspective around an already
complete game image. Gallery images use fixed heights and cover cropping, which
can cut off the board. Sandbox's decorative floating cards convey atmosphere
but do not show what the application does. This iteration addresses those points.

Scope: home page only. Generated rules, board diagrams, deck gallery and source
catalog remain owned by the existing build pipeline. `home.css` isolates this
iteration from the other pages. No changes in cardz-win.

Screenshot imports: run `python scripts/import-screenshots.py` with Pillow
installed and the sibling cardz-win repository present. Sources are the eight
named captures in `cardz-win/docs/screenshots/store`; conversion preserves the
entire frame. These are the current August 2026 store captures supplied by the
user. They illustrate the app, not mode gesture instructions.

Review at desktop and phone widths: screenshot readability, page length, hero
balance, visible navigation, keyboard focus, and links from images to rules.
Browser visual verification is pending a connected browser.

## 2. Demonstrate table modes — Fish and Order recordings implemented

After approving the first Fish prototype, the user supplied new cropped Fish
and Order recordings. Both now appear on Sandbox with posters and text
descriptions. Encoding preserves the entire supplied frame, original resolution,
pointer and gesture timing, and omits audio. An extra one-second hold makes the
result readable before restarting. Demos loop muted only while at least 35%
visible and the browser tab is active. An external pause/play button keeps the
recorded toolbar unobscured and remembers a manual pause. Reduced-motion users
start with the poster and can opt into playback. Without JavaScript, native
controls remain available and playback is manual.

Rebuild with `python scripts/build-mode-demos.py "<recordings-folder>"` (requires
imageio-ffmpeg), using fish.mp4 and order.mp4. Originals remain untouched outside
this repo. The crops include the toolbar and complete gestures. Videos retain
their natural wide aspect ratios without stretching or added padding.

Possible next recordings: Spread and Grab. Show initial state,
active mode, pointer path and resulting state. Prefer short recordings from the
current game; any diagrams should be explicitly illustrative and match engine
behaviour. Provide replay controls and a static reduced-motion alternative.
Review these before expanding to all twelve or combined modes.

The sandbox-mode-animations branch uses repeated CSS translations, rotations
and staggered timing. These are not a reliable specification of the simulation.
For example, current DragController.Spread.cs anchors the bottom card, requires
a top-of-pile source, preserves an existing curve and limits overlap; Grab also
changes the scope. Confirm gestures against current controller code and tests,
then capture them in the app. Do not merge the old branch wholesale.

## 3. Carry the visual system through — queued, not implemented

Apply the approved direction to Sandbox, generated game pages and decks.
Change build.mjs for generated markup rather than editing its output. Consider
optional editorial screenshot mappings beside the existing rules and diagrams,
without making screenshots the source of game rules. Check navigation and
accessibility across all page types, including narrow screens.

Stop after iteration 1 for user review. No later iteration is authorized by
this queue alone.
