# Infinite Queens Mode

## Summary

Infinite Queens is a player-facing Queens mode that loads stitched 7x7 puzzle chunks from the stitching catalog at runtime. The game starts from a valid stitched 2x2 seed area, renders a fixed mobile viewport, and expands only to the right and downward. Players can move back through already loaded space to revisit earlier chunks, but the world never generates negative coordinates or new space above/left of the seeded area.

## Runtime catalog requirements

- Catalog records must expose stable ids, incoming identity fingerprints (`leftBlackoutFingerprint`, `topBlackoutFingerprint`), and outgoing bleed metadata (`rightBleedFingerprint`, `bottomBleedFingerprint`).
- Records must include `isSeed` so the game can bootstrap from known starting chunks.
- Runtime lookup must support left fingerprint, top fingerprint, and combined left+top matching without rescanning the whole catalog on every expansion.

## World model

- Start from `(0,0)` plus matching `(1,0)`, `(0,1)`, and `(1,1)` chunks before gameplay begins.
- Keep `minX = 0` and `minY = 0` fixed for v1.
- Allow navigation back through already loaded chunks, but only generate new chunks when the viewport crosses the current right or bottom bounds.

## Rendering

- Render only the visible viewport, not the whole discovered world.
- Resolve each visible cell in this order:
  - Active layout symbol (`layout[index] !== '.'`) uses that chunk-local group directly.
  - Blackout fill override (`blackoutFillOverrides`) uses the explicit override group symbol.
  - Otherwise, seam-fill propagation picks a neighboring visible group (left/top-biased for bleed edges, then right/bottom).
  - Final fallback is nearest active group in the same chunk.
- Cells resolved via override/propagation are marked as seam-fill cells at runtime.
- Keep seam-fill logic as a renderer/runtime concern only; do not mutate catalog records or generation rules.

## Blackout Squares

- Blackout identity is still encoded in `layout` as `'.'` and in fingerprint/signature metadata.
- Fingerprints (`leftBlackoutFingerprint`, `topBlackoutFingerprint`, outgoing bleed fingerprints) are based on puzzle identity data, not on runtime seam-fill coloring.
- `blackoutFillOverrides` are explicit exceptions used when generation needed to color specific blackout cells (for example, to satisfy minimum region-size constraints) while preserving the original blackout identity for catalog matching.
- In infinite mode, blackout cells can appear visually colored because of overrides or seam-fill propagation, but that does not change the underlying catalog fingerprints.
- If a blackout cell resolves to a display group at runtime, it participates in normal gameplay (queen/flag rules, validation, and auto-flagging) through that resolved group.

## Gameplay

- Player input operates on stitched world coordinates.
- Queens, flags, auto-flagging, and validation all work across chunk boundaries.
- There is no whole-world completion state in v1; the mode is an endless stitched run.

## Known issues and deferred work

### `buildPreview` is not covered by automated tests

`StitchingPreviewService.buildPreview` generates a live 2×2 stitched preview by running the full generation pipeline for four quadrants. It is an admin/diagnostic endpoint and is not exercised by the automated test suite because:

- Generation time is unpredictable — individual quadrant generation can take minutes and exhaust all retries under heavy combined blackout signatures (especially bottom-right, which inherits bleed from both neighbours).
- `buildIrregularQuadrant` uses a backtracking solver (`resolveMaxPlacement`) to estimate the maximum achievable queen count before calling the full pipeline. The backtracker only models raw placement constraints; the full pipeline adds group-size and deterministic-solvability requirements that can make the estimated target unreachable, causing the pipeline to exhaust all 30,000 retries.
- When retries are exhausted, `ValidatedPuzzleGenerationService` returns an empty board with `success = false` rather than `null`. `buildIrregularQuadrant` now correctly detects this via `generationResult.success` and throws, but there is no fallback to a lower queen count target.

**What `buildPreview` is for:** it is a one-shot admin tool for visually inspecting a stitched board in the admin panel. It is not part of the catalog generation pipeline and does not affect runtime infinite mode.

**Deferred:** implement a fallback retry loop in `buildIrregularQuadrant` that decrements the target queen count by one and retries when the full pipeline exhausts attempts. This would make `buildPreview` reliable enough to test and would also fix intermittent failures in the admin panel when blackout signatures are heavy. The existing `allowTargetFallbackToMax` parameter was intended for this but is currently a no-op.
