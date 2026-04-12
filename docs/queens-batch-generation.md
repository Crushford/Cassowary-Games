# Queens Batch Generation

This document explains the `Batch Generate` tab, why it exists, and how the current scheduling rules work.

## Purpose

Batch generation exists for production-scale puzzle generation and comparison work.

Use it for:
- generating many puzzles at once
- comparing generation strategies
- saving unique successful puzzles to the catalog
- filling sparse catalog buckets

Primary frontend component:
- [frontend/src/games/queens/components/admin/QueensAdminBatchPanel.vue](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/components/admin/QueensAdminBatchPanel.vue)

Primary backend service:
- [queens-admin-backend/src/main/kotlin/com/queens/admin/application/BatchGenerationService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/BatchGenerationService.kt)

## Why Batch Generation Is Separate

The batch tool is not just “workshop, many times.”

It adds features the workshop does not need:
- multiple sizes at once
- multiple distances at once
- multiple strategies at once
- concurrency control
- tracked batch snapshots
- optional save-to-catalog behavior
- sparse-bucket scheduling

## Supported Combinations

Batch generation only queues size and min-distance combinations backed by the precomputed max-queen table.

This is intentional.

Why:
- exact max search is too expensive for normal production runs
- batch generation should fail fast rather than silently launch unsupported long-running searches

Even if a size or distance is selected in the UI:
- unsupported pairs are skipped
- if nothing supported remains, the batch cannot start

## Inputs

The batch setup currently includes:
- puzzle sizes
- orthogonal min distances
- runs per combination
- max concurrent jobs
- run mode
- queen count mode
- target queens
- minimum region size
- generation strategies
- save successful puzzles toggle

Persisted in local storage:
- selected sizes
- selected distances
- runs per combination
- max concurrent jobs
- run mode
- queen count mode
- target queens
- orthogonal min distance
- minimum group size
- save toggle
- selected strategies

## Run Modes

### Even Cartesian Mix

This is the standard mode.

Meaning:
- build the full supported cross-product of selected sizes, selected distances, selected strategies, and runs-per-combination
- queue those runs evenly in the order they were built

Use it when:
- you want broad even coverage
- you care more about comparing strategies than filling the catalog

### Lowest Puzzle Count First

This mode was added because the catalog can become unbalanced.

Meaning:
- before the batch starts, the backend counts existing saved puzzles in each generation bucket
- runs are sorted so buckets with the fewest saved puzzles go first

Current bucket key:
- `size`
- `orthogonalMinDistance`
- `targetQueenCount`
- `minimumGroupSize`

This is intentionally based on stored puzzle shape, not generation strategy.

Why:
- strategy is a production method
- the catalog imbalance problem is about which puzzle buckets exist, not which strategy produced them

Current limitation:
- this is a one-time sort at batch start
- the queue is not dynamically reshuffled after every successful save

That was a deliberate first version because it solves the main catalog-balancing problem without making batch scheduling much more complex.

## Save Behavior

If `Save successful puzzles` is enabled:
- successful generated puzzles are passed to `PuzzleCatalogService`
- canonical duplicates are skipped
- puzzles assessed as `UNSOLVABLE` are rejected

Per-run persistence outcomes include:
- `SAVED`
- `DUPLICATE`
- `UNSOLVABLE`
- `ERROR`

This behavior matters because batch generation is both:
- a production tool
- a catalog curation tool

It should not silently create duplicates or admit puzzles outside the approved staged solver.

## Batch Tracking

Tracked batch ids are stored in local storage by the admin store.

Why:
- users should be able to refresh or leave the page and come back to recent batches
- long-running production work should not disappear with one navigation

The UI restores active and recent batch snapshots and keeps the latest few tracked batches visible.

## Completed Run Metadata

Batch runs now surface completed-puzzle metadata such as:
- completed queen count
- assessed difficulty

This exists because batch output needs to be inspectable without forcing the user into the catalog first.

## How To Update Batch Generation Safely

When changing batch behavior:

1. update the batch input DTO and backend scheduler together
2. update the UI and local-storage persistence format together
3. verify supported-combination filtering still matches the max-queen table
4. verify both run modes:
- `cartesian`
- `lowest-count`
5. verify save outcomes still distinguish:
- saved
- duplicate
- unsolvable
- error

If the change touches max-queen support, also update:
- [docs/queens-max-queens-tool.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-max-queens-tool.md)
- [docs/queens-generation-and-max-queens.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-generation-and-max-queens.md)
