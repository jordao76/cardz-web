# Rule & Composition Vocabulary

The complete reference for a Cardz **design file**: a game written as data — its
cards, its board, its rules, its deal and its goal. Every built-in game is written in
exactly this vocabulary, so anything a built-in does, a design can do. This is a map
of *what can be expressed*: nothing is hardcoded per game.

---

## Design files

A design file is JSON, saved with the `.cardz` extension. Open one in Cardz —
double-click it, or choose **Import…** in Your games — and Cardz checks it before it
adds it to your games. A file it cannot take is refused with the reason and, where
there is one, the line, column and field to fix (see *What validation checks*).

A file holds the game in one of two shapes:

- **The game itself** — an object with `name`, `decks` and `depots` at the top. This
  is the shape to write.
- **An exported design** — what Cardz writes when you export one:
  `{ "schemaVersion": 1, "setup": { …the game… } }`. The `id` and timestamps an
  export carries are optional; Cardz gives every design it brings in a fresh identity.

Designs are played solo. The surest way to start is from a working game: take one
close to what you want, change it, and give it a new `name`.

A small but complete game — a four-column patience. It sets out twelve piles in four
entries, using two of the shorthands described under *Shorthands* below: `repeat` stamps
out a row of them, and `rules` names a rule used more than once.

```json
{
  "name": "Pocket Patience",
  "description": "Build each suit up from Ace on the foundations. Columns build down in alternating colours, and only a King fills an empty column.",
  "decks": [ {} ],
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

## The canonical JSON shape

Read this first — the format is exact, and the friendlier spellings a card-game
schema might suggest are not accepted.

- **Property names are camelCase**, exactly as the tables below spell them:
  `"name"`, `"decks"`, `"depots"`, `"acceptRule"`, `"minCount"`. They are matched
  case-insensitively, so a design written in PascalCase still loads — but camelCase
  is the spelling Cardz writes, and the one to write.
- **Enum values are strings naming the member**, capitalised: `"Tableau"`,
  `"Foundation"`, `"Down"`, `"AlternateColor"`, `"Spades"`, `"Ace"`, `"Ten"`,
  `"King"`. These are matched case-insensitively too (`"tableau"` works), but
  abbreviations are not: `"S"`, `"A"`, `"10"` all fail.
- **Unions carry a `"kind"` discriminator** — deal steps
  (`"dealGroup"`, `"move"`, `"flipTop"`, `"place"`, `"gather"`, `"shuffle"`) and
  win/loss predicates (`"allCardsIn"`, `"noLegalMoves"`, …):
  `{ "kind": "allCardsIn", "depots": { "ofType": "Foundation" } }`.
- **Required properties**: `name`, `decks`, `depots` at the top level, and `type`
  on every depot. Omitting one fails the parse outright.
- **Optional properties may be omitted** and take the default
  named in the tables below — `{ "direction": "Down" }` is the adjacent build,
  `{}` is a standard 52-card deck recipe, `"unit": {}` takes any group. Omitting
  a field and writing its default are the same thing, so a partial object is
  safe to send when it includes that object's required fields. Use `null` only
  for nullable fields; it is not a substitute for an omitted number, boolean or enum.
- **Unknown properties are ignored**, so a `"$schema"` line may point an editor at
  the published schema, `https://cardz.roderic.dev/designs/schema.json`, for
  completion and checking as you type.
- A handful of fields take a **shorthand** as well as the shape above — see the next
  section. The shorthand is read, never written.

---

## Shorthands

Written out in full, a design is repetitive: every rule is an object, every pattern is
an object, every list is a list. These spellings are accepted anywhere the long form
is, and mean exactly the same thing.

