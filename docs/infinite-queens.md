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
- Apply seam-fill bias at render time so blackout seam cells prefer source-side groups.
- Keep seam-fill logic as a renderer concern only; do not mutate catalog records or generation rules.

## Gameplay

- Player input operates on stitched world coordinates.
- Queens, flags, auto-flagging, and validation all work across chunk boundaries.
- There is no whole-world completion state in v1; the mode is an endless stitched run.
