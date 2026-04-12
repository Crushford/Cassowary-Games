# Queens Catalog

This document explains the `Catalog` tab: what it groups, what filters exist, and why some cleanup tools are more ruleset-aware than they first appear.

## Purpose

The catalog is the operational view of persisted Queens puzzles.

Use it for:
- checking how many puzzles exist in each ruleset bucket
- sorting by difficulty or inventory
- opening a random puzzle in the player
- opening a random puzzle in the admin solver
- deleting exact ruleset buckets
- cleaning up old redundant puzzle families

Primary frontend component:
- [frontend/src/games/queens/components/admin/QueensAdminCatalogPanel.vue](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/components/admin/QueensAdminCatalogPanel.vue)

Primary backend service:
- [queens-admin-backend/src/main/kotlin/com/queens/admin/application/PuzzleCatalogService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/PuzzleCatalogService.kt)

## Grouping Model

The catalog groups puzzles by exact ruleset bucket.

Current bucket fields:
- `size`
- `orthogonalMinDistance`
- `targetQueenCount`
- `minimumGroupSize`
- `difficulty`

This grouping is intentionally stricter than just size and difficulty.

Why:
- the project needs to reason about actual generated puzzle families
- cleanup needs to delete exact ruleset buckets, not just rough categories
- random puzzle selection should be able to target the same buckets batch generation cares about

## Random Open Actions

The catalog supports:
- `Play Random`
- `Open In Solver`

Both actions:
- pick one random puzzle from the selected catalog bucket

Then:
- `Play Random` opens it in the player route
- `Open In Solver` opens it in the admin solver route

This matters because catalog inspection and solver debugging are now part of the same workflow.

## Why Difficulty Is In The Catalog Group

Difficulty is part of the grouping because:
- the same size / distance / queen-count / min-group bucket can exist at different solved difficulty tiers
- puzzle inventory and cleanup sometimes need to reason about difficulty explicitly

This also makes it possible to:
- sort by difficulty
- filter by difficulty
- launch random puzzles by difficulty bucket

## Ruleset Status Filter

The catalog has a `Ruleset Status` filter with:
- all rulesets
- active frontier rulesets
- blocked redundant rulesets

This exists because normal generation now blocks redundant min-distance variants.

Example:
- if a smaller minimum distance has the same max queen count as a stricter distance for the same size, the smaller distance is redundant in `max` mode and should no longer be generated

The filter was added so older catalog rows created before that restriction can be found and deleted.

## Distance Display

The catalog labels `Min Distance` more explicitly now.

Current behavior:
- if `orthogonalMinDistance == size`, the UI shows it as `N (Max)`

Why:
- that distance is an important ruleset boundary
- it makes catalog scanning easier for classic-style or max-distance cases

## Cleanup Behavior

The delete action removes every persisted puzzle with the exact selected ruleset bucket.

This is intentionally destructive and exact.

Why:
- cleanup is often about removing one specific family of generated puzzles
- partial delete logic would make reasoning about catalog counts much harder

## How To Update Catalog Behavior Safely

When changing catalog grouping or filters:

1. update backend grouping logic in the repository / service layer
2. update frontend row typing and filtering together
3. verify random-open actions still target the same bucket definition
4. verify destructive delete still matches the displayed bucket fields

When changing supported rulesets or frontier filtering:
- make sure the `Ruleset Status` filter logic stays aligned with the same max-queen support matrix as generation

## Common Sources Of Confusion

### Catalog difficulty disagrees with current admin solver behavior

Possible causes:
- stored difficulty is stale and backfill has not been rerun
- backend canonical solver config changed
- frontend admin solver local settings are drifting from backend canonical config

### Catalog contains rulesets the generator no longer allows

That can be normal.

The catalog predates some of the frontier / redundant-ruleset restrictions. Use the `Blocked redundant rulesets` filter to isolate those rows for cleanup.
