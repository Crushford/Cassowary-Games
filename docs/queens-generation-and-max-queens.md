# Queens Generation And Max-Queens Constraints

This document explains how generation uses the solver, why max-queen constants exist, and why some size and distance combinations are intentionally blocked.

## Generation Uses The Staged Solver

Puzzle generation no longer uses a separate old deterministic solver path for solvability checks.

Current behavior:
- in-progress generation checks use the staged difficulty solver
- completed puzzle save checks use the staged difficulty solver
- difficulty backfill uses the staged difficulty solver

Key file:
- [queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/ValidatedPuzzleGenerationService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/ValidatedPuzzleGenerationService.kt)

Why this exists:
- generation and catalog grading should agree on what counts as solvable
- using one canonical solver avoids drift between “generated successfully” and “graded later”

## Partial Boards During Generation

Generation evaluates boards that are not fully colored yet.

Current policy:
- uncolored squares are treated like blocked / flagged squares during generation-time analysis
- that happens through precheck logic before the normal staged steps run

Why this exists:
- partially generated boards should not be treated as if uncolored cells are still valid candidates

## `UNSOLVABLE` Puzzles Are Not Saved

If the staged solver assesses a completed generated puzzle as `UNSOLVABLE`, the puzzle is not saved.

That is intentional.

Meaning:
- `UNSOLVABLE` here means “not solvable by the approved staged solver”
- it does not necessarily mean “mathematically impossible”

This matches the current product policy: the catalog should only contain puzzles that the approved deterministic ladder can solve.

## Why Max-Queen Constants Exist

The project supports generation in `max` queen-count mode, but computing the true maximum number of queens for larger boards and custom distances can be expensive.

Real issue encountered:
- exact `max` search on larger boards, such as `12x12` with custom distance, can spend minutes exploring hundreds of millions of nodes
- the search often finds a strong best-so-far answer quickly, then spends most of the time trying to prove optimality

Because of that, the project now uses precomputed max-queen constants for normal generation workflows.

Key files:
- frontend:
  - [frontend/src/games/queens/admin/maxQueenCounts.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/admin/maxQueenCounts.ts)
- backend:
  - [queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/PrecomputedMaxQueenCounts.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/PrecomputedMaxQueenCounts.kt)

## Supported `max` Combinations

Normal workshop and batch generation in `max` mode only support size and minimum-distance pairs that already exist in the precomputed constants.

Why:
- interactive exact max search is too slow
- generation should fail fast for unsupported `max` combinations instead of hanging in target resolution

The dedicated max-queens tool still exists for researching and extending the constant table.

## Frontier-Only Rulesets

Not every precomputed size and minimum-distance pair is treated as a distinct supported ruleset.

Current policy:
- for a given board size, if a smaller minimum distance has the same max queen count as a larger minimum distance, the smaller distance is considered redundant
- only frontier distances, where the max queen count changes, are supported for normal generation

Example:
- if `4x4 d3` and `4x4 d4` both allow 4 queens, `d3` is redundant
- generation should keep `d4` and block `d3`

Why this exists:
- these redundant pairs do not create meaningfully different puzzle families in `max` mode
- keeping only frontier rulesets reduces duplicate puzzle categories

## Catalog Cleanup Support

The admin catalog has a ruleset-status filter that can isolate blocked redundant rulesets.

This exists so old puzzles created before the frontier filter can be found and removed from the catalog.

## Updating The Max-Queen Support Matrix

When new exact max-queen results are confirmed:

1. add them to:
- [frontend/src/games/queens/admin/maxQueenCounts.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/admin/maxQueenCounts.ts)
- [queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/PrecomputedMaxQueenCounts.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/PrecomputedMaxQueenCounts.kt)

2. verify which minimum distances are frontier distances
- smaller distances with the same max count as a stricter distance should remain blocked

3. verify workshop and batch UI behavior
- supported size and distance controls should expose the new combinations

4. optionally clean old redundant catalog rows if a newly blocked frontier interpretation changes what should remain in the DB

## Future Research

The remaining open question is not just “what is the max queen count?” but also:
- are there uniquely solvable puzzles that the approved staged solver still cannot solve?

That research note lives in:
- [TODO.md](/Users/james/Documents/Honey-Pot-Ants/TODO.md)

It is intentionally separate from the current generation pipeline. Right now, puzzles outside the approved staged solver are treated as `UNSOLVABLE` and rejected.
