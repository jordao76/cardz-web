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
    { "kind": "dealGroup", "to": "column", "faceDown": 2, "faceUp": 1 }
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
| `aliases` | list of strings | — | other names the game is known by, e.g. `["Demon", "Demon Patience"]`; found by search, not translated |
| `decks` | list of packs | one 52-card deck | the cards; see **Deck composition** below |
| `depots` | list of depots | required | the places that hold cards; see **Depots** below |
| `rules` | object | — | named rules that depots share; see **Depot rules** below |
| `dealRules`, `redealRules`, `redealWhen`, `maxRedeals` | | | the deal and redeals; see **Deal steps** below |
| `winCondition`, `lossCondition` | | | see **Win & loss conditions** below |
| `values` | object | pip value | what each card is worth to expressions; see **Values and scoring** below |
| `scoring` | object | — | how a deal is scored; see **Values and scoring** below |
| `planner` | `true`, `false` or object | by how the game is written | whether Cardz's own player may play the game, and how it values a board; see **Teaching Cardz to play** below |
| `aids` | object | — | symbols a deck may print on the cards to help play this game; see **Card aids** below |
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
| `to` | depot name | the stock | the depot this pack is shuffled into. |
| `back` | `1`, `2` | alternating | the card back every copy of this pack shows |

A pack holds `(suits × ranks + jokers) × count` cards; a game holds at most **208**.

- **Standard**: leave `decks` out, or write `[ {} ]` → 52. Two decks: `[ { "count": 2 } ]` → 104.
- **Spider 1-suit**: `[ { "suits": ["Spades"], "count": 8 } ]` → 104 spades.
- **Spider 2-suit**: `[ { "suits": ["Spades","Hearts"], "count": 4 } ]`.
- **Stripped 32-card** (7–Ace): `"ranks": ["Seven","Eight","Nine","Ten","Jack","Queen","King","Ace"]`.
- **A separated deck**: `[ { "ranks": ["Jack","Queen","King"], "to": "monsters", "back": 1 }, { "ranks": ["Ace", … ,"Ten"], "back": 1 } ]`
  puts the court cards on the `monsters` depot and the rest in the stock, each shuffled.

Copies alternate between two card backs. A pack that sets `back` shows that back on every copy.

---

## Depots

`depots` is a list of depot objects: the places that hold cards.

| Field | Values | Notes |
|---|---|---|
| `name` | string | unique id other fields use to refer to this depot |
| `type` | `Stock`, `Waste`, `Foundation`, `Tableau`, `Cell`, `Reserve`, `Layout` | required. Decks without a `to` start on a `Stock`. `Layout` is a rule-free spot for unruled tables. |
| placement | `col`/`row` (grid, fractional) or `x`/`y` (px); `angle` (radians) | `x`/`y` win over `col`/`row` |
| `repeat` | integer | create N copies, named with 1-based suffixes (`column-1` … `column-7`), each one grid column right of the last |
| `perRow` | integer | with `repeat`, wrap the copies: this many to a row, each row one grid row below the last, numbered in reading order |
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

- **`build`**: `direction` is `Up`, `Down` or `Either`. `step` is 0–12,
  default 1 (0 matches equal ranks). `wrap` builds through King↔Ace. Cards that pair
  by a total, as in Pyramid, use an expression instead (see "Rule expressions").
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
  - `Pile`: the whole pile, whichever card is picked, as in Accordion.

  Write it `{ "kind": "Run", "build": …, "suit": … }`. `"single"`, `"any"` and `"pile"` may
  be written bare, and `{}` means `Any`.

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
| `dealGroup` | `to`, `faceDown`, `faceUp`, `roundRobin`, `from`, `when` | deal `faceDown` then `faceUp` cards to each `to` depot. `roundRobin: true` deals one per depot per pass; otherwise each depot is filled before the next. `to` may be a single name, and the name of a repeated depot (`column`) means all its copies in order; `from` defaults to the first stock. Stops when the stock runs out. |
| `move` | `from`, `to` | move one card, keeping its face |
| `flipTop` | `depot` | turn the depot's top card face-up |
| `place` | `rank`, `suit`, `to`, `joker` | pull the first matching card out of the stock and place it face-up. Needs `rank` and `suit`, or `joker: true`. |
| `gather` | `from`, `to`, `when` | move every card from the `from` depots onto `to`, face-down; a repeated depot's name in `from` means all its copies. Each pile is turned over. A redeal that gathers into a stock is tapped from that stock once it is empty, like a recycle. |
| `shuffle` | `depot` | randomly reorder the depot's cards |
| `compact` | `group`, `from` | in a trigger or action only: close up a repeated depot's gaps. Each copy's pile slides down to the lowest empty copy, keeping its order and faces; with `from`, each copy left empty then takes one card from its top, face-up. `group` is the copies' shared name (`cell` for `cell-1` …). |

