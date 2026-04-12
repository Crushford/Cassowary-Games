# Queens Solver Overview

This document explains the current Queens solver model, why the project uses it, and where the main moving parts live.

## Two Solver Layers

The codebase has 2 related solver systems.

### Raw backend rule engine

The raw engine is the low-level rule runner used by the admin solver UI and by individual backend solver operations.

Key files:
- [queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/SolverEngine.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/SolverEngine.kt)
- [queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/SolverRuleRegistry.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/SolverRuleRegistry.kt)
- [queens-admin-backend/src/main/kotlin/com/queens/admin/domain/solver/rules](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/solver/rules)

Characteristics:
- rules are defined as `SolverRule` implementations
- ordered by Spring `@Order`
- can run one named rule, the next matching rule, or a raw loop until stuck
- returns board mutations plus changed cells and text explanations

This engine is useful for:
- the admin solver panel
- one-off rule execution
- future hint previews, because it can already run individual rules

### Configured staged solver

The staged solver is the canonical solver for puzzle grading, difficulty backfill, and generation-time solvability checks.

Key files:
- [queens-admin-backend/src/main/kotlin/com/queens/admin/application/DeterministicPuzzleAnalysisService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/DeterministicPuzzleAnalysisService.kt)
- [queens-admin-backend/src/main/kotlin/com/queens/admin/application/SolverConfigService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/SolverConfigService.kt)
- [queens-admin-backend/src/main/kotlin/com/queens/admin/application/SolverPatternCatalogService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/SolverPatternCatalogService.kt)

Characteristics:
- uses a curated list of built-in steps and persisted patterns
- difficulty comes from canonical backend config, not raw engine defaults
- runs in staged unlock order from easiest to hardest
- restarts from the top any time a step makes progress
- treats assumption-based solves as `UNSOLVABLE`

This staged solver is the source of truth for:
- stored puzzle difficulty
- overwrite backfill
- generation-time solvability checks
- save / reject decisions for generated puzzles

## Why The Project Uses A Configured Staged Solver

The project intentionally moved away from treating the raw engine order as the difficulty model.

Reasons:
- the raw rule registry contains legacy and helper rules that are useful operationally but are not the approved human-solving ladder
- puzzle grading needed a stable, explicit order and difficulty config
- generation and backfill had drifted before they were unified onto the same staged solver
- some rules are meaningfully different even if they are both “constraint” rules

Examples:
- `Single Queen Contradiction` is kept as a bounded contradiction rule, separate from broader brute-force assumption steps
- `Row / Column Set Constraints` is separate from `Row / Column Constraints` because non-consecutive line sets are harder to detect and explain
- assumption steps remain available in the raw/admin solver, but they are intentionally treated as `UNSOLVABLE` for grading

## Current Stage Unlock Order

The current staged solver unlocks tiers in this order:

1. `extra-easy`
2. `easy`
3. `medium`
4. `hard`
5. `extra-hard`
6. `unsolvable`

Operationally:
- precheck logic runs first
- `Single Color Queen` is checked before the configured step list
- configured steps run in sort order within the currently unlocked tier
- if any step changes the board, the solver restarts from the top
- if no step changes the board, the next tier unlocks
- if the board is still not solved after `extra-hard`, the result is `UNSOLVABLE`

## Important Design Decisions

### Stored ruleset must be respected

Difficulty assessment must use the puzzle's actual `orthogonalMinDistance`, not assume the classic board-size distance. This was a real source of grading drift and was fixed in the backend assessor.

### Generation uses the same staged solver

`ValidatedPuzzleGenerationService` now uses the staged difficulty solver for in-progress solvability checks and final persistence checks. That keeps generation aligned with backfill and catalog grading.

### Uncolored generation cells are treated as blocked

Generation-time analysis can run on partially colored boards. Before normal staged solving, uncolored squares are flagged by precheck logic so incomplete boards are evaluated consistently.

### Assumption steps are not part of normal difficulty

The 2 broad assumption steps are still available for admin solving, but any puzzle that requires them is currently classified as `UNSOLVABLE`.

### Frontend admin config can drift

The admin solver UI persists local difficulty settings in browser storage. That means the frontend panel can temporarily disagree with backend canonical config unless the local state is reset or migrated.

## Hint Feature Context

The future hint feature should follow the configured staged solver, not the raw engine ordering.

The intended hint behavior is:
- inspect the current player board
- find the first easiest configured step that can make progress
- explain the move instead of auto-solving it

For the first hint implementation, the best candidate is currently `Group Confined To Line` because it is:
- early in the approved ladder
- flag-producing
- local and visual
- easier to teach than patterns or contradiction rules

See [queens-solver-steps.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-solver-steps.md) for rule-by-rule detail.
