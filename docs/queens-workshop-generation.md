# Queens Workshop Generation

This document explains the `Workshop` tab in the Queens admin area: what it does, how it talks to the backend, and why it exists separately from batch generation.

## Purpose

The workshop is the interactive single-board tool.

Use it for:
- creating an empty board with a specific ruleset
- generating one complete puzzle with live progress
- painting or erasing regions manually
- stepping through the generation pipeline while debugging
- testing custom template-seed layouts

Primary frontend entrypoint:
- [frontend/src/games/queens/views/QueensAdmin.vue](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/views/QueensAdmin.vue)

Shared frontend state:
- [frontend/src/games/queens/stores/queensAdminStore.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/stores/queensAdminStore.ts)

## Main Backend Flow

The workshop uses:
- [BoardOperationFacade.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/BoardOperationFacade.kt)
- [GenerationWorkflowService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/GenerationWorkflowService.kt)
- [GenerationJobService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/GenerationJobService.kt)
- [ValidatedPuzzleGenerationService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/ValidatedPuzzleGenerationService.kt)

There are 2 workshop styles of operation:

### Direct board operations

Examples:
- create empty board
- place queens
- assign initial colors
- expand groups
- expand blocked squares

These are synchronous backend operations and return an immediate board result.

### Full generated board

`Generate Full Board` runs as a tracked backend job with progress snapshots.

Why:
- validated generation can take multiple attempts
- the workshop wants to show progress, intermediate boards, and metrics
- the request should be cancellable

## Generation Parameters

The workshop exposes:
- `boardSize`
- `queenCountMode`
- `targetQueenCount`
- `orthogonalMinDistance`
- `minimumGroupSize`
- `generationStrategy`
- `previewIntervalMs`

Important behavior:
- `queenCountMode = max` is only allowed for supported size and distance pairs from the precomputed max-queen matrix
- unsupported `max` combinations are blocked before generation begins
- `exact` mode remains the normal way to experiment with arbitrary target queen counts

## Why `max` Mode Is Restricted

Exact max-queen resolution was found to be too expensive for normal workshop use on larger boards.

Real outcome:
- the system could spend minutes resolving the maximum queen count before the first real generation attempt even started

Because of that:
- normal workshop `max` generation now relies on precomputed constants
- unsupported `max` pairs are blocked instead of hanging in target resolution
- the expensive exact search is pushed into the dedicated `Max Queens` tab

## Generation Strategies

The workshop exposes multiple generation strategies because the project actively experiments with how region growth behaves.

Current strategies:
- `baseline`
- `marker-guided`
- `template-seeded`

These are production strategies, not just UI labels. They affect how generated regions are seeded or expanded.

Why this matters:
- the same ruleset can produce different puzzle families depending on strategy
- batch generation exists partly to compare those strategies at scale

## Live Progress And Cancellation

The workshop generation job reports:
- stage
- message
- colored cell counts
- generation metrics
- current board snapshot

`GenerationJobService` was expanded to make pre-generation bottlenecks visible too. In particular, `max` queen-count resolution now reports a dedicated `RESOLVING_TARGET_QUEENS` stage rather than appearing stuck at a generic start state.

This exists because otherwise a valid but expensive pre-generation phase looked like a broken request.

## Workshop Persistence

Workshop inputs are stored in local storage by:
- [frontend/src/games/queens/admin/inputPersistence.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/admin/inputPersistence.ts)

Persisted fields include:
- board size
- queen count mode
- target queens
- orthogonal min distance
- minimum group size
- preview interval
- generation strategy
- selected tool
- selected color
- template-seed cells

Why:
- workshop use is exploratory
- losing all settings on refresh is frustrating when debugging the generator

## How To Update Workshop Generation Safely

When changing workshop generation behavior:

1. update backend workflow or job services first
2. update the workshop UI controls and any persistence migrations
3. verify `max`-mode support rules still match the precomputed matrix
4. test both:
- synchronous board operations
- full tracked generation jobs

If the change touches solvability logic, also check:
- [docs/queens-generation-and-max-queens.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-generation-and-max-queens.md)

## Common Failure Modes

### Request looks stuck before attempt 1

Usually means:
- the backend is still resolving max queen count

That is why the dedicated `RESOLVING_TARGET_QUEENS` stage and progress messages were added.

### Generation succeeds but puzzle is not saved later

Usually means:
- the staged solver assessed the final puzzle as `UNSOLVABLE`

This is intentional policy, not necessarily a storage bug.

### Workshop behavior disagrees with catalog behavior

Check:
- whether the board uses a supported ruleset
- whether the backend staged solver config changed
- whether local persisted workshop or solver admin settings are stale
