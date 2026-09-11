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

## 2. Demonstrate table modes — all seven takes recorded, build next

Fish and Order recordings have been on Sandbox since 2026-09-05. On 2026-09-10
Felt House's number cards changed (their index now stacks like the printed
courts), so those two clips show a deck the app no longer draws. Every take
below, Fish and Order included, was recorded again to one spec on 2026-09-11:
seven clips, checked frame by frame. Rotate and Dive were dropped as not needed.

### Which modes get a clip

A mode gets a clip when its effect exists only in motion. The test is whether a
still before and a still after would explain it; if they would, a sentence is
enough.

| Mode | Clip | Why |
| --- | --- | --- |
| Fish | yes | the card slides out without taking the cards on top of it along |
| Order | yes | neighbours slide aside as the card passes them |
| Spread | yes | the pile opens behind the pointer; the end state looks like any fan |
| Corral | yes | the cluster sweeping in is the whole effect |
| Trawl | yes | cards join mid-drag; a still shows only a pile |
| Grab | yes, as Fish + Grab | plain Grab looks like a normal drag; the combo shows the count and composition in one take |
| Depot | yes, in the Keep section | it is step 1 of "Arrange it. Keep it." |
| Rotate | no (dropped) | a turned card reads fine in a sentence; the Spread + Rotate fan was a nice-to-have |
| Dive | no (dropped) | "it tucks underneath" reads fine in a sentence, and the mid-drag V toggle is an invisible key press |
| All | no | on camera it is a normal drag |
| Shuffle, Orient | no | outcomes of a double-tap, which a sentence covers |

Not a single showreel. Text cannot point at second 23 of a reel, a visitor
cannot jump to Trawl, a reduced-motion visitor gets one poster for twelve
ideas, and any toolbar change means re-recording all of it. Because every take
follows one spec, a reel for the home page or a Store trailer can be joined from
these clips later without recording anything new.

### Page structure: each mode appears once

The intro already asks four questions: what comes with the card, how the cards
should land, whether they travel above or below, and what a double-tap should
do. Those become the section headings. Each mode sits under exactly one of them,
either as a clip row or as a small text card. The separate "Table modes &
tools" grid goes, and so does its Keep card that only links further down the
page. Depot is described once, in the Keep section.

```
Intro                        unchanged
How modes work               one-shot, Ctrl+key to hold, combos (replaces the note under the grid)
What comes with the card     ▶ Fish    ▶ Grab    ▶ Trawl   · All
How the cards land           ▶ Spread  ▶ Corral  ▶ Order   · Rotate
Above or below               · Dive
What a double-tap does       · Shuffle · Orient  (All and Grab apply to both)
Arrange it. Keep it.         ▶ Depot, then the three steps
Call to action
```

▶ is a clip row in the approved Fish/Order layout; · is a text card. Each clip
row merges what used to be split between its demo section and its grid card
into one entry.

### Recording spec

Applies to every take, so the clips read as a set.

- **App:** `.\scripts\run.ps1 -Profile demos` from cardz-win, then Sandbox. The
  profile keeps the recording table apart from real saves and survives a
  relaunch.
- **Look:** the Felt House deck on the table the current clips use. Same window
  size and zoom for every take; do not move or resize the window between takes.
- **Frame:** the whole toolbar edge to edge with a small margin, and the band of
  felt above it where the cards move, about 1210×500. Check on a practice run
  that the whole gesture stays inside the band. Hand crops vary a little: widths
  1210–1218, heights 486–500. Clips keep their native size, and each video's
  own width and height attributes size its row. Trimming to one common size was
  considered and rejected: the smallest height, trawl's 486, would cut the top
  edge off Grab's fan, which sits about 10 px from the top.
- **Arming:** click the chip on camera. Keys are invisible. Anything set in a
  chip's drawer (a layout or shape) is chosen before recording starts. Chips
  show their setting while armed (CORRAL reads PILE, GRAB reads GRAB · 3, DEPOT
  reads FAN), and armed colours differ by family: gold for most, coral for
  GRAB, blue for TRAWL.
- **Cast:** the queen of hearts is the card being moved, against black cards
  (Q♣ 8♠ 6♣ 4♣ 7♠ 7♣). Grab adds 10♦ and 4♥ for its red run; Depot's pile holds
  a 10♦ too.
- **KEEP chip:** lit where the table has a depot (Fish, Order, and Depot once
  stamped), greyed elsewhere. A small difference between rows, not worth a
  retake.
