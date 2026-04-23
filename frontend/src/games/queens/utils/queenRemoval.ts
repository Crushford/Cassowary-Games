import type { MarkType, GridSquare } from '../types/types';
import { clonePlayerMarks } from '../stores/gridUtils';
import { isValidMoveOnBoard } from './queensMoveValidation';

interface RemoveQueenPlacementResult {
  newBoard: MarkType[][];
  newHistory: MarkType[][][];
}

function findQueenPlacementIndex(
  moveHistory: MarkType[][][],
  row: number,
  col: number
): number | null {
  // Search backwards to find where this specific queen was LAST placed
  for (let i = moveHistory.length - 2; i >= 0; i--) {
    const beforeHasQueen = moveHistory[i]?.[row]?.[col] === 'queen';
    const afterHasQueen = moveHistory[i + 1]?.[row]?.[col] === 'queen';

    // Find where this queen was placed (transition from not present to present)
    if (!beforeHasQueen && afterHasQueen) {
      return i;
    }
  }

  // Check if queen exists in the very first history entry (was placed before any history was saved)
  if (moveHistory.length > 0 && moveHistory[0]?.[row]?.[col] === 'queen') {
    return 0;
  }

  return null;
}

// isValidMoveWithMarks and applyAutoFlagging are provided by the shared engine utilities.
// queenRemoval uses orthogonalMinDistance = gridSize (standard one-per-row/col rules).

function localIsValidMove(
  row: number,
  col: number,
  playerMarks: MarkType[][],
  grid: GridSquare[][],
  gridSize: number
): boolean {
  return isValidMoveOnBoard(
    { grid, playerMarks, gridSize, orthogonalMinDistance: gridSize },
    row,
    col
  );
}

function applyAutoFlagging(
  playerMarks: MarkType[][],
  _queenRow: number,
  _queenCol: number,
  grid: GridSquare[][],
  gridSize: number
): void {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (playerMarks[r][c] === null && !localIsValidMove(r, c, playerMarks, grid, gridSize)) {
        playerMarks[r][c] = 'flag';
      }
    }
  }
}

export function removeQueenPlacement(
  moveHistory: MarkType[][][],
  row: number,
  col: number,
  grid: GridSquare[][],
  gridSize: number,
  autoFlagging: boolean
): RemoveQueenPlacementResult {
  // Find where this queen was placed in history
  const placementIndex = findQueenPlacementIndex(moveHistory, row, col);

  // Create a clean copy of the board (empty)
  const virtualBoard = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null as MarkType)
  );

  // If we couldn't find the placement index, return empty board and history
  if (placementIndex === null) {
    return {
      newBoard: virtualBoard,
      newHistory: [],
    };
  }

  // Remove the history entries related to this queen placement
  const entriesToRemove = placementIndex + 1 < moveHistory.length ? 2 : 1;
  const newHistory = [...moveHistory];
  newHistory.splice(placementIndex, entriesToRemove);

  // Replay all moves from history except the removed queen placement
  if (newHistory.length > 0) {
    // Start from the first history entry (empty board)
    const currentState = clonePlayerMarks(newHistory[0]);

    // Replay each move by comparing consecutive history states
    for (let i = 0; i < newHistory.length - 1; i++) {
      const beforeState = newHistory[i];
      const afterState = newHistory[i + 1];

      if (!beforeState || !afterState) continue;

      // Find what changed between these two states
      const changes: Array<{ row: number; col: number; from: MarkType; to: MarkType }> = [];
      for (let r = 0; r < gridSize; r++) {
        if (!beforeState[r] || !afterState[r]) continue;
        for (let c = 0; c < gridSize; c++) {
          const beforeMark = beforeState[r]?.[c];
          const afterMark = afterState[r]?.[c];
          if (beforeMark !== afterMark) {
            changes.push({ row: r, col: c, from: beforeMark, to: afterMark });
          }
        }
      }

      // Apply changes: removals first, then flags, then queens (with auto-flagging)
      const removals = changes.filter((c) => c.to === null);
      const flags = changes.filter((c) => c.to === 'flag');
      const queens = changes.filter((c) => c.to === 'queen');

      for (const change of removals) {
        currentState[change.row][change.col] = null;
      }
      for (const change of flags) {
        currentState[change.row][change.col] = 'flag';
      }
      for (const change of queens) {
        currentState[change.row][change.col] = 'queen';
        if (autoFlagging) {
          applyAutoFlagging(currentState, change.row, change.col, grid, gridSize);
        }
      }
    }

    // Use the replayed state (not the last history entry, as it might still contain the removed queen)
    virtualBoard.splice(0, gridSize, ...currentState);

    // Double-check: ensure the removed queen is not in the virtual board
    if (virtualBoard[row]?.[col] === 'queen') {
      virtualBoard[row][col] = null;
      if (autoFlagging) {
        // Clear all flags and recalculate based on remaining queens
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            if (virtualBoard[r]?.[c] === 'flag') {
              virtualBoard[r][c] = null;
            }
          }
        }
        // Reapply auto-flagging for all remaining queens
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            if (virtualBoard[r]?.[c] === 'queen') {
              applyAutoFlagging(virtualBoard, r, c, grid, gridSize);
            }
          }
        }
      }
    }
  }

  return {
    newBoard: virtualBoard,
    newHistory,
  };
}

