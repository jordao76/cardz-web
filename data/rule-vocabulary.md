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

- **The game itself** — an object with `Name`, `Decks` and `Depots` at the top. This
  is the shape to write.
- **An exported design** — what Cardz writes when you export one:
  `{ "SchemaVersion": 1, "Setup": { …the game… } }`. The `Id` and timestamps an
  export carries are optional; Cardz gives every design it brings in a fresh identity.

Designs are played solo. The surest way to start is from a working game: take one
close to what you want, change it, and give it a new `Name`.

A small but complete game — a four-column patience:

```json
{
  "Name": "Pocket Patience",
  "Description": "Build each suit up from Ace on the foundations. Columns build down in alternating colours, and only a King fills an empty column.",
  "Decks": [ {} ],
  "DepotOnly": true,
  "Depots": [
    { "Name": "stock", "Type": "Stock", "FanDirection": "None", "Col": 0, "Row": 0,
      "Draw": { "To": "waste", "Count": 1, "Recycle": true },
      "LandFace": "Down", "EjectRule": { "Gate": "Locked" } },
    { "Name": "waste", "Type": "Waste", "FanDirection": "None", "Col": 1, "Row": 0,
      "AcceptRule": { "RejectsAll": true }, "EjectRule": { "Gate": "TopOnly" } },
    { "Name": "foundation-1", "Type": "Foundation", "FanDirection": "None", "Col": 3, "Row": 0,
      "AcceptRule": { "Seed": "Ace", "Build": { "Direction": "Up", "Step": 1 }, "Suit": "Same" },
      "EjectRule": { "Gate": "Locked" } },
    { "Name": "foundation-2", "Type": "Foundation", "FanDirection": "None", "Col": 4, "Row": 0,
      "AcceptRule": { "Seed": "Ace", "Build": { "Direction": "Up", "Step": 1 }, "Suit": "Same" },
      "EjectRule": { "Gate": "Locked" } },
    { "Name": "foundation-3", "Type": "Foundation", "FanDirection": "None", "Col": 5, "Row": 0,
      "AcceptRule": { "Seed": "Ace", "Build": { "Direction": "Up", "Step": 1 }, "Suit": "Same" },
      "EjectRule": { "Gate": "Locked" } },
    { "Name": "foundation-4", "Type": "Foundation", "FanDirection": "None", "Col": 6, "Row": 0,
      "AcceptRule": { "Seed": "Ace", "Build": { "Direction": "Up", "Step": 1 }, "Suit": "Same" },
      "EjectRule": { "Gate": "Locked" } },
    { "Name": "column-1", "Type": "Tableau", "FanDirection": "Down", "Col": 0, "Row": 1, "AutoFlipTop": true,
      "AcceptRule": { "Seed": "King", "Build": { "Direction": "Down", "Step": 1 }, "Suit": "AlternateColor" },
      "EjectRule": { "Gate": "FaceUp" } },
    { "Name": "column-2", "Type": "Tableau", "FanDirection": "Down", "Col": 1, "Row": 1, "AutoFlipTop": true,
      "AcceptRule": { "Seed": "King", "Build": { "Direction": "Down", "Step": 1 }, "Suit": "AlternateColor" },
      "EjectRule": { "Gate": "FaceUp" } },
    { "Name": "column-3", "Type": "Tableau", "FanDirection": "Down", "Col": 2, "Row": 1, "AutoFlipTop": true,
      "AcceptRule": { "Seed": "King", "Build": { "Direction": "Down", "Step": 1 }, "Suit": "AlternateColor" },
      "EjectRule": { "Gate": "FaceUp" } },
    { "Name": "column-4", "Type": "Tableau", "FanDirection": "Down", "Col": 3, "Row": 1, "AutoFlipTop": true,
      "AcceptRule": { "Seed": "King", "Build": { "Direction": "Down", "Step": 1 }, "Suit": "AlternateColor" },
      "EjectRule": { "Gate": "FaceUp" } }
  ],
  "DealRules": [
    { "kind": "dealGroup", "To": ["column-1", "column-2", "column-3", "column-4"], "FaceDown": 2, "FaceUp": 1 }
  ],
  "WinCondition": { "kind": "allCardsIn", "Depots": { "OfType": "Foundation" } }
}
```