| Where | Shorthand | Means |
|---|---|---|
| a depot's `fanDirection` | *omitted* | the default for its `type` — `"Down"` for `Tableau`, `"None"` for everything else |
| `acceptRule` | `"any"` | `{}` — the free-form default |
| | `"none"` | `{ "rejectsAll": true }` |
| | `"emptyOnly"` | `{ "emptyOnly": true }` |
| `ejectRule` | `"any"` | `{}` |
| | `"locked"` | `{ "gate": "Locked" }` |
| | `"faceUp"` | `{ "gate": "FaceUp" }` |
| | `"topOnly"` | `{ "gate": "TopOnly" }` |
| an eject rule's `unit` | `"single"` | `{ "kind": "Single" }` |
| | `"any"` | `{ "kind": "Any" }` |
| any depot pattern | `"Foundation"` | `{ "ofType": "Foundation" }` — a bare depot type |
| | `["reserve"]` | `{ "names": ["reserve"] }` — a bare list of names |
| a `dealGroup`'s `to`, a depot's `uncoveredBy` | `"column-1"` | `["column-1"]` |

And two that save whole paragraphs rather than words:

**`repeat`** on a depot stamps out that many copies of it. Names take a 1-based suffix on
the stem — `"name": "column", "repeat": 7` gives `column-1` … `column-7` — and each copy
sits one grid column right of the last, so a row of columns or foundations is one entry.
Everything else is shared: the copies are ordinary depots, and deal steps and patterns
name them exactly as if they had been written out. It needs `col`/`row` placement (a
repeat measured in pixels would stack every copy on one spot); a count below 1 is refused,
and so is one that would carry the whole board past **256 depots**. Give the stem a name
unless nothing needs to refer to the copies.

**`rules`**, at the top level, names a rule used more than once:

```
"rules": {
  "column": { "seed": "King", "build": { "direction": "Down", "step": 1 }, "suit": "AlternateColor" }
},
"depots": [
  { "name": "column", "type": "Tableau", "col": 0, "row": 1, "repeat": 7, "acceptRule": "$column" }
]
```

A name works in either rule slot — `acceptRule` or `ejectRule` — since the slot already
says which kind of rule it holds. A `"$name"` with nothing behind it is refused, and named
against the depot you wrote rather than the copy it became.

Two things to know about all of them.

**They are read, not written.** Cardz stores and exports the long form, so a file
written in shorthand comes back expanded — the same game, spelled out. Nothing is lost
and nothing is silently changed; it just won't look like what you sent.

**A spelling that isn't on this list is left alone**, so the error you get names the
field and the value you actually wrote. `"ejectRule": "topmost"` is reported against
`depots[1].ejectRule`, not quietly read as something else. The exception is a `"$name"`,
which can only ever have been a rule reference, and is refused as one.

One cost worth knowing: a file that uses any shorthand is checked as its expansion, so a
fault in it is reported with the field's path but **not** a line and column. A file written
out in full is checked exactly as you wrote it, and keeps both.

*Pocket Patience*, at the top of this page, is written with all of them.

---

## Deck composition

The cards a game is dealt from. `decks` is a list of **`DeckSpec`** recipes; the
deal pile is every recipe expanded and concatenated, then shuffled.

| Field | Type | Default | Notes |
|---|---|---|---|
| `suits` | `["Clubs","Diamonds","Hearts","Spades"]` | all four | narrow for single-/two-suit packs |
| `ranks` | `["Ace","Two"…"Ten","Jack","Queen","King"]` | Ace–King | drop entries for stripped decks (no courts, no aces, 32-card) |
| `count` | `int` | `1` | identical copies of this pack |
| `jokers` | `int` | `0` | inert jokers per copy — they occupy the board but satisfy no build/seed/suit/rank rule, so a ruled depot never accepts one |

A recipe's card total is `(suits × ranks + jokers) × count`. A design's whole
composition may deal at most **208 cards** (four standard decks); a larger total is
refused. Examples:

- **Standard**: `"decks": [ {} ]` → 52. Two full decks: `[ { "count": 2 } ]` → 104.
- **Spider 1-suit**: `[ { "suits": ["Spades"], "count": 8 } ]` → 104 spades.
- **Spider 2-suit**: `[ { "suits": ["Spades","Hearts"], "count": 4 } ]`.
- **Stripped 32-card** (7–Ace): `"ranks": ["Seven","Eight","Nine","Ten","Jack","Queen","King","Ace"]`.
- **No courts / no aces**: drop those ranks from `ranks`.

