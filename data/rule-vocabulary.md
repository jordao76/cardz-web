# Rule & Composition Vocabulary

Reference for Cardz `.cardz` game files: cards, board layout, rules, deals, and goals.

---

## Game files

A `.cardz` file is JSON. Double-click it, or use **Import…** in *Your games*, to add it
to Cardz. It holds either the game object itself or the export wrapper
`{ "schemaVersion": 1, "setup": { … } }`.

This complete four-column Klondike variant uses most of the vocabulary; each part is
explained below.

```json
{
  "name": "Pocket Patience",
  "description": "Build each suit up from Ace on the foundations. Columns build down in alternating colours, and only a King fills an empty column.",
  "depotOnly": true,
  "rules": {
    "foundation": { "seed": "Ace", "build": { "direction": "Up", "step": 1 }, "suit": "Same" },
    "column": { "seed": "King", "build": { "direction": "Down", "step": 1 }, "suit": "AlternateColor" }
  },
  "depots": [
    { "name": "stock", "type": "Stock", "col": 0, "row": 0,
      "draw": { "to": "waste", "count": 1, "recycle": true },
      "landFace": "Down", "ejectRule": "locked" },
    { "name": "waste", "type": "Waste", "col": 1, "row": 0,
      "acceptRule": "none", "ejectRule": "topOnly" },
    { "name": "foundation", "type": "Foundation", "col": 3, "row": 0, "repeat": 4,
      "acceptRule": "$foundation", "ejectRule": "locked" },
    { "name": "column", "type": "Tableau", "col": 0, "row": 1, "repeat": 4, "autoFlipTop": true,
      "acceptRule": "$column", "ejectRule": "faceUp" }
  ],
  "dealRules": [
    { "kind": "dealGroup", "to": ["column-1", "column-2", "column-3", "column-4"], "faceDown": 2, "faceUp": 1 }
  ],
  "winCondition": { "kind": "allCardsIn", "depots": "Foundation" }
}
```

---

## JSON format

- Property names are camelCase; enum values are capitalized and spelled out
  (`"Tableau"`, `"AlternateColor"`, `"King"`). Both are read case-insensitively, but
  Cardz writes these forms.
- Deal steps and win/loss conditions name their variant in `kind` (both explained below).
- Omitted properties take the defaults listed below.
- Some fields accept a short form, noted with the field. Cardz exports the full form.

---

## Top-level properties

| Field | Type | Default | Meaning |
|---|---|---|---|
| `name` | string | required | the game's name |
| `description` | string | — | player-facing rules in Markdown; not read by the engine |
| `family` | string | — | exact-string grouping key, e.g. `"Klondike"` |
| `decks` | list of packs | one 52-card deck | the cards; see **Deck composition** below |
| `depots` | list of depots | required | the places that hold cards; see **Depots** below |
| `rules` | object | — | named rules that depots share; see **Depot rules** below |
| `dealRules`, `redealRules`, `redealWhen`, `maxRedeals` | | | the deal and redeals; see **Deal steps** below |
| `winCondition`, `lossCondition` | | | see **Win & loss conditions** below |
| `depotOnly` | bool | `false` | a card dropped on open table, not on a depot, bounces back. Usually on for ruled games. |
| `compoundMoves` | `Free`, `Staged` | `Free` | `Free` moves any valid run as a unit; `Staged` limits runs to `(1 + free cells) × 2^(empty columns)`, as in FreeCell |
| `tools` | `Unset`, `Free`, `None` | `Unset` | `None` hides the table modes, the free-handling tools (Fish, Grab, Order, Spread…) |
| `anchor` | `TopCenter`, `TopLeft` | `TopCenter` | where the board sits when it is smaller than the window |
| `fanOffsetFaceUp`, `fanOffsetFaceDown` | number | built-in | fan step in px for face-up / face-down cards; depots may override it |

Players can switch a game's rules off: every depot then accepts and releases cards
freely, `depotOnly` stops applying, and the table modes return.

---

## Deck composition

`decks` is a list of packs. Cardz expands each pack, combines them, then shuffles.

| Field | Type | Default | Notes |
|---|---|---|---|
| `suits` | `["Clubs","Diamonds","Hearts","Spades"]` | all four | narrow for single- or two-suit packs |
| `ranks` | `["Ace","Two"…"Ten","Jack","Queen","King"]` | Ace–King | drop entries for stripped decks |
| `count` | integer | `1` | identical copies of this pack |
| `jokers` | integer | `0` | jokers per copy. A joker has no rank or suit, so ruled depots refuse it unless they set `wildJoker` (see **`acceptRule`** below). |