---

## The canonical JSON shape

Read this first — the format is exact, and the friendlier spellings a card-game
schema might suggest are not accepted.

- **Property names are PascalCase**, exactly as the tables below spell them:
  `"Name"`, `"Decks"`, `"Depots"`, `"AcceptRule"`, `"MinCount"`. A camelCase key is
  silently ignored, so a camelCase design fails as "missing required properties
  Name, Decks, Depots".
- **Enum values are strings naming the member**: `"Tableau"`, `"Foundation"`,
  `"Down"`, `"AlternateColor"`, `"Spades"`, `"Ace"`, `"Ten"`, `"King"`. These *are*
  matched case-insensitively (`"tableau"` works), but abbreviations are not:
  `"S"`, `"A"`, `"10"` all fail.
- **Unions carry a lowerCamel `"kind"` discriminator** — deal steps
  (`"dealGroup"`, `"move"`, `"flipTop"`, `"place"`, `"gather"`, `"shuffle"`) and
  win/loss predicates (`"allCardsIn"`, `"noLegalMoves"`, …). Everything *inside*
  the object stays PascalCase: `{ "kind": "allCardsIn", "Depots": { "OfType": "Foundation" } }`.
- **Required properties**: `Name`, `Decks`, `Depots` at the top level, and `Type`
  + `FanDirection` on every depot. Omitting one fails the parse outright.
- **Everything else may be omitted** (or sent as `null`) and takes the default
  named in the tables below — `{ "Direction": "Down" }` is the adjacent build,
  `{}` is a standard 52-card deck recipe, `"Unit": {}` takes any group. Omitting
  a field and writing its default are the same thing, so a partial object is
  always safe to send.
- There is **no terse form**: a rule is always an object. `"AcceptRule": "none"` is
  rejected; write `"AcceptRule": { "RejectsAll": true }`.
- **Unknown properties are ignored**, so a `"$schema"` line may point an editor at
  the published schema, `https://cardz.roderic.dev/designs/schema.json`, for
  completion and checking as you type.

---

## Deck composition

The cards a game is dealt from. `Decks` is a list of **`DeckSpec`** recipes; the
deal pile is every recipe expanded and concatenated, then shuffled.

| Field | Type | Default | Notes |
|---|---|---|---|
| `Suits` | `["Clubs","Diamonds","Hearts","Spades"]` | all four | narrow for single-/two-suit packs |
| `Ranks` | `["Ace","Two"…"Ten","Jack","Queen","King"]` | Ace–King | drop entries for stripped decks (no courts, no aces, 32-card) |
| `Count` | `int` | `1` | identical copies of this pack |
| `Jokers` | `int` | `0` | inert jokers per copy — they occupy the board but satisfy no build/seed/suit/rank rule, so a ruled depot never accepts one |

A recipe's card total is `(suits × ranks + jokers) × count`. A design's whole
composition may deal at most **208 cards** (four standard decks); a larger total is
refused. Examples:

- **Standard**: `"Decks": [ {} ]` → 52. Two full decks: `[ { "Count": 2 } ]` → 104.
- **Spider 1-suit**: `[ { "Suits": ["Spades"], "Count": 8 } ]` → 104 spades.
- **Spider 2-suit**: `[ { "Suits": ["Spades","Hearts"], "Count": 4 } ]`.
- **Stripped 32-card** (7–Ace): `"Ranks": ["Seven","Eight","Nine","Ten","Jack","Queen","King","Ace"]`.
- **No courts / no aces**: drop those ranks from `Ranks`.

Card backs come in two styles; copies alternate them by parity, so composition
never changes back rendering.

---

## Depots — topology & placement

The board itself. Pure geometry, no rules.