- **Toolbar fade:** the toolbar dims when the pointer settles away from it.
  Grab's recording fades 6.4 s in, a second after its cards land, so the build
  cuts it at 6.3 s. Depot is faded at both its first and last frames, so its
  loop joins seamlessly and needs no cut. The other five never fade.
- **Pacing:** about 1 s still, click the chip, move to the card, do the gesture
  at reading pace, release, stop. The build adds a 1 s hold on the last frame.
  Aim for 4–8 s.
- **Retakes:** Ctrl+Z. A whole gesture is one undo step, so the starting layout
  comes back without rearranging it.
- **Files:** named as below, all in one folder outside this repo.

### Takes

Fans run left to right, so the right-most card is on top. All seven takes were
recorded on 2026-09-11 and are described as recorded, which is not always as
first scripted.

**`fish.mp4` — Fish** · recorded, 5.4 s
- Start: a fan depot holding Q♣ 8♠ 4♣ Q♥ 6♣, and an empty pile depot to its
  right.
- Take: FISH, press Q♥, drag it right onto the empty pile, release.
- Shows: Q♥ slides out from under 6♣ without taking it along. The fan closes the
  gap behind it (it is in a depot; a loose fan would keep the gap), and Q♥
  snaps into the pile.
- Page text: "Watch the queen of hearts slide out from under the six of clubs
  and drop into the empty pile, while the fan closes up behind her."

**`order.mp4` — Order** · recorded, 6.2 s
- Start: the same fan depot, Q♣ 8♠ 4♣ Q♥ 6♣, with the empty pile beside it
  (unused in this take).
- Take: ORDER, press Q♥, drag it left along the fan to the far end, release.
- Shows: 4♣, 8♠ and Q♣ each slide right as Q♥ crosses them, and Q♥ settles at
  the left end.
- Page text: "Watch the queen of hearts move from the middle of the fan to its
  left end as the other cards slide aside."

**`spread.mp4` — Spread** · recorded, 6.3 s
- Start: a squared loose pile of six: Q♥ on top of 7♠ 6♣ 4♣ 8♠ Q♣, no depots.
- Take: SPREAD, press Q♥ (it must be the top card; anywhere else is a normal
  drag), drag right about three card widths, release.
- Shows: Q♣ at the bottom stays put, and the rest open evenly between it and the
  pointer.
- Page text: "Watch the pile open behind the queen of hearts as she is dragged
  to the right."

**`corral.mp4` — Corral** · recorded, 3.8 s
- Start: Q♣ 8♠ 4♣ 6♣ Q♥ at odd angles, each overlapping the next; 7♣ on its
  own to the right, touching none of them.
- Layout: PILE, not the scripted ROW.
- Take: CORRAL, press Q♥, drag it a short way down and left, release.
- Shows: the other four converge under Q♥ into a squared pile, while 7♣, not
  part of the cluster, stays where it is.
- Page text: "Watch four overlapping cards gather under the queen of hearts
  into a squared pile. The seven of clubs touches none of them, so it stays
  put."
- Note: the fastest clip. The gather takes about a second over a short drag.
  Usable as is; if it reads as a snap rather than a sweep on the page, retake
  with a longer, slower drag, since the cards converge over about one and a
  half card widths of travel.

**`trawl.mp4` — Trawl** · recorded, 5.9 s, 1218×486
- Start: Q♣, 8♠ and 6♣ loose in a line across the table, about a card width
  apart, with Q♥ at the right end.
- Take: TRAWL, press Q♥, sweep it left through 6♣, 8♠ and Q♣ at the height of
  their centres, then carry the catch a little way back right, release.
- Shows: each black card joins as Q♥ passes over it and follows from where it
  was caught, so they arrive as an overlapping row beneath Q♥ (Q♣ at the bottom,
  then 8♠, 6♣), not as a squared stack.
- Note: at the far left of the sweep, from about 3.2 s to 3.6 s, the catch
  pushes Q♣ past the frame's left edge, cutting off its border and touching its
  Q index. It is back in frame by 3.6 s and the end state is fully in frame, so
  the clip is usable. Only a retake that stops the sweep a little further right
  would remove it.
- Page text: "Watch the queen of hearts sweep left across the table and pick up
  three loose cards on her way."

**`grab.mp4` — Grab + Fish** · recorded, 9.8 s, cut to 6.3 s
- Start: a loose fan of eight: Q♣ 8♠ 6♣ 10♦ 4♥ Q♥ 7♣ 4♣.
- Take: GRAB twice so its chip reads GRAB · 3, then FISH. Press Q♥, the
  right-most red card, pull it down into open felt, release.