Card backs come in two styles; copies alternate them by parity, so composition
never changes back rendering.

---

## Depots — topology & placement

The board itself. Pure geometry, no rules.

| Axis | Values | Notes |
|---|---|---|
| `type` | `Stock`, `Waste`, `Foundation`, `Tableau`, `Cell`, `Reserve` | authored category; drives defaults + win-pattern matching. A seventh value, `Layout`, marks a rule-free landing spot placed in Sandbox — don't author one, but expect to read them: a layout kept from Sandbox is made of them, and carries no deal or goal either. Give such a slot one of the six categories when you add rules to it. |
| `fanDirection` | `None`, `Down`, `Up`, `Left`, `Right`, `Radial` | `None` = squared pile; `Radial` = held-hand arc, whole depot, centred on the slot (La Belle Lucie / poker hand). Omit it for the type's default: `Down` for a `Tableau`, `None` for every other type. |
| `fanWindow` | `int?` | fan only the top N, rest squared at base (ignored by `Radial`, which always arcs the whole depot) |
| placement | `col`/`row` (grid, fractional) or `x`/`y` (px), `angle` (**radians**) | px wins over grid |
| `name` | `string?` | stable id; required for any depot a deal step, `draw`, `uncoveredBy`, or a `names[]` pattern refers to. Must be unique. |
| `landFace` | `Up`, `Down` | face every arriving card takes on a successful drop; null keeps the face it arrived with |
| `fanOffsetFaceUp` / `fanOffsetFaceDown` | `double?` | per-depot override of the fan step in px (Clock's near-squared hour piles use `1`) |
| flags | `offTable`, `landUnder`, `autoFlipTop`, `autoFlipUncovered`, `uncoveredBy[]`, `uncoveredByAny` | phantom deal-source stock; tuck-under drop (turns the exposed top card face-up); reveal-on-removal; reveal-when-siblings-empty (Tri Peaks). `uncoveredBy` lists depots that must empty before this depot's top card lifts: all of them by default (Tri Peaks peaks), or — with `uncoveredByAny: true` — any one of them (Crazy Quilt's woven cells, free when either short end is exposed) |
| `looseOrder` | `bool` | this pile's resting order is a player preference, not game state, so a plain drag **sorts along the fan** and lifts only once it leaves it. True for a held hand and for a fanned reserve any card is playable from (Flower Garden's bouquet). Declare it only where nothing can read the order — a depot that accepts a build, or releases only its top card, is not a candidate |

---

## Per-depot rules

Two halves: **Accept** (can a drop land here?) and **Eject** (can cards be picked
up from here?). Plus two per-depot actions — a **Draw** the player taps, and the
**Auto-move** reflexes the depot performs itself. Turning a game's rules off in
Cardz switches every per-depot rule off at once, so every depot accepts and releases
cards freely.

### Accept rules — drop policy

Composable flags; the default (`"acceptRule": null`, or `"any"`) is fully free-form. All
declared checks must pass together (AND). The two commonest whole rules have names of
their own — `"none"` rejects every drop, `"emptyOnly"` takes one only into a vacancy.