A `dealGroup` or a `gather` may add `when`, a rule expression (see **Rule expressions**
below) that keeps only the depots it holds for: the deal skips the other `to` depots, and
the gather leaves the other `from` depots where they are. In the expression, `depot` names
each one in turn, and every depot is judged before the step moves a card. Gaps deals the
Aces out with one, then takes them away with
`{ "kind": "gather", "from": ["cell"], "to": "aces", "when": "top(depot).rank == Ace" }`.

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
- `expr` (`when`): the rule expression holds; see **Rule expressions** below.

**`lossCondition`**:

- `noLegalMoves`: no card can move and no tap does anything. Needs `depotOnly`. A
  `landUnder` move counts only if it reveals a card. Suits games that really run out of
  moves; with unlimited recycles or easy shuttling it rarely fires.
- `expr` (`when`): the game is lost as soon as the rule expression holds. Unlike
  `noLegalMoves` it doesn't need `depotOnly`.

---

## Rule expressions

A rule expression is a condition written as text, which Cardz checks against the board.
It can only read the board, never change it, and it always gives an answer.

| Where | What it decides | What it can name |
|---|---|---|
| `acceptRule.when` | whether a drop lands. Checked after the depot's other accept fields, so it can only narrow what the depot takes. Add `reason` for the message a refused player sees. | `card` (the bottom card of the arriving pile), `pile` (all of it), `depot` (where it would land), `source` (where it came from), `top` (the depot's top card) |
| `draw.when` | whether tapping the stock does anything, recycles included | the depots |
| a deal step's `when` | whether a `dealGroup` deals to a depot, or a `gather` takes from it | `depot` (the one tested) |
| win, loss and `redealWhen` with `"kind": "expr"` | whether the condition holds | the depots |

This game uses some of them:

```json
{
  "name": "Climb to Ten",
  "description": "Draw three cards at a time, and play them all before drawing again. A tower takes a higher card than its top, or a card that makes ten with it. Discard what you can't play. Five discards lose; play out the deck with fewer to win.",
  "depotOnly": true,
  "decks": [ { "ranks": ["Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"] } ],
  "depots": [
    { "name": "stock", "type": "Stock", "col": 0, "row": 0,
      "draw": { "to": "hand", "count": 3, "when": "empty(hand)" },
      "landFace": "Down", "acceptRule": "none", "ejectRule": "locked" },
    { "name": "hand", "type": "Waste", "col": 1, "row": 0, "fanDirection": "Right", "looseOrder": true,
      "acceptRule": "none", "ejectRule": { "gate": "Any", "unit": "Single" } },
    { "name": "tower", "type": "Foundation", "col": 0, "row": 1, "repeat": 3,
      "acceptRule": { "single": true, "acceptFrom": ["hand"],
        "when": "empty(depot) || card.value > top.value || card.value + top.value == 10",
        "reason": "Climb higher, or make ten with the top card" },
      "ejectRule": "locked" },
    { "name": "discard", "type": "Reserve", "col": 4, "row": 0, "fanDirection": "Down",
      "acceptRule": { "single": true, "acceptFrom": ["hand"] }, "ejectRule": "locked" }
  ],
  "winCondition": { "kind": "expr", "when": "empty(stock) && empty(hand) && count(discard) < 5" },
  "lossCondition": { "kind": "expr", "when": "count(discard) >= 5" }
}
```

### Values

Every part of an expression resolves to a value: a literal number, a word like `Hearts`,
a depot's name, or what a function returns. Each value is of one kind: numbers can be added,
cards have properties, lists can be counted. The kinds are:

- **Numbers** (`7`), **conditions** (`true`, `false`), **cards**, **lists of cards**,
  **depots** and **lists of depots**.
- **Ranks** (`Ace` … `King`), **suits** (`Clubs` … `Spades`) and **colours** (`Red`,
  `Black`), written capitalised.
- A **depot type** (`Tableau`) means every depot of that type. The name of a repeated depot
  (`tower` for `tower-1` … `tower-3`) means all its copies.
- **A depot name** means that depot. Names can't contain `-`, so a depot can also be written
  `depot("tower-2")`.
- Wherever cards are wanted, a depot stands for the cards on it, bottom first, and a list
  of depots stands for all their cards.