- Shows: 10♦, 4♥ and Q♥ leave together, with 7♣ and 4♣ left behind. The fan is
  loose, so the gap stays: Q♣ 8♠ 6♣ on the left, 7♣ 4♣ on the right. Contrast
  `fish.mp4`, whose depot fan closes up.
- Cut: the cards land by about 5.4 s and the toolbar fades at 6.4 s. Everything
  after 6.3 s is dropped.
- Page text: "Watch three red cards come out of the middle of the fan together,
  leaving the cards on either side where they were."

**`depot.mp4` — Depot** · recorded, 6.9 s
- Start: a messy loose pile of seven, Q♣ 8♠ 6♣ 7♣ 4♣ 10♦ Q♥, overlapping at odd
  angles in the middle of the table.
- Before recording: FAN chosen in DEPOT's drawer.
- Take: DEPOT (the chip reads FAN) and the table dims for placement. The pointer
  settles over the middle of the pile and clicks there, so the depot is stamped
  straight onto the pile. There was no ALL step.
- Shows: the placement preview over the dimmed pile, then the pile adopting the
  new depot, all seven cards flowing into one even fan.
- Note: the pointer spends about 2.8 s over the dimmed table choosing a spot
  (1.3 s to 4.1 s), the slowest stretch of any clip. Usable; a quicker placement
  is the only reason to retake.
- Page text: "Watch a fan-shaped landing spot drop onto a messy pile, and every
  card take its shape."

If a take ends differently from its "Must show" line, the page text changes to
match the recording, not the other way round.

### Order of work

1. ~~Record a first batch and check it.~~ Done 2026-09-11: `fish`, `order`,
   `spread` and `corral`.
2. ~~Record the rest.~~ Done 2026-09-11: `trawl`, `grab` and `depot`. Rotate
   and Dive dropped. All seven show their mode.
3. ~~Build.~~ Done 2026-09-11, awaiting visual review:
   - `scripts/build-mode-demos.py` encodes the seven clips in its `CLIPS`
     table at native size, with `grab` cut at 6.3 s, and prints each video's
     width and height for the markup.
   - Posters come from the held end state, not the first frame.
   - `sandbox.html` follows the structure above. The "Table modes & tools" grid
     and its Keep card are gone; each clip row merges its old demo copy and grid
     text. The intro no longer explains arming and holding, which the new "How
     modes work" strip does, and the Keep section's first step no longer lists
     Depot's shapes, which the Depot row does.
   - `mode-demos.js` finds each video's row by `.mode-demo` rather than
     `section`, since rows are now articles inside a group.
   - Checked in Chrome: 7 videos and 7 toggles, every clip and poster served,
     no duplicate ids, each `aria-describedby` resolves, and no horizontal
     overflow at 390px. Checked at 1440px and 1100px in headless Edge renders.
     The two-column Dive / double-tap block shares rows through subgrid, so its
     card grids align even where one heading wraps.

Unchanged from the Fish/Order implementation: encoding preserves the whole
supplied frame, original resolution and gesture timing (apart from `grab`'s end
cut), strips audio (the recordings carry an audio track), and adds
a one-second hold before the loop restarts. Demos loop muted only while at
least 35% visible and the tab is active. An external pause/play button keeps the
recorded toolbar unobscured and remembers a manual pause. Reduced-motion
visitors start on the poster and can opt into playback. Without JavaScript,
native controls remain and playback is manual. Rebuild with
`python scripts/build-mode-demos.py "<recordings-folder>"` (requires
imageio-ffmpeg); originals stay outside this repo.

The sandbox-mode-animations branch uses repeated CSS translations, rotations
and staggered timing, which are not a reliable specification of the simulation.
Every take above was checked against the current controllers (Spread starts
only from the top card, Corral gathers only a chain of overlapping cards, Fish +
Grab takes the pressed card and the N−1 beneath it); the app is still the
authority when recording. Do not merge the old branch wholesale.

## 3. Carry the visual system through — queued, not implemented

Apply the approved direction to Sandbox, generated game pages and decks.
Change build.mjs for generated markup rather than editing its output. Consider
optional editorial screenshot mappings beside the existing rules and diagrams,
without making screenshots the source of game rules. Check navigation and
accessibility across all page types, including narrow screens.

Stop after iteration 1 for user review. No later iteration is authorized by
this queue alone.