export function replayHistoryFromEntries(
  history: MarkType[][][],
  grid: GridSquare[][],
  gridSize: number,
  autoFlagging: boolean
): MarkType[][] {
  // If there's no history, return empty board
  if (history.length === 0) {
    return Array.from({ length: gridSize }, () => Array(gridSize).fill(null as MarkType));
  }

  // Start from the first history entry (initial state)
  if (!history[0] || history[0].length !== gridSize) {
    return Array.from({ length: gridSize }, () => Array(gridSize).fill(null as MarkType));
  }

  const currentState = clonePlayerMarks(history[0]);

  // Replay each move by comparing consecutive history states
  // Apply changes incrementally, one move at a time
  for (let i = 0; i < history.length - 1; i++) {
    const beforeState = history[i];
    const afterState = history[i + 1];

    // Safety check: ensure states are valid
    if (
      !beforeState ||
      !afterState ||
      beforeState.length !== gridSize ||
      afterState.length !== gridSize
    ) {
      continue;
    }

    // Find what changed - but only apply ONE change at a time (the actual move)
    // History entries represent states before each move, so the change between
    // history[i] and history[i+1] represents move i+1
    let moveApplied = false;
    for (let r = 0; r < gridSize && !moveApplied; r++) {
      if (!beforeState[r] || !afterState[r] || !currentState[r]) continue;
      for (let c = 0; c < gridSize && !moveApplied; c++) {
        const beforeMark = beforeState[r]?.[c];
        const afterMark = afterState[r]?.[c];

        // Only apply the first change we find (the actual move)
        if (beforeMark !== afterMark) {
          currentState[r][c] = afterMark;

          // If a queen was placed, auto-flag blocked squares
          if (afterMark === 'queen' && autoFlagging) {
            applyAutoFlagging(currentState, r, c, grid, gridSize);
          }

          moveApplied = true;
        }
      }
    }

    // If no single move was found, it means multiple things changed at once
    // This can happen when auto-flagging adds multiple flags, or when loading saved state
    if (!moveApplied) {
      for (let r = 0; r < gridSize; r++) {
        if (!beforeState[r] || !afterState[r] || !currentState[r]) continue;
        for (let c = 0; c < gridSize; c++) {
          const beforeMark = beforeState[r]?.[c];
          const afterMark = afterState[r]?.[c];
          if (beforeMark !== afterMark) {
            currentState[r][c] = afterMark;
            if (afterMark === 'queen' && autoFlagging) {
              applyAutoFlagging(currentState, r, c, grid, gridSize);
            }
          }
        }
      }
    }
  }

  // Use the last history entry as the source of truth
  // It represents the state after all moves except the removed one
  const lastState = history[history.length - 1];
  if (lastState && lastState.length === gridSize) {
    return clonePlayerMarks(lastState);
  }

  return currentState;
}
