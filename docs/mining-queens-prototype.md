# Mining Prototype: Queens-Derived Board

## Current Goal

The mining game now uses a hidden 5x5 board derived from the public Queens puzzle data.

This replaces the older layered claim/deck/prospecting prototype. The game still feels like mining, but the hidden gold pattern is taken from a legal 5x5 Queens solution.

## Core Rule

For each 5x5 mining board:

- every queen position from a Queens puzzle becomes a hidden gold tile
- every gold tile is worth `5`
- every non-queen tile becomes dirt worth `0`
- there is exactly one gold tile per row
- there is exactly one gold tile per column
- gold never touches diagonally

Colors and regions from Queens are ignored for gameplay.

## Player Flow

### Before buying the upgrade

- tap digs a hidden tile
- long press places or removes a player flag for free
- each dig costs `1` gold and `1` day
- if the tile is gold, it reveals as `5` and adds 5 gold to the player's total
- if the tile is a ruled-out location, it reveals as white quartz
- if the tile is still ambiguous, it reveals as neutral grey rock
- no auto-flagging happens yet

This is meant to let the player notice the pattern on their own first.

### Buying the upgrade

The shop now sells a single upgrade:

- `Survey Kit`
- cost: `5` gold

When the player buys it:

- the upgrade becomes permanently active for later levels in the current run
- the full explanation modal is shown once
- the modal explains:
  - one gold per row
  - one gold per column
  - no diagonal touching
  - the game will now mark impossible tiles automatically after gold is found

### After buying the upgrade

- whenever the player reveals a gold tile, the game recalculates system flags
- those flags are still diggable; they are guidance, not a lock
- the player can keep using manual flags as well
- system flags mark cells that cannot contain gold based on currently revealed gold:
  - same row
  - same column
  - immediately diagonal-adjacent cells

## Level Progression

- a level ends when all 5 gold tiles on the current board are found
- the game briefly enters `level-complete`
- then it loads another random 5x5 Queens-derived board
- these values persist between levels:
  - total gold
  - total days elapsed
  - purchased Survey Kit upgrade

## Data Source

Puzzle source:

- `/queens/puzzles.json`
- file on disk: `frontend/public/queens/puzzles.json`

The mining game:

- reads only the `"5x5"` pool
- caches the pool after the first fetch
- prefers original puzzle variants only (`id.endsWith('-0')`)
- avoids immediately repeating the current puzzle when possible

## Runtime Structure

### Store

Primary runtime:

- `frontend/src/games/mining/stores/mining.ts`

The store owns:

- loading the next Queens-derived board
- the dig economy
- revealed state
- manual player flags
- auto-generated flags
- day count
- gold total
- current level
- Survey Kit ownership
- upgrade explanation modal state

### Utilities

Puzzle loading:

- `frontend/src/games/mining/game/puzzles/loadMiningPuzzle.ts`

Queens-to-mining conversion:

- `frontend/src/games/mining/game/puzzles/convertQueensPuzzleToMiningBoard.ts`

Auto-flag rule:

- `frontend/src/games/mining/game/rules/autoFlag.ts`

Found-gold selector:

- `frontend/src/games/mining/game/selectors/getFoundGoldPositions.ts`

Upgrade config:

- `frontend/src/games/mining/game/upgrades/miningUpgrades.ts`

### UI

Main view:

- `frontend/src/games/mining/views/MiningGame.vue`

Board:

- `frontend/src/games/mining/components/MiningBoard.vue`

Square:

- `frontend/src/games/mining/components/MiningSquare.vue`

Shop:

- `frontend/src/games/mining/components/MiningShopModal.vue`

## Minimal Source of Truth

The hidden board uses:

- `truthGold: boolean[][]`
- `truthQuartz: boolean[][]`

There is still no duplicate `goldValues` matrix. The only reward value is derived from `truthGold`:

- `true => 5`
- `false => 0`

`truthQuartz` is stored because the UI now needs to distinguish between dug non-gold tiles that are impossible by rule and dug non-gold tiles that remain ambiguous.

## Hidden Constraints We Intentionally Do Not Use

The Queens source data still comes from full Queens puzzles, but mining intentionally does **not** use:

- color-group constraints
- region/layout constraints
- Queens runtime store state

Only the queen-placement geometry is used.

## Tests

Focused tests exist for:

- Queens-to-mining conversion
- auto-flagging
- mining store progression

Files:

- `frontend/src/games/mining/game/puzzles/convertQueensPuzzleToMiningBoard.spec.ts`
- `frontend/src/games/mining/game/rules/autoFlag.spec.ts`
- `frontend/src/games/mining/stores/mining.spec.ts`

## Notes For Future Work

If later versions add scanners, colors, deeper layers, or more shop upgrades, keep those as mining-specific systems.

Do not re-couple mining to the Queens store runtime unless there is a strong reason to share logic.