| Axis | Values | Notes |
|---|---|---|
| `Type` | `Stock`, `Waste`, `Foundation`, `Tableau`, `Cell`, `Reserve` | authored category; drives defaults + win-pattern matching. A seventh value, `Layout`, marks a rule-free landing spot placed in Sandbox — don't author one, but expect to read them: a layout kept from Sandbox is made of them, and carries no deal or goal either. Give such a slot one of the six categories when you add rules to it. |
| `FanDirection` | `None`, `Down`, `Up`, `Left`, `Right`, `Radial` | `None` = squared pile; `Radial` = held-hand arc, whole depot, centred on the slot (La Belle Lucie / poker hand). Required field: give `Tableau` its `"Down"` explicitly. |
| `FanWindow` | `int?` | fan only the top N, rest squared at base (ignored by `Radial`, which always arcs the whole depot) |
| placement | `Col`/`Row` (grid, fractional) or `X`/`Y` (px), `Angle` (**radians**) | px wins over grid |
| `Name` | `string?` | stable id; required for any depot a deal step, `Draw`, `UncoveredBy`, or a `Names[]` pattern refers to. Must be unique. |
| `LandFace` | `Up`, `Down` | face every arriving card takes on a successful drop; null keeps the face it arrived with |
| `FanOffsetFaceUp` / `FanOffsetFaceDown` | `double?` | per-depot override of the fan step in px (Clock's near-squared hour piles use `1`) |
| flags | `OffTable`, `LandUnder`, `AutoFlipTop`, `AutoFlipUncovered`, `UncoveredBy[]`, `UncoveredByAny` | phantom deal-source stock; tuck-under drop (turns the exposed top card face-up); reveal-on-removal; reveal-when-siblings-empty (Tri Peaks). `UncoveredBy` lists depots that must empty before this depot's top card lifts: all of them by default (Tri Peaks peaks), or — with `UncoveredByAny: true` — any one of them (Crazy Quilt's woven cells, free when either short end is exposed) |
| `LooseOrder` | `bool` | this pile's resting order is a player preference, not game state, so a plain drag **sorts along the fan** and lifts only once it leaves it. True for a held hand and for a fanned reserve any card is playable from (Flower Garden's bouquet). Declare it only where nothing can read the order — a depot that accepts a build, or releases only its top card, is not a candidate |

---

## Per-depot rules

Two halves: **Accept** (can a drop land here?) and **Eject** (can cards be picked
up from here?). Plus two per-depot actions — a **Draw** the player taps, and the
**Auto-move** reflexes the depot performs itself. Turning a game's rules off in
Cardz switches every per-depot rule off at once, so every depot accepts and releases
cards freely.

### Accept rules — drop policy

Composable flags; the default (`"AcceptRule": null`) is fully free-form. All
declared checks must pass together (AND).