| Field | Meaning |
|---|---|
| `rejectsAll` | never a drop target — deal-only depots (Klondike's waste, Golf's tableau) |
| `emptyOnly` | accept only into a vacancy (single-card holder slots) |
| `single` | reject piles larger than one card |
| `minCount` (`int?`) | reject piles smaller than N (lower bound; e.g. Spider foundation `minCount: 13`) |
| `seed` (`Rank?`) | first (base) card must be this rank (Ace / King foundations) |
| `seedNone` | reject all drops while empty (build-while-occupied, stay-empty-once-cleared) |
| `seedFromDeal` | seed rank set by the deal, not the author (Canfield); resolved at deal time |
| `rankIs` (`Rank?`) | **absolute** rank gate — accept only this rank, whatever the depot holds and whether or not it's empty. Every card of an incoming pile must match. Clock Solitaire's hour piles (1 o'clock takes only Aces …) |
| `build` (`BuildRule?`) | rank relationship to the depot's top card |
| `suit` (`SuitConstraint`) | suit relationship to the top card |
| `follow` (`bool`) | incoming card must match the top card's rank **or** suit — the shedding-family follow rule; the one disjunction `build`+`suit` (which compose as AND) can't spell. No effect while empty |
| `wildRank` (`Rank?`) | a card of this rank is wild: it lands on any top card, ignoring `follow`/`build`/`suit` and `rankIs`. Pile-shape, source, face and empty-pile seed gates still apply |
| `wildJoker` (`bool`) | a joker is wild rather than inert: it lands on any top card (rummy/canasta shedding). Same escape hatch as `wildRank`, keyed on the joker |
| `wildDeclares` (`"none"` / `"suit"` / `"free"`) | what a **wild** card left on top of this depot does to whatever follows it — the complement to `wildRank`, which frees the wild card as the *incoming* card. `"suit"` lets the player who landed it *name* the suit the next card must follow; the call replaces the top card's own suit in the `follow` check, so what stands is "the called suit, or another wild card". `"free"` lets **anything** land on the wild card, no suit named. Default `"none"`: the next card follows the wild card as printed. `true` is accepted as a spelling of `"suit"` |
| `acceptFrom` (`DepotPattern?`) | only accept drops from matching source depot(s) |
| `allowFaceDown` | permit face-down drops (ruled depots reject them by default). If any incoming card is face-down, only `rejectsAll`, `acceptFrom`, `single` and `minCount` are checked; all subsequent checks, including `emptyOnly`, seed, rank, suit and build, are bypassed |

The suit a player *calls* on a `wildDeclares: "suit"` depot is not authorable — a
design declares that the depot asks, never what was answered. The call is made with
the move that plays the wild card, stands only while that card is the depot's top
card, and is shown on the depot. `"free"` takes no call.

Pick `"free"` for a depot whose wild card is a **joker**. A joker carries neither
rank nor suit, so nothing can relate to it: under the other two modes a joker
landing on a `follow` depot walls the pile off until another joker is played.
`"free"` also reaches the internal pairs of an arriving run, so a wild card partway
up a multi-card drop frees the card above it too.

### Eject rules — pickup policy

Two sub-parts: `gate` (which single item may be grabbed) + `unit` (what leaves
together). A refused pickup is silently ignored.

- **`gate`**: `Any` (default), `Locked` (foundations), `FaceUp`, `TopOnly` (Golf — forbids grabbing a face-up run as a group). A rule that is only a gate is that gate's name: `"ejectRule": "locked"`.
- **`unit`** — an object `{ "kind": …, "build": …, "suit": … }`, or just the kind's name for the two that need nothing else (`"single"`, `"any"`):
  - `Single` — cards leave **one at a time**: grabbing any card takes exactly that card, its pile-mates above stay put (a *hand*, where any card may be played alone)
  - `Any` — any group regardless of internal order (Yukon). `"unit": {}` means this, since `Any` is `kind`'s default
  - `Run` — with `build` (and optionally `suit`), a group must form that run (Spider's descending run; the 4-suit variant adds `"suit": "Same"`)
- Declaring a `unit` moves internal-order responsibility to the *source* depot; the receiving depot then judges only the group's bottom card.

### Draw — tap the stock

A draw is a *deal*, not a player move, so the target's accept rule is never
consulted. Declaring a draw also stops the depot being offered as a drop target;
pair it with `"ejectRule": { "gate": "Locked" }` so cards leave only through the tap.

- `to` — target depot the drawn cards land on (face-up)
- `count` — cards moved per tap (Klondike Draw-3 is `"count": 3`); a short stock draws whatever remains
- `recycle` — tapping when empty pulls the whole `to` pile back, order reversed and face-down (Klondike's ↺); false = single pass (Forty Thieves, Golf, Tri Peaks)
- `maxRecycles` (`int?`) — maximum waste-to-stock recycles after the opening
  deal. Omitted or `null` = unlimited; `0` = none; `1` = one recycle, or two
  passes through the stock. Must be non-negative. `recycle: true` is still
  required. The limit belongs to this stock, not to other stocks on the board.
  A finite recycle uses the stock tap; cards cannot be dragged back into that
  stock while rules are on. Ordinary draws, including a short final draw, do
  not consume the allowance.

### Auto-move — the board plays for itself

Two fields, duals of each other, each a `DepotPattern`:

| Field | Meaning |
|---|---|
| `autoSend` | **push** — my top group leaves for the first matching depot that accepts it. Spider's completed King-to-Ace run banks itself: `"autoSend": { "ofType": "Foundation" }` |
| `autoRefill` | **pull** — while I am *empty*, I take the top card of the first matching depot that will release it. Canfield's cleared column: `"autoRefill": { "names": ["reserve"] }` |

Neither declares **any rule of its own**, and that is the whole design. What may lift
is the source's own `ejectRule`; what may land is the target's own `acceptRule`. So a
reflex can only ever perform a move you could have made by hand — it changes *who*
makes the move, never which moves are legal. Spider's tableau needs no extra rule
data: its eject unit already means "a descending run" and its foundation already
means "thirteen cards, King first, into a vacancy", so the only group that can
satisfy both is a finished run.

They fire whenever a card lands anywhere — a drag, a stock **draw**, a **re-deal**
(Spider's stock tap deals a row that can itself drop the finishing Ace) — and
`autoRefill` also answers a vacancy that was already waiting. Only the *opening* deal
is exempt, and undo never re-fires them.

- **`autoSend` offers the largest group first**: the whole depot, then each shorter
  top-anchored group. A target that wants a run gets the run, not its top card.
- **`autoRefill` moves exactly one card.** A depot that wants a run moved into it is
  asking for the push half.
- **A source that runs dry just stops answering**, so the vacancy quietly becomes
  yours to fill — no rule has to say "and once the reserve is gone, fill it yourself".
- **They cascade.** A send that empties a column is exactly what a refill answers to,
  and the board settles before you see it.
- **One undo covers all of it.** The reflexes belong to the action that provoked
  them, so a single undo takes back the lot.
- Turning the rules off suspends them with everything else.

Point `autoSend` at a depot that accepts freely and it will strip the source bare, so
it belongs on a source/target pair whose rules already pin down exactly one group —
which is what a foundation's `seed` + `minCount` do. Two depots that `autoRefill`
from each other will pass a card back and forth until the cascade limit stops them.

### Shared sub-vocabularies

- **`BuildRule`** = `direction` + `step` + `wrap`, **or** `sum`:
  - `direction`: `Up` (default) / `Down` / `Either`
  - `step`: 0–12 (1 = classic adjacent build; 0 = rank-equal pairing games)
  - `wrap`: K↔A modular cycle (Tri Peaks waste, Canfield foundations)
  - `sum` (matcher mode): incoming + anchor pip values (A=1 … K=13) must total N — ignores direction/step/wrap; collapses the matched run face-down. Pyramid is `"sum": 13`; generalizes to Monte Carlo / Fourteen Out.
- **`SuitConstraint`**: `Any` (default), `Same`, `AlternateColor`
- **`DepotPattern`**: match by `ofType` (a category) **or** `names[]` (explicit, exactly-matched list) — set exactly one. Used by `acceptFrom`, `autoSend`, `autoRefill`, and win/loss conditions. Since it is always one or the other, it may be written as just that one: `"Foundation"` is the category, `["reserve"]` the list. A pattern that sets both, sets neither, or matches nothing on the board is refused (see *What validation checks*); where an older design has both, `ofType` is what plays.

---

## Deal steps

`dealRules` is the opening deal: an ordered list of steps run against the shuffled
stock. Omit it and every card simply starts in the stock. `redealRules` is a second
sequence the player fires from a stock tap during play (Spider's deal, La Belle
Lucie's regather-and-redeal); it replays against the live stock each time and tails
off on its own once the stock can't fill it. A depot may not both source the
re-deal and declare a `draw` — one tap, one meaning.

| `kind` | Fields | Meaning |
|---|---|---|
| `dealGroup` | `to[]`, `faceDown`, `faceUp`, `roundRobin`, `from` | the workhorse: deal N face-down then M face-up cards to one or more depots. `roundRobin: true` deals one per depot per pass; otherwise each depot is completed before the next. A single target may be written as the bare name. `from` defaults to the first stock depot. A group stops as soon as the stock is empty, so a count larger than the cards available simply deals what there is. |
| `move` | `from`, `to` | move one card, keeping its current face — the primitive a recorded deal is made of |
| `flipTop` | `depot` | turn that depot's top card face-up in place (one-way) |
| `place` | `rank`, `suit`, `to`, `joker` | pull a **named** card out of the stock wherever it sits and land it face-up (Crazy Quilt's pre-seeded foundations). In a multi-deck game only the first matching copy is pulled. `"joker": true` places any joker instead. |
| `gather` | `from[]`, `to` | sweep every card off each source depot back onto one target, face-down — the inverse of a deal |
| `shuffle` | `depot` | randomly permute that depot's cards in place; pairs with `gather` so a regathered stock is unpredictable |

`redealWhen` guards the re-deal with the same `BoardPredicate` vocabulary the win
conditions use (Spider: `depotsNonEmpty` over the tableau — no column empty when
the stock deals). Null means unconditional.

`maxRedeals` (`int?`, at the top level) limits how many times `redealRules`
may run after the opening deal. Omitted or `null` = unlimited; `0` = none;
`2` = two additional deals. Must be non-negative. One successful batch uses
one allowance, whether it deals a row or gathers, shuffles and redistributes
the board; a short final batch also counts. All trigger stocks share this
setup-wide allowance. A refused tap consumes nothing. The limit and
`redealWhen` must both permit the action.

Both limits are restored by undo/redo and preserved when saving and resuming
a game. A new game resets them. Older saves without counters start with no
recorded uses; previous uses cannot be reconstructed. Exhausting an allowance
disables that action, but does not by itself declare a loss.

### Games that use limited passes

| Game or variant | Encoding | Effect |
|---|---|---|
| La Belle Lucie | `maxRedeals: 2` | two gather/shuffle/re-deal rescues; enforced by the built-in |
| Crazy Quilt | draw `recycle: true, maxRecycles: 1` | one waste recycle; enforced by the built-in. Set `2` for a more generous variant |
| Limited-pass Klondike, Canfield or Double Klondike | draw `recycle: true, maxRecycles: N` | N additional passes; the existing games retain their unlimited setting |
| Spider, Spiderette, Scorpion | no extra limit needed | the existing stocks run out naturally; custom games may additionally cap their row-deal batches with `maxRedeals` |

---

## Setup-wide options

- **`depotOnly`** (bool): drops that don't land on a depot bounce back (no parking between depots). Every ruled built-in sets it. Switched off with the rules.
- **`compoundMoves`**: `Free` (default — any valid run moves as a unit: Klondike / Spider / Yukon) vs `Staged` (FreeCell-family limit `(1 + freeCells) × 2^(emptyColumns)`).
- **`anchor`**: how the camera seats the board when it's smaller than the view — `TopCenter` (default: hangs from the top, centred horizontally) vs `TopLeft` (free-form boards built outward from a corner). Presentation only; no effect on rules.
- **`fanOffsetFaceUp` / `fanOffsetFaceDown`** (`double?`): board-wide fan-step defaults, inherited by any depot that doesn't override them.
- **`description`** (`string?`): player-facing rules prose, Markdown, shown with the game. Never interpreted by the rules, but it is where a game's *conventions* are explained (see *Conventions the rules leave to the player*).
- **`family`** (`string?`): a plain grouping key clustering variants of one game (`"Klondike"`, `"Spider"`). Identity, not prose — never localised.
- **`tools`** — whether the game offers the table modes (the tool island and its keys). `Free` offers them: a table where gathering, fishing and taking several cards at once *is* the game. `None` withholds them — no chips, no keys, no help rows advertising either — for a game whose own rules are meant to be the whole interaction. `Unset` (the default) offers every mode. Switch the rules off and the modes come back, since there is nothing left for the game to defer to.
- `variantAxis` / `variantLabel` / `variantSelections` appear on built-ins that pick a variant from a choice (Klondike's draw count). They are catalog presentation only; drop them from a design you write.

---

## Win & loss conditions

Declarative board-state predicates evaluated after each committed move. The
*presence* of a condition activates detection for that game.

**`winCondition`** — a composable `BoardPredicate`:

- `allCardsIn` (`depots`) — every card on the table sits on a matched depot
- `allCardsFaceUp` — every card on the table is face-up (a "reveal everything" win; turns on face state, not position; takes no pattern). Clock Solitaire's goal.
- `depotsEmpty` (`depots`) — every matched depot is empty
- `depotsNonEmpty` (`depots`) — every matched depot holds ≥1 card (a guard, not usually a win on its own; also backs `redealWhen`)
- `allOf` / `anyOf` (`of[]`) — conjunction / disjunction

**`lossCondition`**:

- `noLegalMoves` — only sound for `depotOnly` single-top-card games: the foundation/clear games (Golf, Tri Peaks, Black Hole) and the `landUnder` reveal games (Clock — a productive self-play, tucking a pile's matching top under to turn up the next, counts as a move). Opt-in; unsound for multi-card-run games.

---

## Conventions the rules leave to the player

Some games carry once-per-game courtesies and setup rituals the vocabulary has no
field for. Rather than grow a bespoke field per game, hand the move to the player as
a convention and say so in the game's `description`: La Belle Lucie's *merci* is the
Fish table mode used once by custom, and Baker's Dozen's "sink the Kings before
play" is Order applied to each King. Nothing enforces either — that is the point. The
rules decide what is *legal*; a convention decides what is *done*.

The table modes that make such moves possible are offered on every design unless its
`tools` says `None`, and always come back when the rules are switched off.

---

## What validation checks

Cardz checks a design before it adds it, and a refused file comes back with every
problem found. First the file —

- it is JSON: a syntax error is reported with its line and column
- it holds a game, in one of the two shapes under *Design files*; an export from a
  newer version of Cardz asks for an update instead
- every value fits its field: a misspelt enum (`"Tablo"`), text where a number goes,
  or a missing required property is reported with its line, column and path
  (`depots[2].type`)
- every shorthand resolves: a `"$name"` is in the `rules` map, and a `repeat` is a whole
  number of at least 1 on a depot placed by `col`/`row` (see *Shorthands*)
- it is a game for one player: a `seats` count above 1, a `seatRange` reaching past
  1, or a `perSeat` depot is refused, because designs are played solo

— then the game. The checks are structural:

- a name; at least one depot; at least one well-formed deck recipe (≥1 copy, non-empty suits and ranks, non-negative jokers); ≤ 208 cards total
- **≤ 256 depots**, counting every copy a `repeat` stamps. Two ceilings bound a board —
  the cards it deals and the piles it sets out — because everything that draws, lays out
  or narrates a board walks both. The largest game Cardz ships sets out 74, so this is a
  bound on the absurd rather than on ambition. A `repeat` that would carry the board past
  it is refused as the repeat, naming the depot, rather than as a finished board
- depot names unique
- every name referenced by a deal step, a `draw`, an `uncoveredBy`, or an
  `acceptFrom` name-list actually exists; a `dealGroup` has a target, and one
  defaulting to the stock has a stock to draw from
- a `place` step names a card the composition actually supplies
- no depot both sources the re-deal and declares a `draw`
- `maxRedeals` and every draw's `maxRecycles` are non-negative when present
- every depot pattern in a `winCondition`, a `redealWhen` guard, an `autoSend`, an
  `autoRefill` or an `acceptFrom` selects exactly one way — `ofType` or `names[]`, never
  both and never neither — and matches at least one depot on the board (an empty
  `names[]`, or an `ofType` no depot uses, is an error). A `names[]` entry no depot
  answers to is reported too, as the unknown-depot check above
- no empty `allOf` / `anyOf` group in a `winCondition` or a `redealWhen`

A `redealWhen` is only checked when `redealRules` exist: a guard on a game with no
re-deal is dropped rather than refused.

Nothing here judges *playability*: a design can be perfectly valid and unwinnable.

---

## Canonical encodings (the vocabulary in practice)

- **Klondike foundation**: `seed: Ace, build: { direction: Up, step: 1 }, suit: Same`, eject `gate: Locked`
- **Klondike stock**: `draw: { to: "waste", count: 1, recycle: true }`, `landFace: Down`, eject `gate: Locked`; the waste is `rejectsAll` with eject `gate: TopOnly` — draws bypass accept rules, so nothing else may land there by hand
- **FreeCell cell**: `emptyOnly, single`; setup `compoundMoves: Staged`. Its stock is `offTable` — a phantom deal source that takes up no table space
- **Spider deck**: one recipe, `suits: ["Spades"], count: 8` (genuine single-suit, 104 cards); the 4-suit variant is a full pack with `count: 2`
- **Spider foundation**: `emptyOnly, seed: King, build: { direction: Down, step: 1 }, minCount: 13`; tableau eject `unit: { kind: Run, build: { direction: Down, step: 1 } }` — the 4-suit variant adds `suit: Same`, so only descending same-suit runs move together; mixed-suit sequences must be broken into legal groups or single cards. The tableau also carries `autoSend: { ofType: "Foundation" }`, and those two rules are what make it fire on a finished run and nothing else
- **Golf**: the shared foundation takes `build: { direction: Either, step: 1 }`; the tableau columns are `rejectsAll` with eject `gate: TopOnly`; the stock draws onto the foundation with no recycle; `lossCondition: noLegalMoves`
- **Pyramid**: slots are `rejectsAll` + eject `gate: FaceUp` + `uncoveredBy` naming the two cards that cover them; the *discard* foundation is `single` + `build: { sum: 13 }`, which is what pairs cards to thirteen; the waste accepts only `acceptFrom: { names: ["stock"] }`
- **Crazy Quilt cell**: deal-only single-card slot (`rejectsAll`, eject `gate: FaceUp`), `uncoveredBy` naming its two short-end neighbours + `uncoveredByAny: true` so it frees when either is gone; foundations split `seed: Ace, build: Up` and `seed: King, build: Down`, both `suit: Same`, over two decks
- **Clock Solitaire**: each hour pile is `rankIs` its hour + `landUnder: true` + a face-down fan offset of 1 — deliver the card, and the pile's next card turns up on top of it; win `allCardsFaceUp`, loss `noLegalMoves`
- **Yukon**: eject `unit: {}` (any group moves regardless of internal order)
- **A foundation under an `Any`-unit source** (Yukon, Scorpion, Flower Garden): add `single: true` to the usual `seed: Ace, build: Up, suit: Same`. A source that declares an eject unit has vouched for the group's internal order, so the target stops checking it — meaning a foundation that accepted groups would take a King buried under twelve unrelated cards as a "complete run". Taking one card at a time closes that off
- **The hand** (Flower Garden's bouquet): eject `unit: { kind: Single }` with the default `Any` gate — reach into the middle of a spread and take just that card, leaving its neighbours in place. Pair with `rejectsAll` for a reserve that only ever empties
- **Canfield foundation**: `seedFromDeal: true, build: { direction: Up, step: 1, wrap: true }, suit: Same`, eject `gate: Locked` — the deal fixes the base rank for all four, and the build wraps K↔A to reach every card. Its tableau adds `autoRefill: { names: ["reserve"] }`, which is the whole of the "an emptied column refills from the reserve" rule: the reserve's `FaceUp` eject releases the card, the column's seedless accept takes it, and an exhausted reserve needs no rule to hand the vacancy back to the player
