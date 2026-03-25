# Mining Prototype: Progression Menu Sandbox

## Current Goal

The mining game still runs on a hidden 5x5 Queens-derived board, but the progression layer is now a prototype menu for testing shape rather than balance.

This version is intentionally cheap and permissive:

- every progression item costs `1`
- all categories are available immediately
- the purpose is to test structure, not economy tuning

The loop underneath is still the same:

- dig tiles on a hidden board
- spend `1` gold per dig
- earn gold from real seams
- buy or select progression options from a single menu

## Hidden Truth

For every board:

- each queen position becomes hidden gold
- there is exactly one gold per row
- there is exactly one gold per column
- gold never touches diagonally

The Queens `layout` string is also parsed into region ids so later depth layers can still use region logic.

## Prototype Progression Menu

One overlay now contains four tabs:

- `Field`
- `Automation`
- `Permits`
- `Tools`

This keeps board profile, magpie training, contract payout, and equipment/depth progression mentally separate while still living in one simple UI panel.

## Current Categories

### Field

Field is about board profile and puzzle pool, not depth.

Current options:

- `Training Field`
- `Standard Field`
- `Larger Fields`

`Training Field` and `Standard Field` are both 5x5 for now, but they are not identical:

- `Training Field` draws from a smaller, steadier subset of the 5x5 puzzle pool
- `Standard Field` uses the full current 5x5 pool

`Larger Fields` is intentionally visible as a `Coming Soon` placeholder so the menu structure can be tested before larger boards exist.

### Automation

Automation is magpie training.

Current lessons:

- `Buy Magpie`
- `Teach Row Rule`
- `Teach Column Rule`
- `Teach Diagonal Rule`
- `Teach Simple Pattern Recognition`

The row/column/diagonal lessons already have real board impact: after gold is found, the store computes system flags using only the rules the magpie has learned so far.

`Buy Magpie` is a real prerequisite for the later lessons.

Pattern recognition is still a visible placeholder for later design work and is not purchasable in this prototype.

### Permits

Permits are contract payout tiers.

Current options:

- `Basic Permit`
- `Better Permit`
- `Premium Permit`

In this prototype they apply a real payout multiplier:

- `1.0x`
- `1.25x`
- `1.5x`

Owned permits can be reactivated without repurchasing them.

### Tools

Upgrades are physical tools and depth unlocks.

Current options:

- `Stronger Pick`
- `Deeper Digging`
- `Drill`
- `Scanner`

This is where depth progression lives now:

- `Stronger Pick` unlocks depth 2
- `Deeper Digging` unlocks depth 3
- `Scanner` unlocks depth 4

`Drill` is a visible placeholder slot for future tool effects and is not purchasable yet.

## Depth Rules

### Depth 1: Dirt Layer

- reward starts from `5`, then permit multiplier applies
- reveals:
  - gold
  - plain dirt

### Depth 2: Stone Layer

- reward starts from `10`, then permit multiplier applies
- reveals:
  - gold
  - quartz for impossible tiles
  - grey rock for unknown tiles

### Depth 3: Region Layer

- reward starts from `20`, then permit multiplier applies
- reveals:
  - colored region rock
  - gold embedded in region color

### Depth 4: Scanner Layer

- reward starts from `40`, then permit multiplier applies
- region map is visible immediately

## Economy

- run starts with `20` gold
- every dig costs `1` gold
- every dig costs `1` day
- every progression item costs `1` in this prototype

This is temporary scaffolding so the category structure can be tested without long grinding.

Low-gold warnings still trigger at:

- `10` gold
- `5` gold

If gold reaches `0`, the contract ends and the player restarts.

## Narrative Wrapper

The current cassowary contract framing still exists, but it is not the focus of this prototype pass.

- intro modal
- low-gold warnings
- death / condor revival
- hint modal

These continue to wrap the mining loop while the progression menu is being tested.

## Runtime Structure

### Store

Primary runtime:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/stores/mining.ts`

The store now owns:

- puzzle loading
- selected field
- current depth
- owned tool upgrades
- magpie ownership and lessons
- owned permits and active permit
- progression menu tab state
- revealed tiles
- player flags
- system flags
- gold and day totals
- intro / hint / death modal state

### Progression Config

Field options:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/game/progression/fields.ts`

Automation lessons:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/game/progression/automation.ts`

Permits:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/game/progression/permits.ts`

Tool upgrades:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/game/progression/toolUpgrades.ts`

### UI

Main view:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/views/MiningGame.vue`

Board:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/components/MiningBoard.vue`

Squares:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/components/MiningSquare.vue`

Progression modal:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/components/MiningShopModal.vue`

## Board Data Model

The current board uses:

- `truthGold: boolean[][]`
- `truthQuartz: boolean[][]`
- `regionIds: string[][]`
- `revealed: boolean[][]`
- `playerFlags: boolean[][]`
- `systemFlags: boolean[][]`

`playerFlags` come from long-press interaction.

`systemFlags` come from magpie lessons and only appear for the rules the bird has learned.

## Level Flow

- load a random cached `5x5` Queens puzzle
- convert it into gold truth plus region ids
- play one 5x5 board
- when all 5 gold tiles are found, briefly show completion
- then load another random board at the currently selected depth

The game keeps:

- total gold
- total days
- owned fields
- active permit
- owned magpie lessons
- owned tool upgrades
- unlocked depths

On death:

- current board progress resets
- run gold resets
- days reset
- progression ownership survives
- depth resets to 1

## Deferred Balancing Work

This prototype does **not** answer the real economy yet.

Still unresolved:

- real prices
- actual upgrade ordering
- true larger-board support
- real tool effects for `Drill`
- whether permits should stay this generous
- what pattern-recognition should actually do
- when automation lessons should become gated
- how field profile and puzzle difficulty should scale together

The current structure is intended to make that later tuning possible without another menu rewrite.