| Field | Meaning |
|---|---|
| `RejectsAll` | never a drop target — deal-only depots (Klondike's waste, Golf's tableau) |
| `EmptyOnly` | accept only into a vacancy (single-card holder slots) |
| `Single` | reject piles larger than one card |
| `MinCount` (`int?`) | reject piles smaller than N (lower bound; e.g. Spider foundation `MinCount: 13`) |
| `Seed` (`Rank?`) | first (base) card must be this rank (Ace / King foundations) |
| `SeedNone` | reject all drops while empty (build-while-occupied, stay-empty-once-cleared) |
| `SeedFromDeal` | seed rank set by the deal, not the author (Canfield); resolved at deal time |
| `RankIs` (`Rank?`) | **absolute** rank gate — accept only this rank, whatever the depot holds and whether or not it's empty. Every card of an incoming pile must match. Clock Solitaire's hour piles (1 o'clock takes only Aces …) |
| `Build` (`BuildRule?`) | rank relationship to the depot's top card |
| `Suit` (`SuitConstraint`) | suit relationship to the top card |
| `Follow` (`bool`) | incoming card must match the top card's rank **or** suit — the shedding-family follow rule; the one disjunction `Build`+`Suit` (which compose as AND) can't spell. No effect while empty |
| `WildRank` (`Rank?`) | a card of this rank is wild: it lands on any top card, ignoring `Follow`/`Build`/`Suit`. Pile-shape and `RankIs` gates still apply |
| `WildJoker` (`bool`) | a joker is wild rather than inert: it lands on any top card (rummy/canasta shedding). Same escape hatch as `WildRank`, keyed on the joker |
| `WildDeclares` (`"none"` / `"suit"` / `"free"`) | what a **wild** card left on top of this depot does to whatever follows it — the complement to `WildRank`, which frees the wild card as the *incoming* card. `"suit"` lets the player who landed it *name* the suit the next card must follow; the call replaces the top card's own suit in the `Follow` check, so what stands is "the called suit, or another wild card". `"free"` lets **anything** land on the wild card, no suit named. Default `"none"`: the next card follows the wild card as printed. `true` is accepted as a spelling of `"suit"` |
| `AcceptFrom` (`DepotPattern?`) | only accept drops from matching source depot(s) |
| `AllowFaceDown` | whitelist face-down drops (ruled depots reject them by default) |

The suit a player *calls* on a `WildDeclares: "suit"` depot is not authorable — a
design declares that the depot asks, never what was answered. The call is made with
the move that plays the wild card, stands only while that card is the depot's top
card, and is shown on the depot. `"free"` takes no call.

Pick `"free"` for a depot whose wild card is a **joker**. A joker carries neither
rank nor suit, so nothing can relate to it: under the other two modes a joker
landing on a `Follow` depot walls the pile off until another joker is played.
`"free"` also reaches the internal pairs of an arriving run, so a wild card partway
up a multi-card drop frees the card above it too.

### Eject rules — pickup policy

Two sub-parts: `Gate` (which single item may be grabbed) + `Unit` (what leaves
together). A refused pickup is silently ignored.

- **`Gate`**: `Any` (default), `Locked` (foundations), `FaceUp`, `TopOnly` (Golf — forbids grabbing a face-up run as a group)
- **`Unit`** — an object `{ "Kind": …, "Build": …, "Suit": … }`:
  - `Single` — cards leave **one at a time**: grabbing any card takes exactly that card, its pile-mates above stay put (a *hand*, where any card may be played alone)
  - `Any` — any group regardless of internal order (Yukon). `"Unit": {}` means this, since `Any` is `Kind`'s default
  - `Run` — with `Build` (and optionally `Suit`), a group must form that run (Spider's descending run; the 4-suit variant adds `"Suit": "Same"`)
- Declaring a `Unit` moves internal-order responsibility to the *source* depot; the receiving depot then judges only the group's bottom card.

### Draw — tap the stock

A draw is a *deal*, not a player move, so the target's accept rule is never
consulted. Declaring a draw also stops the depot being offered as a drop target;
pair it with `"EjectRule": { "Gate": "Locked" }` so cards leave only through the tap.

- `To` — target depot the drawn cards land on (face-up)
- `Count` — cards moved per tap (Klondike Draw-3 is `"Count": 3`); a short stock draws whatever remains
- `Recycle` — tapping when empty pulls the whole `To` pile back, order reversed and face-down (Klondike's ↺); false = single pass (Forty Thieves, Golf, Tri Peaks)

### Auto-move — the board plays for itself

Two fields, duals of each other, each a `DepotPattern`:

| Field | Meaning |
|---|---|
| `AutoSend` | **push** — my top group leaves for the first matching depot that accepts it. Spider's completed King-to-Ace run banks itself: `"AutoSend": { "OfType": "Foundation" }` |
| `AutoRefill` | **pull** — while I am *empty*, I take the top card of the first matching depot that will release it. Canfield's cleared column: `"AutoRefill": { "Names": ["reserve"] }` |

Neither declares **any rule of its own**, and that is the whole design. What may lift
is the source's own `EjectRule`; what may land is the target's own `AcceptRule`. So a
reflex can only ever perform a move you could have made by hand — it changes *who*
makes the move, never which moves are legal. Spider's tableau needs no extra rule
data: its eject unit already means "a descending run" and its foundation already
means "thirteen cards, King first, into a vacancy", so the only group that can
satisfy both is a finished run.

They fire whenever a card lands anywhere — a drag, a stock **draw**, a **re-deal**
(Spider's stock tap deals a row that can itself drop the finishing Ace) — and
`AutoRefill` also answers a vacancy that was already waiting. Only the *opening* deal
is exempt, and undo never re-fires them.

- **`AutoSend` offers the largest group first**: the whole depot, then each shorter
  top-anchored group. A target that wants a run gets the run, not its top card.
- **`AutoRefill` moves exactly one card.** A depot that wants a run moved into it is
  asking for the push half.
- **A source that runs dry just stops answering**, so the vacancy quietly becomes
  yours to fill — no rule has to say "and once the reserve is gone, fill it yourself".
- **They cascade.** A send that empties a column is exactly what a refill answers to,
  and the board settles before you see it.
- **One undo covers all of it.** The reflexes belong to the action that provoked
  them, so a single undo takes back the lot.
- Turning the rules off suspends them with everything else.

Point `AutoSend` at a depot that accepts freely and it will strip the source bare, so
it belongs on a source/target pair whose rules already pin down exactly one group —
which is what a foundation's `Seed` + `MinCount` do. Two depots that `AutoRefill`
from each other will pass a card back and forth until the cascade limit stops them.

### Shared sub-vocabularies

- **`BuildRule`** = `Direction` + `Step` + `Wrap`, **or** `Sum`:
  - `Direction`: `Up` (default) / `Down` / `Either`
  - `Step`: 0–12 (1 = classic adjacent build; 0 = rank-equal pairing games)
  - `Wrap`: K↔A modular cycle (Tri Peaks waste, Canfield foundations)
  - `Sum` (matcher mode): incoming + anchor pip values (A=1 … K=13) must total N — ignores Direction/Step/Wrap; collapses the matched run face-down. Pyramid is `"Sum": 13`; generalizes to Monte Carlo / Fourteen Out.
- **`SuitConstraint`**: `Any` (default), `Same`, `AlternateColor`
- **`DepotPattern`**: match by `OfType` (a category) **or** `Names[]` (explicit, exactly-matched list) — set exactly one. Used by `AcceptFrom`, `AutoSend`, `AutoRefill`, and win/loss conditions. A pattern that sets both, sets neither, or matches nothing on the board is refused (see *What validation checks*); where an older design has both, `OfType` is what plays.

---

## Deal steps

`DealRules` is the opening deal: an ordered list of steps run against the shuffled
stock. Omit it and every card simply starts in the stock. `RedealRules` is a second
sequence the player fires from a stock tap during play (Spider's deal, La Belle
Lucie's regather-and-redeal); it replays against the live stock each time and tails
off on its own once the stock can't fill it. A depot may not both source the
re-deal and declare a `Draw` — one tap, one meaning.

| `kind` | Fields | Meaning |
|---|---|---|
| `dealGroup` | `To[]`, `FaceDown`, `FaceUp`, `RoundRobin`, `From` | the workhorse: deal N face-down then M face-up cards to one or more depots. `RoundRobin: true` deals one per depot per pass; otherwise each depot is completed before the next. `From` defaults to the first stock depot. |
| `move` | `From`, `To` | move one card, keeping its current face — the primitive a recorded deal is made of |
| `flipTop` | `Depot` | turn that depot's top card face-up in place (one-way) |
| `place` | `Rank`, `Suit`, `To`, `Joker` | pull a **named** card out of the stock wherever it sits and land it face-up (Crazy Quilt's pre-seeded foundations). In a multi-deck game only the first matching copy is pulled. `"Joker": true` places any joker instead. |
| `gather` | `From[]`, `To` | sweep every card off each source depot back onto one target, face-down — the inverse of a deal |
| `shuffle` | `Depot` | randomly permute that depot's cards in place; pairs with `gather` so a regathered stock is unpredictable |

`RedealWhen` guards the re-deal with the same `BoardPredicate` vocabulary the win
conditions use (Spider: `depotsNonEmpty` over the tableau — no column empty when
the stock deals). Null means unconditional.

---

## Setup-wide options

- **`DepotOnly`** (bool): drops that don't land on a depot bounce back (no parking between depots). Every ruled built-in sets it. Switched off with the rules.
- **`CompoundMoves`**: `Free` (default — any valid run moves as a unit: Klondike / Spider / Yukon) vs `Staged` (FreeCell-family limit `(1 + freeCells) × 2^(emptyColumns)`).
- **`Anchor`**: how the camera seats the board when it's smaller than the view — `TopCenter` (default: hangs from the top, centred horizontally) vs `TopLeft` (free-form boards built outward from a corner). Presentation only; no effect on rules.
- **`FanOffsetFaceUp` / `FanOffsetFaceDown`** (`double?`): board-wide fan-step defaults, inherited by any depot that doesn't override them.
- **`Description`** (`string?`): player-facing rules prose, Markdown, shown with the game. Never interpreted by the rules, but it is where a game's *conventions* are explained (see *Conventions the rules leave to the player*).
- **`Family`** (`string?`): a plain grouping key clustering variants of one game (`"Klondike"`, `"Spider"`). Identity, not prose — never localised.
- **`Tools`** — whether the game offers the table modes (the tool island and its keys). `Free` offers them: a table where gathering, fishing and taking several cards at once *is* the game. `None` withholds them — no chips, no keys, no help rows advertising either — for a game whose own rules are meant to be the whole interaction. `Unset` (the default) offers every mode. Switch the rules off and the modes come back, since there is nothing left for the game to defer to.
- `VariantAxis` / `VariantLabel` / `VariantSelections` appear on built-ins that pick a variant from a choice (Klondike's draw count). They are catalog presentation only; drop them from a design you write.

---

## Win & loss conditions

Declarative board-state predicates evaluated after each committed move. The
*presence* of a condition activates detection for that game.

**`WinCondition`** — a composable `BoardPredicate`:

- `allCardsIn` (`Depots`) — every card on the table sits on a matched depot
- `allCardsFaceUp` — every card on the table is face-up (a "reveal everything" win; turns on face state, not position; takes no pattern). Clock Solitaire's goal.
- `depotsEmpty` (`Depots`) — every matched depot is empty
- `depotsNonEmpty` (`Depots`) — every matched depot holds ≥1 card (a guard, not usually a win on its own; also backs `RedealWhen`)
- `allOf` / `anyOf` (`Of[]`) — conjunction / disjunction

**`LossCondition`**:

- `noLegalMoves` — only sound for `DepotOnly` single-top-card games: the foundation/clear games (Golf, Tri Peaks, Black Hole) and the `LandUnder` reveal games (Clock — a productive self-play, tucking a pile's matching top under to turn up the next, counts as a move). Opt-in; unsound for multi-card-run games.

---

## Conventions the rules leave to the player

Some games carry once-per-game courtesies and setup rituals the vocabulary has no
field for. Rather than grow a bespoke field per game, hand the move to the player as
a convention and say so in the game's `Description`: La Belle Lucie's *merci* is the
Fish table mode used once by custom, and Baker's Dozen's "sink the Kings before
play" is Order applied to each King. Nothing enforces either — that is the point. The
rules decide what is *legal*; a convention decides what is *done*.

The table modes that make such moves possible are offered on every design unless its
`Tools` says `None`, and always come back when the rules are switched off.

---

## What validation checks

Cardz checks a design before it adds it, and a refused file comes back with every
problem found. First the file —

- it is JSON: a syntax error is reported with its line and column
- it holds a game, in one of the two shapes under *Design files*; an export from a
  newer version of Cardz asks for an update instead
- every value fits its field: a misspelt enum (`"Tablo"`), text where a number goes,
  or a missing required property is reported with its line, column and path
  (`Depots[2].Type`)
- it is a game for one player: a `Seats` count above 1, a `SeatRange` reaching past
  1, or a `PerSeat` depot is refused, because designs are played solo

— then the game. The checks are structural:

- a name; at least one depot; at least one well-formed deck recipe (≥1 copy, non-empty suits and ranks, non-negative jokers); ≤ 208 cards total
- depot names unique
- every name referenced by a deal step, a `Draw`, an `UncoveredBy`, or an
  `AcceptFrom` name-list actually exists; a `dealGroup` has a target, and one
  defaulting to the stock has a stock to draw from
- a `place` step names a card the composition actually supplies
- no depot both sources the re-deal and declares a `Draw`
- every depot pattern in a `WinCondition`, a `RedealWhen` guard, an `AutoSend`, an
  `AutoRefill` or an `AcceptFrom` selects exactly one way — `OfType` or `Names[]`, never
  both and never neither — and matches at least one depot on the board (an empty
  `Names[]`, or an `OfType` no depot uses, is an error). A `Names[]` entry no depot
  answers to is reported too, as the unknown-depot check above
- no empty `allOf` / `anyOf` group in a `WinCondition` or a `RedealWhen`

A `RedealWhen` is only checked when `RedealRules` exist: a guard on a game with no
re-deal is dropped rather than refused.

Nothing here judges *playability*: a design can be perfectly valid and unwinnable.

---

## Canonical encodings (the vocabulary in practice)

- **Klondike foundation**: `Seed: Ace, Build: { Direction: Up, Step: 1 }, Suit: Same`, eject `Gate: Locked`
- **Klondike stock**: `Draw: { To: "waste", Count: 1, Recycle: true }`, `LandFace: Down`, eject `Gate: Locked`; the waste is `RejectsAll` with eject `Gate: TopOnly` — draws bypass accept rules, so nothing else may land there by hand
- **FreeCell cell**: `EmptyOnly, Single`; setup `CompoundMoves: Staged`. Its stock is `OffTable` — a phantom deal source that takes up no table space
- **Spider deck**: one recipe, `Suits: ["Spades"], Count: 8` (genuine single-suit, 104 cards); the 4-suit variant is a full pack with `Count: 2`
- **Spider foundation**: `EmptyOnly, Seed: King, Build: { Direction: Down, Step: 1 }, MinCount: 13`; tableau eject `Unit: { Kind: Run, Build: { Direction: Down, Step: 1 } }` — the 4-suit variant adds `Suit: Same`, which is what forces one-at-a-time play there. The tableau also carries `AutoSend: { OfType: "Foundation" }`, and those two rules are what make it fire on a finished run and nothing else
- **Golf**: the shared foundation takes `Build: { Direction: Either, Step: 1 }`; the tableau columns are `RejectsAll` with eject `Gate: TopOnly`; the stock draws onto the foundation with no recycle; `LossCondition: noLegalMoves`
- **Pyramid**: slots are `RejectsAll` + eject `Gate: FaceUp` + `UncoveredBy` naming the two cards that cover them; the *discard* foundation is `Single` + `Build: { Sum: 13 }`, which is what pairs cards to thirteen; the waste accepts only `AcceptFrom: { Names: ["stock"] }`
- **Crazy Quilt cell**: deal-only single-card slot (`RejectsAll`, eject `Gate: FaceUp`), `UncoveredBy` naming its two short-end neighbours + `UncoveredByAny: true` so it frees when either is gone; foundations split `Seed: Ace, Build: Up` and `Seed: King, Build: Down`, both `Suit: Same`, over two decks
- **Clock Solitaire**: each hour pile is `RankIs` its hour + `LandUnder: true` + a face-down fan offset of 1 — deliver the card, and the pile's next card turns up on top of it; win `allCardsFaceUp`, loss `noLegalMoves`
- **Yukon**: eject `Unit: {}` (any group moves regardless of internal order)
- **A foundation under an `Any`-unit source** (Yukon, Scorpion, Flower Garden): add `Single: true` to the usual `Seed: Ace, Build: Up, Suit: Same`. A source that declares an eject unit has vouched for the group's internal order, so the target stops checking it — meaning a foundation that accepted groups would take a King buried under twelve unrelated cards as a "complete run". Taking one card at a time closes that off
- **The hand** (Flower Garden's bouquet): eject `Unit: { Kind: Single }` with the default `Any` gate — reach into the middle of a spread and take just that card, leaving its neighbours in place. Pair with `RejectsAll` for a reserve that only ever empties
- **Canfield foundation**: `SeedFromDeal: true, Build: { Direction: Up, Step: 1, Wrap: true }, Suit: Same`, eject `Gate: Locked` — the deal fixes the base rank for all four, and the build wraps K↔A to reach every card. Its tableau adds `AutoRefill: { Names: ["reserve"] }`, which is the whole of the "an emptied column refills from the reserve" rule: the reserve's `FaceUp` eject releases the card, the column's seedless accept takes it, and an exhausted reserve needs no rule to hand the vacancy back to the player