A pack holds `(suits × ranks + jokers) × count` cards; a game holds at most **208**.

- **Standard**: leave `decks` out, or write `[ {} ]` → 52. Two decks: `[ { "count": 2 } ]` → 104.
- **Spider 1-suit**: `[ { "suits": ["Spades"], "count": 8 } ]` → 104 spades.
- **Spider 2-suit**: `[ { "suits": ["Spades","Hearts"], "count": 4 } ]`.
- **Stripped 32-card** (7–Ace): `"ranks": ["Seven","Eight","Nine","Ten","Jack","Queen","King","Ace"]`.

Copies alternate between two card-back styles.

---

## Depots

`depots` is a list of depot objects: the places that hold cards.

| Field | Values | Notes |
|---|---|---|
| `name` | string | unique id other fields use to refer to this depot |
| `type` | `Stock`, `Waste`, `Foundation`, `Tableau`, `Cell`, `Reserve`, `Layout` | required. Every game needs a `Stock`; the deck starts there. `Layout` is a rule-free spot for unruled tables. |
| placement | `col`/`row` (grid, fractional) or `x`/`y` (px); `angle` (radians) | `x`/`y` win over `col`/`row` |
| `repeat` | integer | create N copies, named with 1-based suffixes (`column-1` … `column-7`), each one grid column right of the last |
| `offTable` | bool | keep the depot off the visible table, e.g. a stock that only deals |
| `fanDirection` | `None`, `Down`, `Up`, `Left`, `Right`, `Radial` | `None` is a squared pile; `Radial` is a held-hand arc. Default `Down` for a `Tableau`, `None` otherwise. |
| `fanWindow` | integer | fan only the top N cards; ignored by `Radial` |
| `fanAnchor` | `Base`, `Center`, `Top` | which fan card stays on the depot's spot: bottom, middle or top. Default `Base`, or `Center` for `Radial`. |
| `fanOffsetFaceUp`, `fanOffsetFaceDown` | number | this depot's fan step in px; defaults to the top-level value |
| `looseOrder` | bool | a drag reorders cards along the fan, and a pickup takes only the selected card. For hands and fanned reserves. |

---

## Depot patterns

Some fields name a set of depots: `acceptFrom`, `autoSend`, `autoRefill`, and the
`depots` of win/loss conditions (all below). A pattern is either `{ "ofType": "Foundation" }`
(every depot of that type) or `{ "names": ["reserve"] }` (the named depots); set exactly
one. Either may be written bare: `"Foundation"` or `["reserve"]`.

---

## Depot rules

Besides its layout, a depot says how it handles cards, what may land on it
(`acceptRule`), what may leave it (`ejectRule`), what a tap does (`draw`) and what moves
by itself (`autoSend`, `autoRefill`). An `acceptRule` or `ejectRule` may be written
`"$name"` to use a rule from the top-level `rules`.

### Card handling

| Field | Values | Meaning |
|---|---|---|
| `landFace` | `Up`, `Down` | dropped cards land this side up; omit to keep their face |
| `landUnder` | bool | dropped cards go beneath the pile |
| `autoFlipTop` | bool | turn the new top card face-up after a card leaves |
| `uncoveredBy` | list of names | the top card can't be picked up until these depots are empty; a single name may be a string |
| `uncoveredByAny` | bool | one listed depot being empty is enough |
| `autoFlipUncovered` | bool | turn the top card face-up once `uncoveredBy` frees it |

### `acceptRule` — what may land

`acceptRule` is `"any"` or omitted (no restriction), `"none"` (reject all drops),
`"emptyOnly"` (only into an empty depot), or an object with the fields below, all of
which must pass. Fields shown without a type are `true`/`false`.