### Operators

Operators join values into a larger expression, much as in a spreadsheet formula: arithmetic
for numbers, comparisons for conditions, and `&&`, `||` and `!` combine conditions.
The whole expression must end up as a condition, except where a number is expected,
as in a `move`'s `count` or a game's `scoring`.

`||` (or), `&&` (and), `!` (not), `==`, `!=`, `<`, `<=`, `>`, `>=`, `+`, `-`, `*`, `%`, and
parentheses. `&&` binds tighter than `||`, and `%` binds like `*`. `%` is the remainder, never
negative for a positive divisor, so `(top.value - card.value) % 13` counts round the corner
from King to Ace; anything `% 0` is 0. Only numbers and ranks can be ordered, and
comparisons don't chain. `let name = …; rest` names a part so the rest can use it:
`let monster = base(depot); monster.value >= 11`.

### Card properties and functions

A card has the properties `rank`, `suit`, `color`, `value` (Ace 1 … King 13, a joker 0,
unless the game's `values` change it), `faceUp` and `joker`.

There are also the following functions:

| Function | Result |
|---|---|
| `count(x)` | how many cards, or how many depots |
| `count(list, condition)` | how many items satisfy the condition |
| `all(list, condition)`, `any(list, condition)` | whether every item, or some item, does |
| `min(a, b)`, `max(a, b)` | the smaller or larger of two numbers |
| `min(list, expression)`, `max(list, expression)` | the smallest or largest number the expression gives for an item; 0 for none |
| `empty(x)` | whether there are no cards |
| `sum(cards)` | the cards' values added up |
| `sum(list, expression)` | the numbers the expression gives for each item, added up; 0 for none |
| `value(card)` | the same as `card.value` |
| `top(cards)`, `bottom(cards)` | the last or first card |
| `base(cards)` | the first card of the face-up run on top |
| `above(cards, card)` | the cards after that card |
| `faceUp(cards)`, `faceDown(cards)` | only the face-up, or only the face-down, cards |
| `depot("name")` | the depot of that name |
| `first(list, condition)` | the first item that satisfies the condition, or nothing |
| `index(depot)` | a copy's number: 3 for `cell-3`, and 0 for a depot that isn't a copy |
| `neighbour(depot, k)` | the copy `k` places after or before the depot: `neighbour(depot("cell-3"), 1)` is `cell-4` |
| `adjacent(a, b)` | whether two depots touch on the grid, diagonals included. A depot placed with `x`/`y` touches nothing. |
| `coveredBy(depot)` | the depots its `uncoveredBy` names, the ones lying over it. |
| `cameFrom(depot)` | the depot its top card was last moved from. |

The functions that iterate over a list (`count`, `all`, `any`, `first`, `min`, `max`, `sum`)
work out their second argument once for each item, calling the item `it`. That argument is an
expression: a condition for `count`, `all`, `any` and `first`, a number for `min`, `max` and
`sum`. So `sum(column, top(it).value)` adds up the columns' top cards.
A repeated depot's name lists its copies in order, so `first(cell, empty(it))` is the
lowest-numbered empty cell.
To ask about two lists at once, name the items instead: `c in discard` in place of the list.
`any(c in discard, count(d in discard, d.rank == c.rank) >= 4)` is true once four cards of
one rank are in the discard.

### What an expression can't see

An expression always gives an answer. Where a value is missing or hidden, it reads as blank
rather than causing an error. An empty pile or a face-down card never breaks a rule, but it
may not give the answer you expect, so check for it with `empty` or `faceUp`
where that matters:

- **No card** is an answer, not an error: `top` of an empty pile is no card. Its `faceUp`
  and `joker` are false, its `value` is 0, and it has no rank, suit or colour. A comparison
  with something it lacks is false, and `!=` is true. So `top.suit == Hearts` on an empty
  depot is simply false.
- **No depot** is an answer too: `neighbour` past the end of a row, or a `first` that finds
  nothing. It holds no cards, so it is also `empty`.
- **Face-down cards are counted but not read**: they have no rank, suit or colour and are
  worth 0. A rule can't look at the stock's order.
- **Nothing is remembered**: an expression sees the board as it is now, not what happened
  earlier.

A game that uses expressions, triggers or actions offers no hints and can't be auto-played.
The respective buttons are hidden on the UI.

Cardz checks every expression when a game is imported or played from the editor. A misspelt
name, a property a card doesn't have, or a suit compared with a number are errors, and are
indicated as such. An expression may be at most 2000 characters long.

---

## Triggers and actions

Expressions decide whether something may happen. **Triggers** and **actions** make things
happen. Both are a condition and a list of steps, declared on a depot:

- **`triggers`**: `[{ "when": …, "do": [steps] }]`. Whenever cards land anywhere, each
  trigger whose `when` holds runs its steps, until the board settles. Triggers rest while
  the rules are off, and don't fire during the opening deal or on undo.
- **`actions`**: `[{ "name": …, "when": …, "do": [steps] }]`. Tapping the depot performs the
  first action whose `when` holds (no `when` means always). While an action is available the
  depot works like a stock: pressing its cards acts instead of picking them up. A draw on the
  same depot comes first.

The steps are deal steps (see **Deal steps** above). In a step, `@self` names the depot the
trigger or action is on. Conditions see that depot as `depot`. A step's depot may also be an
expression, read when the step runs: `neighbour(depot, 1)` is the next copy along, and
`first(cell, empty(it))` the first empty cell. Two extra step fields that can be used:

- `count` on a `move`: how many top cards move together, keeping their order and faces. It
  is a number or an expression, read when the step runs.
- `under` on a `move`: the cards go beneath the target's cards instead of on top. A move
  from a depot to itself with `under` cycles it.

The following game is played entirely through one depot, the loop. Its two actions take turns:
`look` turns the top card up, and `travel` uses that card's value as a `count`, cycling that many
cards to the bottom with `under`. A trigger watches for an Ace on top and moves it to `aces`.
Moving the Ace away also makes the trigger's `when` false, so it stops firing.

```json
{
  "name": "Round the Loop",
  "description": "Tap the loop to turn its top card up, or to travel: a face-up card sends that many cards from the top of the loop to the bottom. An Ace that comes to the top is taken. Take all four.",
  "depotOnly": true,
  "decks": [ { "ranks": ["Ace","Two","Three","Four","Five"], "to": "loop" } ],
  "depots": [
    { "name": "loop", "type": "Reserve", "col": 0, "row": 0,
      "acceptRule": "none", "ejectRule": "locked",
      "actions": [
        { "name": "look", "when": "!empty(depot) && !top(depot).faceUp",
          "do": [ { "kind": "flipTop", "depot": "@self" } ] },
        { "name": "travel", "when": "!empty(depot) && top(depot).faceUp",
          "do": [ { "kind": "move", "from": "@self", "to": "@self", "count": "top(depot).value", "under": true } ] }
      ],
      "triggers": [
        { "when": "!empty(depot) && top(depot).faceUp && top(depot).rank == Ace",
          "do": [ { "kind": "move", "from": "@self", "to": "aces" } ] }
      ] },
    { "name": "aces", "type": "Foundation", "col": 2, "row": 0,
      "acceptRule": "none", "ejectRule": "locked" }
  ],
  "winCondition": { "kind": "expr", "when": "count(aces) == 4" }
}
```

---

## Values and scoring

**`values`** determines what cards are worth, for when a game counts them differently from their
pips: `{ "J": 10, "Q": 10, "K": 10, "joker": 10 }`. A rank is written as in a deck
(`A`, `2` … `10`, `J`, `Q`, `K`) and `joker` is any joker. A rank left out keeps its pip
value. Every expression in the game reads cards by these values: `card.value`, `sum`.

**`scoring`** gives a solitaire a score: `{ "value": …, "better": …, "keep": … }`.

| Field | Default | Meaning |
|---|---|---|
| `value` | required | the score, an expression that gives a number, read on the whole board |
| `better` | `High` | `High` or `Low`: which way a score is better |
| `keep` | `Won` | `Won` keeps the score of a won deal only; `Over` keeps a lost deal's too |

A score can also read four facts about the game:

| Name | What it counts |
|---|---|
| `moves` | moves made, a deal from the stock included; undoing one doesn't take it back |
| `undos` | moves undone |
| `recycles` | times the waste went back into the stock |
| `redeals` | redeals used |

So Spider's classic score is `500 - moves + 100 * count(Foundation, !empty(it))`: 500 to start, one
off for every move, and 100 for each completed run on the foundations.

The player sees the score as they play. Depending on `keep`, a deal keeps its score when it ends,
unless rules were turned off at any time or automatic moves were made. A game with no `winCondition`
keeps no scores.

The following game uses both. `values` makes court cards worth 10, so `sum` and `card.value` count
them that way, both in the columns' accept rule and in the score. `scoring` leaves `better`
and `keep` at their defaults: a higher total is better, and only a won deal keeps its score.

```json
{
  "name": "Under Twenty-One",
  "description": "Tap the stock to turn up a card, then play it to a column or the discard. A column takes a card while its total stays at 21 or under. Court cards are worth 10 and an Ace 1. Play out the deck to win. Your score is the three columns' total, 63 at best.",
  "depotOnly": true,
  "depots": [
    { "name": "stock", "type": "Stock", "col": 0, "row": 0,
      "draw": { "to": "hand", "count": 1, "when": "empty(hand)" },
      "landFace": "Down", "acceptRule": "none", "ejectRule": "locked" },
    { "name": "hand", "type": "Waste", "col": 1, "row": 0,
      "acceptRule": "none", "ejectRule": { "gate": "Any", "unit": "Single" } },
    { "name": "column", "type": "Tableau", "col": 0, "row": 1, "repeat": 3,
      "acceptRule": { "single": true, "acceptFrom": ["hand"],
        "when": "sum(depot) + card.value <= 21", "reason": "A column holds 21 at most" },
      "ejectRule": "locked" },
    { "name": "discard", "type": "Reserve", "col": 4, "row": 0, "fanDirection": "Down",
      "acceptRule": { "single": true, "acceptFrom": ["hand"] }, "ejectRule": "locked" }
  ],
  "values": { "J": 10, "Q": 10, "K": 10 },
  "winCondition": { "kind": "expr", "when": "empty(stock) && empty(hand)" },
  "scoring": { "value": "sum(column)" }
}
```

---

## Teaching Cardz to play

The Hint, Play best move and Play for me buttons need a player that understands the game. A
game written in rule expressions, triggers or actions doesn't offer them unless it opts in:

```
"planner": true
```

With `true`, Cardz makes its usual choices: it sends cards to the foundations, completes
pairs, and taps the stock when nothing else helps. Opt in when those choices play your game
sensibly; Monte Carlo's win about a third of its deals.

`"planner": false` does the opposite: it takes the buttons away from any game, even one
written without expressions, for a game where Cardz's usual choices would mislead. Leave
`planner` out for the default: the buttons for a game written in fixed fields, none for one
that uses expressions, triggers or actions.

A game can also say what it is aiming for:

```
"planner": { "value": "20 * count(clear) - 15 * count(damage)" }
```

`value` is a rule expression that gives a number, read on the whole board: higher for a
board closer to a win. To choose a move, Cardz tries each legal move on a copy of the board
and takes the one that leaves the highest value. A move that wins comes first, and one that
loses comes last. If no move raises the value, Cardz falls back on its usual choices, such
as tapping the stock.

The copy is the board as the player sees it: face-down cards stay hidden, so the planner can't
see anything a player couldn't. Players never see the value, and it changes no rule. Changing
it doesn't reset a game's statistics.

The planner looks only one move ahead. A value that rises only when a whole goal is reached
can't tell the moves that build toward it apart, so reward progress along the way where a
game has some.

---

## Card aids

A card aid is a symbol or a sign that a deck may prints on a card. The game indicates aids
that can help the player; a deck that draws an aid then shows it. Players can turn card aids
off, and the switch appears only when the game and the deck share one.

| Aid | Value | Each card shows |
|---|---|---|
| `pairSum` | number | the rank whose value adds up with this card's to the number, if unique |

Pyramid removes pairs that total 13, so it asks for `"aids": { "pairSum": 13 }`: a 10 shows a
3, and a King shows nothing.

Cards are counted by their pips default values (Ace 1 … King 13) or by the game's `values` if used.

Card aids change no rule, and changing them doesn't reset a game's statistics.

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
- **Pyramid**: each slot ejects `faceUp` and is `uncoveredBy` the two cards covering it; it
  accepts `{ single: true, seed: none, when: "card.value + top.value == 13 && all(c in
  coveredBy(depot), c != source && empty(c))" }`, and a trigger moves both cards to the
  discard once it holds two. The stock's face-up top takes a partner the same way; the
  discard accepts `{ single: true, rankIs: K }` with `landFace: down`; the waste accepts
  `{ single: true, when: "source == stock || (!empty(depot) && card.value + top.value == 13)" }`,
  so a stock card is set aside and a pyramid card pairs with its top, and a trigger moves
  the two to the discard when its top card came from a pyramid slot (`cameFrom`). The redeal gathers the waste back into the spent stock
  and turns up its top, `maxRedeals: 2`; loss `noLegalMoves`; scoring
  `{ value: "28 - count(d in Tableau, !empty(d))", keep: Over }`.
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
