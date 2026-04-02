# Mining Game Developer Notes

## Purpose

This document explains how the mining game currently works, what the core concepts are, and which implementation decisions are intentional.

The important context is that mining is no longer a loose prototype menu with placeholders. The live upgrade system is meant to reflect the real game as it exists now.

If an upgrade appears in config, it should have real behavior.

## High-Level Game Loop

The mining game is a month-based hidden-information puzzle built on top of Queens-derived boards.

The player loop is:

1. Play a hidden 5x5 mining board.
2. Use days to place flags and dig.
3. Find gold and finish or partially finish the field.
4. Return to town at month end, or manually end the month early.
5. Exchange gold for coins based on exchange level.
6. Pay food for the next month.
7. Buy upgrades.
8. Return to the same field and continue, unless the field is exhausted and the player moves on.

Important: starting a new month does **not** load a fresh field. The player continues the current field.

## Board Truth Model

Mining uses a Queens puzzle as its hidden truth source.

For each board:

- each queen position becomes a gold tile
- there is exactly one gold per row
- there is exactly one gold per column
- gold does not touch diagonally
- the Queens `layout` string is converted into mining `regionIds`

That means mining inherits two different layers of structure:

- classic queens constraints: one gold per row/column, no diagonal touching
- color-group constraints: region ids from the Queens layout

## Core Runtime Concepts

### Hidden vs revealed tiles

Each square is one of:

- `hidden`
- `gold`
- `empty`

The player mostly interacts with hidden tiles. Gold and empty tiles are revealed states.

### Flags

Mining currently has two logical flag concepts:

- `gold-here`
- `not-gold`

But only one of these is currently part of automation output:

- automation places `not-gold`
- the player places `gold-here`

The current design intentionally does **not** auto-place confirmed gold yet.

### Player flags vs system flags

There are two flag sources on the board:

- `playerFlags`
- `systemFlags`

`playerFlags` represent player intent.

`systemFlags` represent deductions made by the game from owned upgrades.

The rendered board uses a merged view, but the distinction matters:

- system flags are advisory
- player intent wins visually
- automatic `not-gold` flags should not erase or block a player override

This was an important fix during this session. A player can now still place `gold-here` and dig a tile even if automation marked it `not-gold`.

## Month and Economy Model

### Days

- a month is `28` days
- flagging requires at least `1` day left
- digging requires at least `1` day left
- when days reach `0`, the game goes to town

This is enforced in run logic, not by simply making the board dead to clicks.

### Gold and coins

These are different resources:

- `gold` is found on the board
- `coins` are spent in town

Current important values:

- starting coins: `20`
- food cost: `1` coin
- next field cost: `1` coin
- all current upgrade costs: `1` coin
- each gold tile yields `1` gold
- gold exchange base value is `100` coins per gold

### Exchange payout

The exchange does **not** pay base value plus a bonus.

The correct rule is:

- calculate `baseValue = goldSold * 100`
- determine the exchange level from gold sold that month
- pay a percentage of `baseValue`

Current exchange levels:

- level 1: `0+` gold sold, payout `3%`
- level 2: `7+` gold sold, payout `6%`
- level 3: `14+` gold sold, payout `9%`
- level 4: `28+` gold sold, payout `12%`

Example:

- sell `5` gold
- base value is `500`
- at level 1, payout is `15`
- at level 2, payout is `30`

The UI now reflects this correctly.

### Food and game over

Buying food restarts the month counter on the current field:

- `daysLeftInMonth` resets to `28`

If the player cannot afford food:

- the run enters `dead`
- the death modal becomes a game-over screen
- restart behaves the same as deleting the mining save

## Town Sequence

The town flow is ordered:

1. `exchange`
2. `food-shop`
3. `magpie-trainer`
4. `tool-store`

The month cannot resume until food is paid.

The player can manually return to town early from the field if they want to stop digging before days reach `0`.

## Exchange Levels and Shop Visibility

### Best level vs current month level

There are two progression ideas:

- `currentMonthLevel`: what the player reached this month
- `bestLevel`: highest exchange level ever reached

Visibility uses `bestLevel`, not current monthly state.

### Upgrade visibility rule

An upgrade is visible if:

- `requiredLevel <= bestLevel`

There is no separate `UpgradeState` system.

### Purchase gating rule

Visible does not always mean buyable.

Magpie lessons are a special case:

- they can be visible by level
- but if the player does not own `buy-magpie`, the lesson purchase is disabled
- UI should communicate `Requires Magpie`

### Show purchased toggle

The store includes a purchased-items toggle.

Without it:

- owned upgrades disappear from the visible live list

With it:

- purchased upgrades remain visible for inspection

## Live Upgrade Set

These are the only live mining upgrades that should exist right now.

### Magpie lessons

- `buy-magpie`
- `auto-flag-row`
- `auto-flag-column`
- `auto-flag-diagonal`
- `pattern-automation-1`
- `pattern-automation-2`

### Tool upgrades

- `auto-hauler`
- `scanner`

Everything else that previously existed as placeholder progression has been removed from the live arrays.

Future ideas belong in docs or TODOs, not active upgrade config.

## Upgrade Unlocks

Current unlock levels:

### Exchange level 1

- Buy Magpie
- Row Flags
- Auto Next Field

### Exchange level 2

- Column Flags
- Diagonal Flags

### Exchange level 3

- Scanner

### Exchange level 4

- Pattern Automation I
- Pattern Automation II

## Automation Model

The mining automation system is intentionally built by extending mining’s existing rules and reusing Queens logic where it fits.

