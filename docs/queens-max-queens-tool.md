# Queens Max-Queens Tool

This document explains the `Max Queens` tab, why it exists, and how it relates to normal generation support.

## Purpose

The max-queens tool is a research and maintenance tool.

Use it for:
- computing exact maximum queen counts for `(size, orthogonalMinDistance)` pairs
- extending the precomputed support matrix used by workshop and batch generation
- exporting confirmed results back into code constants

Primary frontend component:
- [frontend/src/games/queens/components/admin/QueensAdminMaxQueensPanel.vue](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/components/admin/QueensAdminMaxQueensPanel.vue)

Primary backend support:
- [GenerationWorkflowService.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/application/GenerationWorkflowService.kt)
- [PrecomputedMaxQueenCounts.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/PrecomputedMaxQueenCounts.kt)
- [frontend/src/games/queens/admin/maxQueenCounts.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/admin/maxQueenCounts.ts)

## Why This Tool Exists

Normal `max` generation cannot afford to run exact maximum search interactively for every unsupported ruleset.

The exact search was observed to:
- find good answers quickly
- then spend a very long time trying to prove that a higher answer is impossible

So the project split the responsibilities:
- normal workshop and batch generation use precomputed constants
- this tool is where new constants are researched and confirmed

## Current Run Model

The tool accepts:
- comma-separated sizes
- comma-separated distances
- max concurrent jobs

It then:
- builds the cross-product
- skips distances larger than the board size
- seeds already-known combinations from the code constants
- runs only unresolved combinations

## Why It Runs Easiest First

The run order is:
- higher min distance first
- then smaller size first

That ordering was chosen because:
- larger minimum distances usually constrain the search more
- more constrained searches are more likely to finish quickly
- smaller boards are usually cheaper than larger boards

This is not a mathematical guarantee, but it is a practical heuristic for making progress faster.

## Why It Uses Bounded Parallelism

The tool does not launch every unresolved combination at once.

It uses bounded parallelism because:
- unbounded exact searches would overwhelm the machine
- many very expensive searches running together can make everything slower and harder to inspect

The UI exposes `Max concurrent jobs` so the operator can trade off throughput vs machine load.

## Persistence

The max-queens tool persists:
- size input
- distance input
- max concurrent jobs
- completed and failed result rows

Why:
- these searches can take a long time
- refresh should not erase newly confirmed results that have not yet been copied into code

This persistence is intentionally local only. The final source of truth is still the checked-in constant table.

## Output Workflow

Typical workflow:

1. run unresolved combinations
2. let completed rows accumulate in local storage
3. use `Copy Constants`
4. paste the new constant block into both:
- [frontend/src/games/queens/admin/maxQueenCounts.ts](/Users/james/Documents/Honey-Pot-Ants/frontend/src/games/queens/admin/maxQueenCounts.ts)
- [queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/PrecomputedMaxQueenCounts.kt](/Users/james/Documents/Honey-Pot-Ants/queens-admin-backend/src/main/kotlin/com/queens/admin/domain/service/PrecomputedMaxQueenCounts.kt)

## Frontier Filtering

Not every precomputed distance should become a normal supported generation ruleset.

After adding new max counts, also check the frontier rule:
- if a smaller min distance has the same max queen count as a stricter distance for the same size, the smaller distance is redundant and should remain blocked for normal generation

That means:
- raw constants may contain more data than the normal generation support list
- generation support should keep only frontier distances

## How To Update This Tool Safely

When changing the max-queens workflow:

1. keep the distinction between:
- exact research tool
- normal generation support

2. if you change result persistence, preserve refresh safety for completed rows
3. if you change scheduling, keep bounded parallelism unless there is a strong replacement
4. when adding new constants, update both frontend and backend copies together
5. re-check frontier filtering after every matrix expansion

## Common Failure Modes

### Search appears stuck for a long time

Usually means:
- the exact solver is still trying to prove optimality after already finding a strong best-so-far answer

That is expected for some combinations.

### Workshop or batch still refuses a newly solved combination

Usually means:
- the new constants were not copied into both code paths
- or the combination is still filtered out as redundant by the frontier rule
