# Codebase Cleanup — Remaining Tasks

Phases 1 and 2 are complete. What follows are the remaining tasks, ordered by risk.

---

## Low risk

### Remove `debugLogs` / `verboseMode` from `levelBuilderStore`

`levelBuilderStore` carries `debugLogs: string[]`, `verboseMode: boolean`, and `addDebugLog()` as permanent store state. This is development scaffolding mixed into production state — it adds noise to every store snapshot and makes the state interface harder to read.

**What to do**
- Delete `debugLogs`, `verboseMode`, and `addDebugLog` from state and actions
- Replace any remaining `addDebugLog` call sites with `console.log` (dev only) or just remove them
- Delete the `logColorDistribution` action which only uses debug logs

---

### Replace `countFlags` / `countQueens` with the existing `countCellsWithState`

`queensStore` defines `countFlags(playerMarks)` and `countQueens(playerMarks)` as store actions (lines ~2608–2626). `countCellsWithState(grid, playerMarks, targetState)` already exists in `gridUtils.ts` and does the same thing.

**What to do**
- Replace calls to `this.countFlags(marks)` with `countCellsWithState(this.grid, marks, 'flag')`
- Replace calls to `this.countQueens(marks)` with `countCellsWithState(this.grid, marks, 'queen')`
- Delete the two store actions

---

### Fix `getFormattedPuzzleTime` duplicating `formatTime`

`queensStore` has a `formatTime` getter (line ~1173) and a separate `getFormattedPuzzleTime` getter (line ~1188) that contains a copy of the same minute/second formatting logic.

**What to do**
- Replace the body of `getFormattedPuzzleTime` with `return this.puzzleCompletionTime === null ? null : this.formatTime(this.puzzleCompletionTime)`
- Delete the duplicated formatting code

---

### Move `isDiagonalTouch` and `isOrthogonalConflict` to `gridUtils`

These are pure geometry helpers defined at module level in `queensStore.ts` (lines ~132–143). They have no store dependency and belong in `gridUtils.ts` alongside `isValidPosition` and `isValidQueenPlacement`.

**What to do**
- Move both functions into `gridUtils.ts` and export them
- Update the import in `queensStore.ts`

---

### Type the `store: any` props in `FarmSquare` and `CasinoSquare`

Both components declare `store: any` as a prop. This defeats type checking for all store access inside these components.

**What to do**
- Define a minimal interface for the expected store shape (the subset of methods/state each component actually uses)
- Replace `store: any` with that interface in both files

---

### Audit `showCampaignIntroModal` open action

`queensStore` has `closeCampaignIntroModal()` but the corresponding open is done by direct state mutation (`this.showCampaignIntroModal = true`) scattered across actions. Inconsistent with the `open*/close*` pattern used for other modals.

**What to do**
- Add `openCampaignIntroModal()` action
- Replace all `this.showCampaignIntroModal = true` assignments with calls to `openCampaignIntroModal()`

---

## Medium risk

### Extract rotate mode state out of `queensStore`

Rotate mode state — `boardRotationCount`, `rotationHistory`, `isSwipeActive`, `swipePlacedFlags`, `pendingRotateTimeout`, `lastManualInteractionAt` — and its actions (`onSwipeStart`, `onSwipeEnd`, `rotateBoard90CW`, `rotateGridOnly90CW`, `startRotateMode`, `resetRotateMode`, `scheduleRotateAfterDelay`, `clearPendingRotateTimeout`) are self-contained relative to the rest of the store. This is a lower-risk extraction than campaign or hint state.

**What to do**
1. Create `frontend/src/games/queens/stores/queensRotateModeStore.ts`
2. Move the state/actions listed above into it
3. In `queensStore`, access rotate state lazily via `useQueensRotateModeStore()` inside relevant actions
4. Update `QueensGame.vue` and `PlayGrid.vue` to import from the new store where needed
5. Run `vitest run` to confirm nothing broke

---

### Extract hint display state out of `queensStore`

Hint state — `hintMessage`, `hintStep`, `hintEvidenceCellKeys`, `hintOutputCellKeys`, `hintDisplayTimeout` — and its actions (`clearHintState`, `showHint`) and getters (`isHintEvidenceCell`, `isHintOutputCell`) are the most self-contained domain in `queensStore`.

Note: `requestHint` and `applyResolvedSolverStep` cannot move — they depend on board state. Leave them in `queensStore` but have them call into the hint store for display state.

**What to do**
1. Create `frontend/src/games/queens/stores/queensHintStore.ts`
2. Move the state/getters/actions listed above
3. In `queensStore`, replace direct hint-state mutations with lazy `useQueensHintStore()` calls inside the relevant actions
4. Update component imports
5. Run `vitest run` before continuing

---

### Complete modal open/close consistency in `plantStore`

`plantStore` has `showValidationModal` and `showSaveModal` with `open*/close*` action pairs. Verify both have matching open actions (close actions exist at lines ~255–269, open actions may be missing).

**What to do**
- Check `openValidationModal` and `openSaveModal` exist alongside their close counterparts
- If missing, add them and replace any direct `this.show* = true` assignments

---

## Higher risk / larger scope

### Extract queen placement algorithm from `levelBuilderStore`

`placeAllQueens` and `placeRandomQueen` mutate store state directly and are entangled with `verboseMode`/`addDebugLog`. Once `debugLogs` is removed (see above), extracting these becomes cleaner.

**What to do**
1. Convert `placeRandomQueen` to a pure function: `placeRandomQueen(grid, gridSize, marks): boolean` — return success/failure without mutating store state
2. Convert `placeAllQueens` to: `placeAllQueens(grid, gridSize): MarkType[][] | null` — return the solved marks array or null on failure
3. Move both into `frontend/src/games/queens/utils/queenPlacement.ts`
4. The store actions become thin wrappers that call these functions and apply the result

---

### Extract campaign progression out of `queensStore`

Campaign state and actions are the largest domain mixed into `queensStore`. Do this after the hint and rotate mode extractions are complete and tests are green.

Campaign-specific state: `isCampaignMode`, `currentCampaignBucket`, `showCampaignIntroModal`, `isCampaignFullyComplete`, `campaignBucketCache`, `campaignSolvabilityCache`, `campaignDifficultyCache`, `storyUnlockedLevelIndex`, `storyPassedLevelBestTimes`, `storyLevelBestTimes`, `hasUsedCampaignHintThisAttempt`, `allowCampaignHintPassForTesting`

Campaign-specific actions: `loadCampaignCatalog`, `getCampaignBuckets`, `advanceCampaign`, `startCampaign`, `recordCampaignLevelResult`, `getCampaignLevelEntries`, `getCampaignChapterEntries`, and related helpers.

---

## Phase 4 — Shared Grid Infrastructure (do last)

### 4.1 Move `isDiagonalTouch` / `isOrthogonalConflict` to `gridUtils` *(see low-risk above)*

### 4.2 Define shared `GridSquare` base interface

Queens, keno, harvest, and plant each define their own grid cell shape. Create `frontend/src/shared/types/grid.ts` with a minimal base interface and have game-specific types extend it.

### 4.3 Evaluate `BaseBoard` component vs. composables

6+ square components exist with no common base. Prototype a `useBoardCellSelection` composable with FarmBoard + CasinoBoard (the two most similar) and evaluate before applying broadly.

---

## Notes

- No behaviour changes. If the game plays the same before and after, the task is done correctly.
- Run `vitest run` after each medium/high-risk task. The story specs are the safety net.
- Commit each task separately so regressions are easy to bisect.
