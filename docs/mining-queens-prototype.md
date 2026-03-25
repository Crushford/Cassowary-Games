# Mining Prototype: Depth Progression

## Current Goal

The mining game now uses a depth-based progression system built on top of a hidden 5x5 Queens-derived board, wrapped in a minimal survival-contract story.

Every board still comes from a legal 5x5 Queens solution, but the presentation changes by depth:

- depth 1 teaches the pattern with almost no information
- depth 2 adds quartz vs neutral stone
- depth 3 introduces region logic
- depth 4 reveals the full region map up front

## Hidden Truth

For every board:

- each queen position becomes hidden gold
- there is exactly one gold per row
- there is exactly one gold per column
- gold never touches diagonally

The Queens `layout` string is also parsed into region ids so later depths can use region rules.

## Narrative Wrapper

- The player is a cassowary working under a mining contract.
- Every dig costs supplies.
- Gold keeps the cassowary alive.
- Death is framed as starvation underground, followed by revival from a suspiciously angelic Andean condor.
- Advice comes through lightweight text modals rather than new world screens.

## Economy

- every dig costs `1` gold
- every dig also costs `1` day
- rewards depend on the selected depth:
  - depth 1: `5`
  - depth 2: `10`
  - depth 3: `20`
  - depth 4: `40`

The run starts with `20` gold so the first contract feels survivable but still tight.

Low-gold warnings currently trigger at:

- `10` gold
- `5` gold

If gold reaches `0`, the current contract ends and the player must restart the run.

## Interaction

- tap: dig
- long press: place or remove a manual flag
- digging a flagged tile is allowed and clears the flag first

Flags are player-owned markers only. There is no forced flag-before-dig step.

## Depth Rules

### Depth 1: Dirt Layer

- reward: `5`
- reveals:
  - gold
  - plain dirt
- no quartz
- no region visibility

### Depth 2: Stone Layer

- reward: `10`
- reveals:
  - gold
  - quartz for impossible tiles
  - grey rock for unknown tiles

Quartz means the tile can never contain gold because it lies in:

- the same row
- the same column
- an immediately diagonal-adjacent cell

### Depth 3: Region Layer

- reward: `20`
- reveals:
  - colored region rock
  - gold embedded in the region color
- quartz is removed
- the key new concept is: one gold per region

### Depth 4: Scanner Layer

- reward: `40`
- the full region map is visible immediately
- digging is still needed to uncover gold, but region discovery is free

## Upgrades

Depth unlocks are permanent within the current run:

- `Magpie Starter Kit` → unlocks depth 2, cost `20`
- `Reinforced Magpie Rig` → unlocks depth 3, cost `80`
- `Survey Scanner` → unlocks depth 4, cost `320`

The player can still return to earlier unlocked depths to farm them.

The shop copy now frames these as contract tools and hired help, with the magpie introduced from the first upgrade onward.

## Runtime Structure

### Store

Primary runtime:

- `frontend/src/games/mining/stores/mining.ts`

The store owns:

- current puzzle loading
- selected depth
- highest unlocked depth
- upgrade ownership
- gold and day totals
- revealed tiles
- manual flags
- board completion and next-board loading
- intro modal state
- low-gold warning state
- death/revival state
- lightweight hint unlock state
- one-time hint tracking by depth

### Utilities

Puzzle loading and cache:

- `frontend/src/games/mining/game/puzzles/loadMiningPuzzle.ts`

Queens-to-mining conversion:

- `frontend/src/games/mining/game/puzzles/convertQueensPuzzleToMiningBoard.ts`

Quartz truth generation:

- `frontend/src/games/mining/game/rules/quartzTruth.ts`

Gold position selector:

- `frontend/src/games/mining/game/selectors/getFoundGoldPositions.ts`

Upgrade definitions:

- `frontend/src/games/mining/game/upgrades/miningUpgrades.ts`

Region color styling:

- `frontend/src/games/mining/game/utils/regionColor.ts`

### UI

Main view:

- `frontend/src/games/mining/views/MiningGame.vue`

Board:

- `frontend/src/games/mining/components/MiningBoard.vue`

Square:

- `frontend/src/games/mining/components/MiningSquare.vue`

Shop:

- `frontend/src/games/mining/components/MiningShopModal.vue`

## Board Data Model

The current board uses:

- `truthGold: boolean[][]`
- `truthQuartz: boolean[][]`
- `regionIds: string[][]`
- `revealed: boolean[][]`
- `playerFlags: boolean[][]`

`truthQuartz` exists because depth 2 needs a distinct reveal type for impossible non-gold tiles.

## Level Flow

- load a random cached `5x5` Queens puzzle
- convert it into gold truth plus region ids
- play one 5x5 board
- when all 5 gold tiles are found, briefly show completion
- then load another random board at the currently selected depth

The game keeps:

- total gold
- total days
- unlocked depth upgrades
- currently selected depth

On death:

- current board progress resets
- run gold resets
- days reset
- unlocked depth upgrades survive
- hints remain unlocked once the player has died once
- current depth resets to depth 1

## Tests

Focused tests exist for:

- Queens-to-mining conversion
- quartz truth generation
- auto-flag rule helper
- mining store progression and depth unlock flow

Files:

- `frontend/src/games/mining/game/puzzles/convertQueensPuzzleToMiningBoard.spec.ts`
- `frontend/src/games/mining/game/rules/quartzTruth.spec.ts`
- `frontend/src/games/mining/game/rules/autoFlag.spec.ts`
- `frontend/src/games/mining/stores/mining.spec.ts`

## Notes

The `autoFlag.ts` helper still exists as a pure rule helper from the earlier prototype, but depth progression no longer depends on an auto-flag shop upgrade.

If later work reintroduces automation or scanners with rule assistance, that helper can be reused.
