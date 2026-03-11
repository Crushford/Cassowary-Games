# MR Title
Tokenize Queens incremental colors and align puzzle group palette in Tailwind theme

# MR Description
## Summary
This MR moves Incremental Queens UI colors to semantic Tailwind theme tokens and consolidates puzzle group colors under `theme.extend.colors.group` using `base`/`hover` naming.

## What Changed
- Added semantic `incremental` color tokens in:
  - `frontend/tailwind.config.js`
- Migrated Incremental Queens view classes from raw palette utilities to theme tokens in:
  - `frontend/src/views/IncrementalQueensGame.vue`
- Kept Queens puzzle-group colors in Tailwind by color-name (allowed exception) and simplified them to:
  - `group.<color>.base`
  - `group.<color>.hover`
- Updated Queens color mappings to use new group token names:
  - `frontend/src/components/queens/QueensSquare.vue`
  - `frontend/src/utils/colorPalette.ts`
- Updated Queens shell gradient usage in:
  - `frontend/src/views/QueensGame.vue`

## Why
- Prepares the codebase for light/dark theming by removing hardcoded per-component palette classes.
- Keeps puzzle color groups explicit by color-name while making all other UI color usage semantic.
- Reduces color drift and makes future theme swaps safer.

## Validation
- `yarn --cwd frontend eslint --ext .vue src/views/IncrementalQueensGame.vue`
- `yarn --cwd frontend build`

## Notes
- `frontend/src/stores/queensStore.ts` is currently modified locally but intentionally not included in this MR.
- `frontend/src/components/level-builder/Square.vue` has a local theme-token update pending and was left out of this MR commit due existing lint-hook constraints on component naming.
