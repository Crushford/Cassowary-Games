# Queens Admin Overview

This document explains the non-solver parts of the Queens admin area: the generation workshop, batch generation, catalog cleanup, and max-queens tooling.

The goal of this doc set is to help the next developer understand not just what each tab does, but why the admin section was shaped this way.

## Admin Tabs

The Queens admin page lives in:
- [frontend/src/games/queens/views/QueensAdmin.vue](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/views/QueensAdmin.vue)

It currently exposes 5 tabs:

1. `Workshop`
2. `Batch Generate`
3. `Catalog`
4. `Max Queens`
5. `Solver`

The solver tab is documented separately in:
- [docs/queens-solver-overview.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-solver-overview.md)
- [docs/queens-solver-steps.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-solver-steps.md)
- [docs/queens-solver-config.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-solver-config.md)
- [docs/queens-generation-and-max-queens.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-generation-and-max-queens.md)

This second doc set covers the other 4 tabs.

## Core Idea

The admin area is intentionally split into different tools because they answer different operational questions.

- `Workshop` is for interactive, single-board experimentation and generation debugging.
- `Batch Generate` is for producing many puzzles and comparing strategies.
- `Catalog` is for inspecting and cleaning the stored puzzle database.
- `Max Queens` is a one-time research tool for expanding the precomputed support matrix that normal generation depends on.

Keeping those separate matters because:
- some actions are interactive and stateful
- some are long-running backend jobs
- some are pure catalog maintenance
- some are intentionally expensive research tooling that should not leak into normal generation UX

## Backend Architecture

The main backend entrypoint for the admin area is:
- [queens-admin-backend/src/main/kotlin/com/queens/admin/api/GenerationController.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/api/GenerationController.kt)

Main backend services:
- [GenerationWorkflowService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/GenerationWorkflowService.kt)
- [GenerationJobService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/GenerationJobService.kt)
- [BatchGenerationService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/BatchGenerationService.kt)
- [PuzzleCatalogService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/PuzzleCatalogService.kt)
- [BoardOperationFacade.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/BoardOperationFacade.kt)

Roughly:
- `BoardOperationFacade` and `GenerationWorkflowService` power interactive workshop and board operations
- `GenerationJobService` wraps long-running single-generation jobs with progress snapshots
- `BatchGenerationService` coordinates many generation jobs at once
- `PuzzleCatalogService` owns reading, grouping, random lookup, save, and delete behavior for persisted puzzles

## Frontend State And Persistence

The admin frontend uses:
- [frontend/src/games/queens/stores/queensAdminStore.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/stores/queensAdminStore.ts)
- [frontend/src/games/queens/admin/inputPersistence.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/admin/inputPersistence.ts)

Important persistence decisions:
- workshop inputs persist in local storage
- batch setup inputs persist in local storage
- max-queens inputs and completed rows persist in local storage
- solver admin inputs and session persist in local storage
- tracked batch ids persist in local storage so completed batches can be restored

This makes the admin area resilient across refreshes, but it also means the UI can preserve old experimental settings longer than expected. When behavior looks strange, check whether persisted local inputs are part of the story.

## Why The Admin Area Feels Complex

The admin surface grew around real operational needs:
- generation debugging
- staged-solver grading
- large-batch production
- catalog cleanup
- max-queen support research

A lot of the complexity is intentional:
- normal generation is restricted to combinations backed by precomputed max-queen data
- batch generation can prioritize sparse catalog buckets instead of running combinations evenly
- catalog cleanup understands redundant rulesets that are now blocked for generation
- the max-queens tab exists precisely because exact max search is too expensive for normal generation

Those design choices are described in the docs below.

## Related Docs

- [docs/queens-workshop-generation.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-workshop-generation.md)
- [docs/queens-batch-generation.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-batch-generation.md)
- [docs/queens-catalog.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-catalog.md)
- [docs/queens-max-queens-tool.md](/Users/james/Documents/Honey-Pot-Ants/docs/queens-max-queens-tool.md)
