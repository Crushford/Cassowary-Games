# Queens Solver Config

This document explains where the canonical Queens solver config lives, how the current difficulty ladder is defined, and what to update when the project changes that ladder.

## Canonical Source Of Truth

The backend is the source of truth for the approved solver config.

Primary files:
- [queens-admin-backend/src/main/kotlin/com/queens/admin/application/SolverConfigService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/SolverConfigService.kt)
- [queens-admin-backend/src/main/kotlin/com/queens/admin/application/SolverPatternCatalogService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/SolverPatternCatalogService.kt)
- [queens-admin-backend/src/main/kotlin/com/queens/admin/application/DeterministicPuzzleAnalysisService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/DeterministicPuzzleAnalysisService.kt)

What each file owns:
- `SolverConfigService`: built-in steps, labels, ids, canonical tiers, sort order
- `SolverPatternCatalogService`: canonical tier overrides for known persisted patterns
- `DeterministicPuzzleAnalysisService`: staged execution policy and tier unlocking

## Current Config

### Built-In Steps

| Sort | Step Id | Label | Difficulty |
|-----|---------|-------|------------|
| 10 | `single-color` | `Single Color Queen` | `extra-easy` |
| 20 | `row-column` | `Row / Column Constraints` | `hard` |
| 25 | `row-column-sets` | `Row / Column Set Constraints` | `extra-hard` |
| 30 | `group-confined-to-line` | `Group Confined To Line` | `extra-easy` |
| 40 | `single-queen-contradiction` | `Single Queen Contradiction` | `hard` |
| 50 | `assume-progress` | `Assume Queen Until Progress` | `unsolvable` |
| 60 | `assume-exhaustive` | `Assume Queen Exhaustive` | `unsolvable` |

### Patterns

| Sort Source | Pattern Id | Canonical Difficulty |
|------------|------------|----------------------|
| pattern catalog | `pc-1` | `extra-easy` |
| pattern catalog | `pc-2` | `easy` |
| pattern catalog | `solver-pattern-3` | `extra-easy` |
| pattern catalog | `solver-pattern-4` | `medium` |
| pattern catalog | `solver-pattern-5` | `medium` |
| pattern catalog | `solver-pattern-6` | `medium` |
| pattern catalog | `solver-pattern-7` | `medium` |

## Why Some Steps Are `UNSOLVABLE`

The broad assumption steps are intentionally not part of the normal human difficulty ladder.

Current policy:
- `Assume Queen Until Progress` is `unsolvable`
- `Assume Queen Exhaustive` is `unsolvable`

Meaning:
- these steps are still available in admin solving
- but if a puzzle needs them, it should currently be graded as `UNSOLVABLE`

This avoids calling brute-force-style solving “hard” or “extra hard” when the project wants stored difficulty to represent the approved human-style ladder.

## Why `Single Queen Contradiction` Is Separate

`Single Queen Contradiction` is intentionally separate from the broader assumption steps.

Reason:
- it only tests one queen placement and checks for an immediate contradiction
- it does not perform broad recursive or exhaustive branch solving
- it is a bounded deterministic elimination rule, so it belongs in the main ladder

## Why `Row / Column Set Constraints` Is Separate

`Row / Column Set Constraints` is intentionally separate from `Row / Column Constraints`.

Reason:
- the set-based rule handles non-consecutive rows or columns inside one queen-distance span
- it is meaningfully harder to spot and explain
- the project wanted that difficulty jump represented explicitly

## Frontend Behavior And Drift

The admin solver panel has its own persisted local state for displayed solver difficulties.

That is useful for experimentation, but it means:
- the frontend panel can temporarily disagree with backend canonical config
- the catalog and backfill still follow backend canonical config

Implication:
- if behavior looks inconsistent, check backend canonical config first
- then check whether browser local storage still contains older admin solver settings

## How To Update The Config

### Built-in step difficulty or order

Update:
- [SolverConfigService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/SolverConfigService.kt)

Typical changes:
- adjust `difficultyTier`
- adjust `sortOrder`
- rename the label
- add a new built-in step id

### Pattern difficulty overrides

Update:
- [SolverPatternCatalogService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/SolverPatternCatalogService.kt)

Typical changes:
- add or remove canonical overrides by pattern id
- move a known pattern to a different tier

### Difficulty tiers themselves

Update both backend and frontend shared difficulty types:
- backend enums in:
  - [PuzzleDifficultyTier.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/model/PuzzleDifficultyTier.kt)
  - [SolverDifficultyTier.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/solver/SolverDifficultyTier.kt)
- frontend shared difficulty helpers in:
  - [frontend/src/games/queens/admin/types.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/admin/types.ts)
  - [frontend/src/games/queens/admin/solverDifficulty.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/admin/solverDifficulty.ts)

If the player-facing difficulty route/store types also change, update:
- [frontend/src/games/queens/utils/puzzleSelectionRoute.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/utils/puzzleSelectionRoute.ts)

### Tier unlock order

Update:
- [DeterministicPuzzleAnalysisService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/DeterministicPuzzleAnalysisService.kt)

Look for:
- the staged loop
- the tier advancement helper

## Required Follow-Up After Config Changes

After changing canonical solver config:

1. update backend canonical config
2. update frontend defaults or migrations if the admin solver panel exposes those tiers directly
3. rerun difficulty backfill:

```bash
yarn db:assess-puzzle-difficulties:overwrite
```

4. spot-check:
- catalog difficulty distribution
- specific puzzles that changed tiers
- admin solver panel behavior

5. if needed, clean stale catalog data
- especially after ruleset-support or frontier-filter changes

## Backfill Notes

The overwrite backfill now reports:
- total puzzles assessed
- final tier counts
- how many puzzles were updated
- how many stayed unchanged

This is the easiest way to verify whether a config change materially shifted the catalog.
