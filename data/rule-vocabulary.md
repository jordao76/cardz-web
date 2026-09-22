# Rule & Composition Vocabulary

The complete reference for a Cardz **game file**: a game written as data — its
cards, its board, its rules, its deal and its goal. Every built-in game is written in
exactly this vocabulary, so anything a built-in does, an externally designed game can do. This is a map
of *what can be expressed*: nothing is hardcoded per game.

---

## Game files

A Cardz game file is a JSON file, saved with the `.cardz` extension. Open one in Cardz —
double-click it, or choose **Import…** in *Your games* — and Cardz adds it to *Your games*.

A file holds the game in one of two formats:

- **The game itself** — an object with `name` and `depots` at the top.
- **An exported game** — what Cardz writes when you export one:
  `{ "schemaVersion": 1, "setup": { …the game… } }`.

The following example shows a small but complete game — a four-column relative of Klondike.
In the next sections, you'll learn about the syntax elements of a game file.

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

## The canonical JSON format

High-level guidelines on the expected JSON elements.

- **Required properties**: `name` and `depots` at the top level, and `type`
  on every depot.
- **Property names are camelCase**:
  `"name"`, `"decks"`, `"depots"`, `"acceptRule"`, `"minCount"`. They are matched
  case-insensitively, so a game written in PascalCase still loads — but camelCase
  is the spelling Cardz writes, and the preferred one.
- **Enum values are capitalised**: `"Tableau"`,
  `"Foundation"`, `"Down"`, `"AlternateColor"`, `"Spades"`, `"Ace"`, `"Ten"`,
  `"King"`, spelled out in full. They are matched case-insensitively (`"tableau"` works),
  but the capitalised form is preferred.
- **Unions carry a `"kind"` discriminator** — deal steps
  (`"dealGroup"`, `"move"`, `"flipTop"`, `"place"`, `"gather"`, `"shuffle"`) and
  win/loss predicates (`"allCardsIn"`, `"noLegalMoves"`, …):
  `{ "kind": "allCardsIn", "depots": { "ofType": "Foundation" } }`.
- **Optional properties may be omitted** and take the default
  named in the tables below.
- A handful of fields take a **shorthand** as well — see the *Shorthands* section below.

---

## Top-level properties

The properties of the game object itself.

Required properties:

- **`name`**: the name of the game.
- **`depots`**: the places in the board that hold cards, see the **Depot**-related sections below.

Optional properties:

- **`decks`**: the set of cards for the game, see the **Deck Composition** section below. Omitted, the game is dealt one standard 52-card deck.
- **`depotOnly`** (bool): card drops that don't land on a depot bounce back (no parking between depots). Ruled games should generally set it. Switched off when rules are off.
- **`compoundMoves`**: `Free` (default — any valid run moves as a unit: Klondike / Spider / Yukon) vs `Staged` (FreeCell-family limit `(1 + freeCells) × 2^(emptyColumns)`).
- **`anchor`**: how the camera seats the board — `TopCenter` (default) vs `TopLeft`. Presentation only; no effect on rules.
- **`fanOffsetFaceUp` / `fanOffsetFaceDown`** (`double?`): board-wide fan-step defaults for face up and face down cards, inherited by any depot that doesn't override them.
- **`description`** (`string?`): player-facing game description, in Markdown, shown with the game. Prose only, not interpreted by the rules.
- **`family`** (`string?`): a grouping key that relates games — Putt Putt is in the `"Golf"` family, Double Klondike in the `"Klondike"` family. An exact-string key, not prose; it says nothing about how a game is built.
- **`tools`** — whether the game offers the table modes (the tool island and its keys). `Free` offers them; `None` withholds them — no chips, no keys, no help rows advertising either — for a game whose own rules are meant to be the whole interaction. `Unset` (the default) offers every mode. The modes come back when rules are off.
- **`dealRules`**/**`redealRules`**/**`redealWhen`**/**`maxRedeals`**: deal and redeal definitions, see the corresponding sections below.
- **`winCondition`**/**`lossCondition`**: see the **Win & loss conditions** section below.
- **`rules`**: reusable rules, see the **Shorthands** section below.

---

## Deck composition

The top level element `decks` defines the **deck composition**, encoding the full set of cards a game is comprised of. It is a list of *deck recipes*, or *packs*; the final deal pile is made from every pack expanded, concatenated, and then shuffled.

Each *pack* can have the following elements:

| Field | Type | Default | Notes |
|---|---|---|---|
| `suits` | `["Clubs","Diamonds","Hearts","Spades"]` | all four | narrow for single-/two-suit packs |
| `ranks` | `["Ace","Two"…"Ten","Jack","Queen","King"]` | Ace–King | drop entries for stripped decks (no courts, no aces, 32-cards) |
| `count` | `int` | `1` | identical copies of this pack |
| `jokers` | `int` | `0` | jokers per copy. A joker has no rank or suit, so no ruled depot accepts one unless its accept rule says `wildJoker` |