| Field | Meaning |
|---|---|
| `rejectsAll` | never a drop target |
| `emptyOnly` | accept only into an empty depot |
| `single` | reject piles of more than one card |
| `minCount` (integer) | reject piles smaller than N, e.g. `13` for a Spider foundation |
| `acceptFrom` (depot pattern) | accept only from matching depots |
| `seed` (rank) | a drop onto an empty depot must start with this rank |
| `seedNone` | reject drops while empty |
| `seedFromDeal` | the deal sets the seed: the face-up card it leaves on a `seedFromDeal` depot seeds them all. If none is face-up, they reject drops while empty. |
| `rankIs` (rank) | accept only this rank, empty or not; every card of a dropped pile must match |
| `build` | rank relation to the top card; see **Build and suit rules** below |
| `suit` | suit relation to the top card; see **Build and suit rules** below |
| `follow` | match the top card's rank **or** suit; no effect while empty |
| `wildRank` (rank) | this rank lands on any top card, ignoring `rankIs`, `build`, `suit` and `follow`; other checks still apply |
| `wildJoker` | jokers are wild, like `wildRank` |
| `wildDeclares` | what may follow a wild card left on top: `none` (default) follows it as printed, so only another wild follows a joker; `suit` follows a suit the player calls; `free` takes any card; `transparent` reads the wild as the card the pile needed. `true` means `"suit"`. |
| `allowFaceDown` | accept face-down drops; they skip the checks on what the card is (`seed`, `rankIs`, `build`, `suit`, `follow`) |

### Build and suit rules

`build` and `suit` compare a card with the one it lands on. `acceptRule` uses them, and
so does an eject `Run` unit (below).

- **`build`**: `direction` is `Up`, `Down` or `Either`, required unless you use `sum`.
  `step` is 0–12, default 1 (0 matches equal ranks). `wrap` builds through
  King↔Ace. Instead of a direction, `sum: N` accepts a card whose pip value (Ace = 1 …
  King = 13) totals N with the top card, then turns the pair face-down.
- **`suit`**: `Any` (default), `Same`, `AlternateColor` or `SameColor`.

### `ejectRule` — what may leave

`ejectRule` decides what the player may pick up from this depot. It has two parts:

- **`gate`**: which card may be picked up. `Any` (default): any card. `FaceUp`: any
  face-up card. `TopOnly`: only the top card. `Locked`: nothing. A rule that is only a
  gate may be written as its name: `"any"`, `"faceUp"`, `"topOnly"`, `"locked"`.
- **`unit`**: which cards leave with it.
  - Omitted: the picked card and every card above it. The receiving depot's
    `acceptRule` checks the whole group, each card against the one beneath it.
  - `Single`: only the picked card; the cards above it stay.
  - `Any`: the picked card and every card above it, in any order.
  - `Run`: the picked card and every card above it, if they follow the unit's own
    `build` and, optionally, `suit`.

  Write it `{ "kind": "Run", "build": …, "suit": … }`. `"single"` and `"any"` may be
  written bare, and `{}` means `Any`.

A declared `unit` vouches for the group, so the receiving depot's `acceptRule` checks
only the group's bottom card. A foundation fed by an `Any` unit should therefore set
`single: true`, or it will take an unordered pile.

### `draw` — tapping a stock

`draw` makes a depot a stock the player taps. Drawn cards skip the target's
`acceptRule`. A depot with `draw` takes no drops; make its eject `"locked"` so cards
leave only by tapping.

- `to`: the depot drawn cards land on, face-up.
- `count`: cards per tap, default 1; a short stock draws what is left.
- `recycle`: tapping the empty stock brings the whole `to` pile back, reversed and face-down.
- `maxRecycles`: how many recycles are allowed; omitted means unlimited, `0` none.

### `autoSend` and `autoRefill` — automatic moves

Both take a depot pattern. An automatic move is one you could make by hand: the source's
`ejectRule` decides what lifts, the target's `acceptRule` what lands.

- `autoSend`: move this depot's largest legal top group to the first matching depot that
  accepts it.
- `autoRefill`: while this depot is empty, move one card into it from the first matching
  depot that releases one.

They run whenever cards land, including draws and redeals (below), and cascade until the
board settles; one undo takes back the lot. The opening deal does not trigger them.

Give the target a strict rule: `autoSend` onto a depot that accepts anything empties its
source, and two depots refilling from each other loop until the cascade limit.

---

## Deal steps

`dealRules` is the opening deal: a list of steps run in order. Without it, every card
starts in the stock. `redealRules` is a second list the player runs during play by
tapping the stock it deals from; each run deals from what is left there.