It should **not** be treated as a fresh standalone automation system.

Primary runtime:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/game/progression/miningAutomationEngine.ts`

Queens references:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/utils/incrementalAutomation.ts`
- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/utils/incrementalPatternCards.ts`

### Automation output rule

Current automation output is intentionally limited to:

- mining `not-gold`

The system does **not** auto-place gold confirmations yet.

Queens-style `queen` placement is a future path, not part of the live mining implementation.

### Existing mining auto-flag rules

Mining already had direct rule-based automation through `autoFlag.ts`.

These remain the foundation:

- Row Flags: once gold is confirmed in a row, mark the rest of the row `not-gold`
- Column Flags: once gold is confirmed in a column, mark the rest of the column `not-gold`
- Diagonal Flags: once gold is confirmed, mark touching diagonals `not-gold`

These are intentionally simple and work from confirmed revealed gold positions.

### Scanner

Scanner does two separate things:

1. reveal color groups visually on the board
2. enable the rule: one gold per color group

Current scanner deductions:

- once a gold tile is confirmed in a color group, the rest of that group becomes `not-gold`

Current scanner rendering behavior:

- region colors show on covered tiles
- region colors remain visible on revealed gold tiles

This was fixed during this session because scanner colors initially only showed after digging, which made the feature feel broken.

### Auto Next Field

`auto-hauler` is the live code id for the UI concept `Auto Next Field`.

Behavior:

- if the entire field has been dug out
- and the player owns `auto-hauler`
- and at least `1` coin is available
- the game automatically pays the next-field cost and loads the next field

If coins are unavailable, the player stays on the exhausted field and can move later.

## Pattern Automation

Pattern automation reuses the first two fixed Queens pattern cards:

- `pattern-automation-1 -> pc-1`
- `pattern-automation-2 -> pc-2`

There is currently:

- no custom editor
- no dynamic card creation
- no user-authored pattern system

### How Queens pattern cards work

This point matters because it is easy to misunderstand.

Pattern cards do **not** simply say:

- “if the board colors look like this shape, place flags”

They actually work on the current deduction state.

The matcher checks whether a color group has been narrowed down to a specific remaining shape.

In Queens terms:

- active pattern cells are the only remaining unmarked candidate cells in a color group
- all other cells in that same color group must already be flagged
- if that shape matches the card, the card outputs more flags

Mapped into mining:

- Queens `flag` maps to mining `not-gold`
- Queens `queen` is not currently used by mining automation

So mining pattern automation means:

- if a color group’s remaining candidate shape matches `pc-1` or `pc-2`
- place additional `not-gold` flags

### Why this was confusing in debugging

The early unit tests for pattern automation set up direct region layouts that matched the card structure immediately.

That is good enough to verify the matcher, but it can be misleading in live play because the real game usually reaches those states only after:

- scanner deductions
- earlier `not-gold` flags
- multiple automation waves

In other words:

- the pattern system itself can be functioning
- but still appear to “never fire” during normal play if the board rarely reaches the needed candidate shape

### Pattern logging

There is now explicit pattern automation logging in the mining automation engine.

Useful console messages:

- `[mining][pattern-automation] starting pass`
- `[mining][pattern-automation] card evaluation`
- `[mining][pattern-automation] placements applied`
- `[mining][pattern-automation] no further placements`

These logs were intentionally left in place for playtesting and debugging.

## Current UI and Interaction Notes

### Board clicks

The board is no longer effectively disabled just because a month boundary condition made action invalid.

Instead:

- clicks go through
- run logic decides whether the action is legal
- invalid month actions surface proper errors

This produced much clearer debugging and better user feedback.

### Tile typography

Small-square text was tightened so labels fit:

- `Empty 0`
- `Gold 1`

### Next field and town controls

The field UI now exposes:

- explicit next-field cost
- a manual `Return To Town` action

## Save and persistence notes

Persistence lives in:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/stores/miningPersistence.ts`

Important behavior:

- removed placeholder upgrades are sanitized out of restored saves
- restarting from game over behaves like deleting the mining save

This matters because old save data can otherwise silently reintroduce removed upgrade ids.

## Primary Code Locations

Main store:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/stores/mining.ts`

Run logic:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/stores/miningRunService.ts`

Town/progression logic:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/stores/miningProgressionService.ts`

Runtime config:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/stores/miningConfig.ts`

Automation definitions:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/game/progression/automation.ts`

Tool upgrades:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/game/progression/toolUpgrades.ts`

Automation engine:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/game/progression/miningAutomationEngine.ts`

Board rules:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/game/rules/autoFlag.ts`

Main view:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/views/MiningGame.vue`

Shop modal:


Board and square rendering:

- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/components/MiningBoard.vue`
- `/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/mining/components/MiningSquare.vue`

## Guidance For The Next Developer

- Do not add placeholder upgrades back into the live arrays.
- If you add a live upgrade, implement the real behavior at the same time.
- Treat system `not-gold` flags as advisory, not authoritative over player intent.
- Keep scanner as both a visual feature and a deduction unlock.
- Do not add auto-placement of confirmed gold unless that is a deliberate new design step.
- If pattern automation seems inactive, inspect the pattern logs before rewriting the matcher.
- If you change exchange math, preserve the rule that payout is a percentage of base value, not base-plus-bonus.
- If you change month flow, preserve the rule that a new month resumes the same field.

## Known Current Limitations

- Pattern automation is real, but the live board states that trigger it may still be uncommon.
- Pattern logs are intentionally noisy right now because they are being used to debug real gameplay.
- Balance is still placeholder in several places because costs are fixed at `1`.