A recipe's card total is `(suits × ranks + jokers) × count`. A game's whole
composition may deal at most **208 cards** (four standard decks). Examples:

- **Standard**: leave `decks` out, or write `"decks": [ {} ]` → 52. Two full decks: `[ { "count": 2 } ]` → 104.
- **Spider 1-suit**: `[ { "suits": ["Spades"], "count": 8 } ]` → 104 spades.
- **Spider 2-suit**: `[ { "suits": ["Spades","Hearts"], "count": 4 } ]`.
- **Stripped 32-card** (7–Ace): `"ranks": ["Seven","Eight","Nine","Ten","Jack","Queen","King","Ace"]`.

Card backs come in two styles; copies alternate them by parity.

---

## Depots — topology & placement

The **depots** are the places in the board where cards can be parked. Think tableaus, foundations, waste, discard, cells, etc.

The top level `depots` element is a list of depots. Each depot's geometry and how cards are structured by it are controlled by the following properties:

| Axis | Values | Notes |
|---|---|---|
| `type` | `Stock`, `Waste`, `Foundation`, `Tableau`, `Cell`, `Reserve`, `Layout` | depot category; drives defaults + win-pattern matching. Every game must have at least one `Stock`, where the deck is initially placed. `Layout` marks a rule-free landing spot placed in Sandbox, not for ruled games. |
| `fanDirection` | `None`, `Down`, `Up`, `Left`, `Right`, `Radial` | `None` = squared pile; `Radial` = held-hand arc (La Belle Lucie / poker hand). Default depends on the type: `Down` for a `Tableau`, `None` for every other type. |
| `fanWindow` | `int?` | fan only the top N, the rest stays squared at base (ignored by `Radial`, which arcs the whole depot) |
| placement | `col`/`row` (grid, fractional) or `x`/`y` (px), `angle` (**radians**) | px wins over grid |
| `name` | `string?` | stable id; required for any depot referred to by a deal step, `draw`, `uncoveredBy`, or a `names[]` pattern. Must be unique. |
| `landFace` | `Up`, `Down` | face every arriving card takes on a successful drop; null keeps the face it arrived with |
| `fanOffsetFaceUp` / `fanOffsetFaceDown` | `double?` | fans have default offsets for face up and face down cards; these properties allow overriding them (in px) |
| flags | `offTable`, `landUnder`, `autoFlipTop`, `autoFlipUncovered`, `uncoveredBy[]`, `uncoveredByAny` | phantom deal-source stock (outside the viewport); tuck-under drop; reveal-on-removal; reveal-when-siblings-empty (Tri Peaks). `uncoveredBy` lists depots that must empty before this depot's top card lifts: all of them by default (Tri Peaks peaks), or — with `uncoveredByAny: true` — any one of them (Crazy Quilt's woven cells, free when either short end is exposed) |
| `looseOrder` | `bool` | the order of the cards is a player preference, not game state, so a plain drag **sorts along the fan** and lifts only once it leaves it. True for a held hand and for a fanned reserve any card is playable from (Flower Garden's bouquet) |

---

## Depot — rules

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
game declares that the depot asks, never what was answered. The call is made with
the move that plays the wild card, stands only while that card is the depot's top
card, and is shown on the depot. `"free"` takes no call.

Pick `"free"` for a depot whose wild card is a **joker**. A joker carries neither
rank nor suit, so nothing can relate to it: under the other two modes a joker
landing on a `follow` depot walls the pile off until another joker is played.
`"free"` also reaches the internal pairs of an arriving run, so a wild card partway
up a multi-card drop frees the card above it too.

### Eject rules — pickup policy

Two sub-parts: `gate` (which single item may be grabbed) + `unit` (what leaves
together).

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
  passes through the stock. It works with `recycle: true`, belongs to this
  stock alone, and counts only recycles.

### Auto-move — the board plays for itself

Two fields, duals of each other, each a `DepotPattern`:

| Field | Meaning |
|---|---|
| `autoSend` | **push** — my top group leaves for the first matching depot that accepts it. Spider's completed King-to-Ace run banks itself: `"autoSend": { "ofType": "Foundation" }` |
| `autoRefill` | **pull** — while I am *empty*, I take the top card of the first matching depot that will release it. Canfield's cleared column: `"autoRefill": { "names": ["reserve"] }` |

Neither declares **any rule of its own**, and that is the whole game. What may lift
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
  - `direction`: `Up` / `Down` / `Either`, required, since a build has no default direction (a `sum` needs none)
  - `step`: 0–12 (1 = classic adjacent build; 0 = rank-equal pairing games)
  - `wrap`: K↔A modular cycle (Tri Peaks waste, Canfield foundations)
  - `sum` (matcher mode): incoming + anchor pip values (A=1 … K=13) must total N — ignores direction/step/wrap; collapses the matched run face-down. Pyramid is `"sum": 13`; generalizes to Monte Carlo / Fourteen Out.
- **`SuitConstraint`**: `Any` (default), `Same`, `AlternateColor`
- **`DepotPattern`**: match by `ofType` (a category) **or** `names[]` (explicit, exactly-matched list) — set exactly one. Used by `acceptFrom`, `autoSend`, `autoRefill`, and win/loss conditions. Since it is always one or the other, it may be written as just that one: `"Foundation"` is the category, `["reserve"]` the list.

---

## Deal steps

`dealRules` is the opening deal: an ordered list of steps run against the shuffled
stock. Omit it and every card simply starts in the stock. `redealRules` is a second
sequence the player fires from a stock tap during play (Spider's deal, La Belle
Lucie's regather-and-redeal); it replays against the live stock each time and tails
off on its own once the stock can't fill it.

| `kind` | Fields | Meaning |
|---|---|---|
| `dealGroup` | `to[]`, `faceDown`, `faceUp`, `roundRobin`, `from` | the workhorse: deal N face-down then M face-up cards to one or more depots. `roundRobin: true` deals one per depot per pass; otherwise each depot is completed before the next. A single target may be written as the bare name. `from` defaults to the first stock depot. A group stops as soon as the stock is empty, so a count larger than the cards available simply deals what there is. |
| `move` | `from`, `to` | move one card, keeping its current face — the primitive a recorded deal is made of |
| `flipTop` | `depot` | turn that depot's top card face-up in place (one-way) |
| `place` | `rank`, `suit`, `to`, `joker` | pull a **named** card out of the stock wherever it sits and land it face-up (Crazy Quilt's pre-seeded foundations). In a multi-deck game only the first matching copy is pulled. `rank` and `suit` are both required, since a card has no default; `"joker": true` places any joker instead, and names neither. |
| `gather` | `from[]`, `to` | sweep every card off each source depot back onto one target, face-down — the inverse of a deal |
| `shuffle` | `depot` | randomly permute that depot's cards in place; pairs with `gather` so a regathered stock is unpredictable |

`redealWhen` guards the re-deal with the same `BoardPredicate` vocabulary the win
conditions use (Spider: `depotsNonEmpty` over the tableau — no column empty when
the stock deals). Null means unconditional.

`maxRedeals` (`int?`, at the top level) limits how many times `redealRules`
may run after the opening deal. Omitted or `null` = unlimited; `0` = none;
`2` = two additional deals. One successful batch uses
one allowance, whether it deals a row or gathers, shuffles and redistributes
the board; a short final batch also counts. All trigger stocks share this one
allowance. The limit and
`redealWhen` must both permit the action.

Both limits are restored by undo/redo and preserved when saving and resuming
a game. A new game resets them. Exhausting an allowance disables that action.

### Games that use limited passes

| Game | Encoding | Effect |
|---|---|---|
| La Belle Lucie | `maxRedeals: 2` | two gather/shuffle/re-deal rescues |
| Crazy Quilt | draw `recycle: true, maxRecycles: 1` | one waste recycle; set `2` for a more generous game |
| Limited-pass Klondike, Canfield or Double Klondike | draw `recycle: true, maxRecycles: N` | N additional passes; the built-in games leave it unlimited |
| Spider, Spiderette, Scorpion | no extra limit needed | the stock runs out naturally; a game may still cap its row-deal batches with `maxRedeals` |

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

## Shorthands

The following spellings are accepted as shorthands for the corresponding long forms.

| Where | Shorthand | Means |
|---|---|---|
| a depot's `fanDirection` | *omitted* | the default for its `type` — `"Down"` for `Tableau`, `"None"` for all others |
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

Also `repeat` to create many depots; and `rules` to create reusable rules:

**`repeat`** on a depot creates that many copies of it. Names take a 1-based suffix on
the stem — `"name": "column", "repeat": 7` gives `column-1` … `column-7` — and each copy
sits one grid column right of the last, so a row of columns or foundations can be created with a single entry. It steps along `col`/`row` placement.

**`rules`**, at the top level, names a rule that can be reused:

```
"rules": {
  "column": { "seed": "King", "build": { "direction": "Down", "step": 1 }, "suit": "AlternateColor" }
},
"depots": [
  { "name": "column", "type": "Tableau", "col": 0, "row": 1, "repeat": 7, "acceptRule": "$column" }
]
```

A name works for either type of rule — `acceptRule` or `ejectRule`.

Cardz stores and exports the long form, so a file imported in shorthand comes back expanded.

---

## Conventions the rules leave to the player

Some games carry once-per-game courtesies and setup rituals the vocabulary has no
field for. Rather than grow a bespoke field per game, hand the move to the player as
a convention and say so in the game's `description`: La Belle Lucie's *merci* is the
Fish table mode used once by custom, and Baker's Dozen's "sink the Kings before
play" is Order applied to each King. Nothing enforces either — that is the point. The
rules decide what is *legal*; a convention decides what is *done*.

The table modes that make such moves possible are offered by default unless its
`tools` says `None`, and always come back when the rules are switched off.

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