| `kind` | Fields | Meaning |
|---|---|---|
| `dealGroup` | `to`, `faceDown`, `faceUp`, `roundRobin`, `from` | deal `faceDown` then `faceUp` cards to each `to` depot. `roundRobin: true` deals one per depot per pass; otherwise each depot is filled before the next. `to` may be a single name; `from` defaults to the first stock. Stops when the stock runs out. |
| `move` | `from`, `to` | move one card, keeping its face |
| `flipTop` | `depot` | turn the depot's top card face-up |
| `place` | `rank`, `suit`, `to`, `joker` | pull the first matching card out of the stock and place it face-up. Needs `rank` and `suit`, or `joker: true`. |
| `gather` | `from`, `to` | move every card from the `from` depots onto `to`, face-down. A redeal that gathers into a stock is tapped from that stock once it is empty, like a recycle. |
| `shuffle` | `depot` | randomly reorder the depot's cards |

`redealWhen` is a condition that must hold for a redeal to run, written like
`winCondition` (see **Win & loss conditions** below).

`maxRedeals` caps the redeals after the opening deal: omitted means unlimited, `0` none.
Every run counts once, even a short one, and all the stocks a redeal deals from share
the cap.

---

## Win & loss conditions

`winCondition` and `lossCondition` describe the board that ends the game. Cardz checks
them after each move and declares a win or a loss as soon as one holds. Both are
optional: leave one out and the game never ends that way.

Fields named `depots` take a depot pattern.

**`winCondition`**:

- `allCardsIn` (`depots`): every card is on a matching depot.
- `allCardsFaceUp`: every card is face-up.
- `depotsEmpty` (`depots`): every matching depot is empty.
- `depotsNonEmpty` (`depots`): every matching depot has a card; mostly for `redealWhen`.
- `allOf` / `anyOf` (`of`): all / any of the listed conditions.

**`lossCondition`**:

- `noLegalMoves`: no card can move and no tap does anything. Needs `depotOnly`. A
  `landUnder` move counts only if it reveals a card. Suits games that really run out of
  moves; with unlimited recycles or easy shuttling it rarely fires.

---

## Conventions the rules leave to the player

Some setup rituals and courtesies have no rule field, such as La Belle Lucie's *merci*
or sinking the Kings in Baker's Dozen. Describe them in `description` and leave the move
to the player and the table modes.

---

## Canonical encodings

Common patterns, with JSON quotes left out:

- **Klondike**: each tableau column accepts
  `{ seed: King, build: { direction: Down }, suit: AlternateColor }`, ejects `faceUp`,
  and sets `autoFlipTop: true`.
- **FreeCell**: cells accept `{ emptyOnly: true, single: true }`; `compoundMoves: Staged`;
  the stock is `offTable`.
- **Spider**: decks `[{ suits: [Spades], count: 8 }]`. Foundations accept
  `{ emptyOnly: true, seed: King, build: { direction: Down }, minCount: 13 }`. The tableau
  ejects `{ gate: FaceUp, unit: { kind: Run, build: { direction: Down } } }` with
  `autoSend: Foundation`. Four-suit Spider uses `[{ count: 2 }]` and adds `suit: Same` to
  the unit.
- **Golf**: the tableau accepts `none` and ejects `topOnly`; the foundation accepts
  `{ build: { direction: Either } }`; the stock has `draw: { to: foundation }` without
  `recycle`; loss `noLegalMoves`.
- **Pyramid**: each slot accepts `none`, ejects `faceUp`, and is `uncoveredBy` the two cards
  covering it; the discard accepts `{ single: true, build: { sum: 13 } }`; the waste
  accepts `{ acceptFrom: [stock] }`.
- **Crazy Quilt**: cells accept `none`, eject `faceUp`, and are `uncoveredBy` both
  short-end neighbours with `uncoveredByAny: true`; foundations accept
  `{ seed: Ace, build: { direction: Up }, suit: Same }` or
  `{ seed: King, build: { direction: Down }, suit: Same }`, over two decks; the stock
  draws with `recycle: true, maxRecycles: 1`.
- **Clock**: each hour pile accepts `{ rankIs: <its hour> }` and sets `landUnder: true`;
  win `allCardsFaceUp`, loss `noLegalMoves`.
- **Yukon**: the tableau ejects `{ gate: FaceUp, unit: any }`; foundations add
  `single: true`.
- **Flower Garden**: the bouquet accepts `none`, ejects `{ unit: single }`, and sets
  `looseOrder: true`.
- **Canfield**: foundations accept
  `{ seedFromDeal: true, build: { direction: Up, wrap: true }, suit: Same }` and eject
  `locked`; the tableau sets `autoRefill: [reserve]`.
