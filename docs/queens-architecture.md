# Queens Game Architecture

## Layer overview

The Queens game is split into two layers:

### 1. Shared engine utilities (`frontend/src/games/queens/utils/queens*.ts`)

Pure, stateless functions that operate on board data passed in as arguments.
No store imports, no Vue reactivity, no side effects.

| File | Responsibility |
| ---- | -------------- |
| `queensRules.ts` | Atomic rule checks — diagonal touch, orthogonal conflict |
| `queensBoardQueries.ts` | Board inspection — count marks, collect positions, derive puzzle parameters |
| `queensMoveValidation.ts` | Move legality — `isValidMoveOnBoard(ctx, row, col)` |
| `queensAutoFlagging.ts` | Auto-flag computation — `getAutoFlagPositions(ctx)` returns positions, no mutations |
| `queensBoardValidation.ts` | Completion evaluation — `evaluateBoardCompletion(ctx)` |
| `queensErrorDetection.ts` | Constraint violation detection and error message derivation |

**When to add logic here:** Any board rule, validation check, or computation that can be expressed as a pure function over board state. If a future store (e.g. `infiniteQueensStore`) would need the same logic, it belongs here.

**When not to add logic here:** UI side effects, store mutations, timers, persistence, animations, routing, or anything that reads Vue reactive state.

### 2. Store orchestration (`frontend/src/games/queens/stores/queensStore.ts` and friends)

Stores own everything that is game-mode-specific or has side effects:

- Player interaction flow (`handleSquareClick`, `placeQueen`, `removeMark`)
- Error display timing (1-second debounce via `flaggedGroupTimestamps`)
- Animation triggers (`triggerAutoFlagAnimation`, combo feedback)
- Timers and intervals (error checking, progress saving)
- Persistence (localStorage, campaign progress)
- Route navigation
- Tutorial and campaign logic
- Mode switching (standard / speed / rotate)

Stores **call** engine utilities rather than owning rule logic inline.

## Key design rules

1. **New rule logic goes in utilities, not stores.** If you find yourself writing a board constraint check inside an action, move it to the appropriate utility file first.

2. **Utilities accept all their inputs as arguments.** No reaching into store state. The standard input shape is a context object:

   ```ts
   { grid, playerMarks, gridSize, orthogonalMinDistance }
   ```

3. **Utilities compute; stores apply.** A utility returns positions to flag, error cells, or a validation result. The store decides when and how to apply those results (including animations, timing, and persistence).

4. **`orthogonalMinDistance = gridSize` is the standard level-builder default.** When calling shared utilities from stores or admin tools that do not support non-standard orthogonal distances, pass `orthogonalMinDistance: gridSize`.

## Adding a new variant store (e.g. `infiniteQueensStore`)

Import directly from the engine utilities — do not copy logic:

```ts
import { isValidMoveOnBoard } from 'frontend/src/games/queens/utils/queensMoveValidation';
import { getAutoFlagPositions } from 'frontend/src/games/queens/utils/queensAutoFlagging';
import { evaluateBoardCompletion } from 'frontend/src/games/queens/utils/queensBoardValidation';
import { detectConstraintViolations, deriveErrorMessage } from 'frontend/src/games/queens/utils/queensErrorDetection';
```

The store is responsible for its own world-coordinate mapping (if any), UI state, and persistence.
