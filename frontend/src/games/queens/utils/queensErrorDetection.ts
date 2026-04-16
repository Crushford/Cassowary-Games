/**
 * queensErrorDetection.ts
 *
 * Stateless detection of board constraint violations and error message derivation.
 *
 * Split into two concerns:
 *   1. `detectConstraintViolations` — pure detection: which groups/rows/cols are violated
 *      and which cells are affected. Does NOT apply timing or mutate store state.
 *      The store is responsible for the 1-second confirmation debounce.
 *
 *   2. `deriveErrorMessage` — given detected violations and queen positions, returns
 *      a human-readable error string (or null). Prioritises diagonal conflicts.
 *
 * No store dependencies. Reusable by queensStore, infiniteQueensStore, and tests.
 */

import type { GridSquare, MarkType, Pos } from '../types/types';
import { requiresLineCoverage } from './queensBoardQueries';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single constraint violation. `groupKey` is a stable string identifier used by the
 * store to track per-violation confirmation timestamps (the 1-second debounce).
 * `affectedCells` are the positions that become error squares once confirmed.
 */
export interface QueensConstraintViolation {
  groupKey: string;
  affectedCells: Pos[];
}

export interface QueensErrorDetectionContext {
  grid: GridSquare[][];
  playerMarks: MarkType[][];
  gridSize: number;
  targetQueenCount: number;
  orthogonalMinDistance: number;
}

export interface QueensErrorDetectionResult {
  /** Violations that require the store's 1-second confirmation debounce before showing. */
  timedViolations: QueensConstraintViolation[];
  /** Diagonal-touch violations — shown immediately, no debounce. */
  immediateDiagonalErrors: Pos[];
  hasDiagonalConflicts: boolean;
  /** All queen positions on the board (for passing to deriveErrorMessage). */
  allQueenPositions: Pos[];
}

// ---------------------------------------------------------------------------
// detectConstraintViolations
// ---------------------------------------------------------------------------

/**
 * Scans the board for every constraint violation and returns structured results.
 * Does not interact with store state, timers, or UI.
 *
 * Violations returned:
 *   - Fully-flagged rows/columns (when line coverage is required)
 *   - Queens violating the orthogonal minimum distance rule (same row or column)
 *   - Fully-flagged color groups
 *   - Multiple queens in the same color group
 *   - Diagonally touching queens (immediate — no debounce)
 */
export function detectConstraintViolations(
  ctx: QueensErrorDetectionContext
): QueensErrorDetectionResult {
  const { grid, playerMarks, gridSize, targetQueenCount, orthogonalMinDistance } = ctx;
  const timedViolations: QueensConstraintViolation[] = [];
  const lineCoverageRequired = requiresLineCoverage(
    targetQueenCount,
    orthogonalMinDistance,
    gridSize
  );

  // --- Rows: fully flagged ------------------------------------------------
  if (lineCoverageRequired) {
    for (let row = 0; row < gridSize; row++) {
      const isFullyFlagged = playerMarks[row].every((mark) => mark === 'flag');
      if (isFullyFlagged) {
        timedViolations.push({
          groupKey: `row-flag-${row}`,
          affectedCells: Array.from({ length: gridSize }, (_, col) => ({ row, col })),
        });
      }
    }
  }

  // --- Rows: orthogonal distance violations --------------------------------
  for (let row = 0; row < gridSize; row++) {
    const queenCols: number[] = [];
    for (let col = 0; col < gridSize; col++) {
      if (playerMarks[row][col] === 'queen') queenCols.push(col);
    }
    const conflictingCols = new Set<number>();
    for (let i = 0; i < queenCols.length; i++) {
      for (let j = i + 1; j < queenCols.length; j++) {
        const left = queenCols[i]!;
        const right = queenCols[j]!;
        if (Math.abs(left - right) < orthogonalMinDistance) {
          conflictingCols.add(left);
          conflictingCols.add(right);
        }
      }
    }
    if (conflictingCols.size > 0) {
      timedViolations.push({
        groupKey: `row-queen-${row}`,
        affectedCells: [...conflictingCols].map((col) => ({ row, col })),
      });
    }
  }

  // --- Columns: fully flagged ---------------------------------------------
  if (lineCoverageRequired) {
    for (let col = 0; col < gridSize; col++) {
      const isFullyFlagged = playerMarks.every((rowArr) => rowArr[col] === 'flag');
      if (isFullyFlagged) {
        timedViolations.push({
          groupKey: `col-flag-${col}`,
          affectedCells: Array.from({ length: gridSize }, (_, row) => ({ row, col })),
        });
      }
    }
  }

  // --- Columns: orthogonal distance violations -----------------------------
  for (let col = 0; col < gridSize; col++) {
    const queenRows: number[] = [];
    for (let row = 0; row < gridSize; row++) {
      if (playerMarks[row][col] === 'queen') queenRows.push(row);
    }
    const conflictingRows = new Set<number>();
    for (let i = 0; i < queenRows.length; i++) {
      for (let j = i + 1; j < queenRows.length; j++) {
        const top = queenRows[i]!;
        const bottom = queenRows[j]!;
        if (Math.abs(top - bottom) < orthogonalMinDistance) {
          conflictingRows.add(top);
          conflictingRows.add(bottom);
        }
      }
    }
    if (conflictingRows.size > 0) {
      timedViolations.push({
        groupKey: `col-queen-${col}`,
        affectedCells: [...conflictingRows].map((row) => ({ row, col })),
      });
    }
  }

  // --- Color groups: fully flagged ----------------------------------------
  const colorGroups = buildColorGroups(grid, gridSize);
  for (const [color, squares] of Object.entries(colorGroups)) {
    const isFullyFlagged = squares.every((pos) => playerMarks[pos.row][pos.col] === 'flag');
    if (isFullyFlagged) {
      timedViolations.push({
        groupKey: `color-flag-${color}`,
        affectedCells: [...squares],
      });
    }
  }

  // --- Color groups: multiple queens --------------------------------------
  for (const [color, squares] of Object.entries(colorGroups)) {
    const queensInGroup = squares.filter((pos) => playerMarks[pos.row][pos.col] === 'queen');
    if (queensInGroup.length > 1) {
      timedViolations.push({
        groupKey: `color-queen-${color}`,
        affectedCells: [...queensInGroup],
      });
    }
  }

  // --- Diagonal conflicts (immediate) -------------------------------------
  const allQueenPositions: Pos[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (playerMarks[row][col] === 'queen') allQueenPositions.push({ row, col });
    }
  }

  const diagonalConflictKeys = new Set<string>();
  for (let i = 0; i < allQueenPositions.length; i++) {
    const q1 = allQueenPositions[i]!;
    for (let j = i + 1; j < allQueenPositions.length; j++) {
      const q2 = allQueenPositions[j]!;
      if (Math.abs(q1.row - q2.row) === 1 && Math.abs(q1.col - q2.col) === 1) {
        diagonalConflictKeys.add(`${q1.row},${q1.col}`);
        diagonalConflictKeys.add(`${q2.row},${q2.col}`);
      }
    }
  }

  const immediateDiagonalErrors: Pos[] = [...diagonalConflictKeys].map((key) => {
    const [row, col] = key.split(',').map(Number);
    return { row: row!, col: col! };
  });

  return {
    timedViolations,
    immediateDiagonalErrors,
    hasDiagonalConflicts: diagonalConflictKeys.size > 0,
    allQueenPositions,
  };
}

// ---------------------------------------------------------------------------
// deriveErrorMessage
// ---------------------------------------------------------------------------

export interface QueensErrorMessageContext extends QueensErrorDetectionContext {
  errorSquares: Set<string>;
  queenPositions: Pos[];
  hasDiagonalConflicts: boolean;
}

/**
 * Given the current error state, returns the most appropriate human-readable error
 * message, or null if there are no errors.
 *
 * Priority order:
 *   1. Diagonal conflicts
 *   2. Same-row distance violations
 *   3. Same-column distance violations
 *   4. Fully-flagged rows (line coverage)
 *   5. Fully-flagged columns (line coverage)
 *   6. Multiple queens in a color group
 */
export function deriveErrorMessage(ctx: QueensErrorMessageContext): string | null {
  const {
    errorSquares,
    queenPositions,
    hasDiagonalConflicts,
    grid,
    playerMarks,
    gridSize,
    targetQueenCount,
    orthogonalMinDistance,
  } = ctx;

  if (errorSquares.size === 0) return null;

  if (hasDiagonalConflicts) {
    return 'Queens cannot touch diagonally';
  }

  const lineCoverageRequired = requiresLineCoverage(
    targetQueenCount,
    orthogonalMinDistance,
    gridSize
  );

  // Same-row distance conflicts
  for (let row = 0; row < gridSize; row++) {
    const queensInRow = queenPositions.filter((q) => q.row === row);
    for (let i = 0; i < queensInRow.length; i++) {
      for (let j = i + 1; j < queensInRow.length; j++) {
        if (Math.abs(queensInRow[i]!.col - queensInRow[j]!.col) < orthogonalMinDistance) {
          return `Queens in the same row must be at least ${orthogonalMinDistance} apart`;
        }
      }
    }
  }

  // Same-column distance conflicts
  for (let col = 0; col < gridSize; col++) {
    const queensInCol = queenPositions.filter((q) => q.col === col);
    for (let i = 0; i < queensInCol.length; i++) {
      for (let j = i + 1; j < queensInCol.length; j++) {
        if (Math.abs(queensInCol[i]!.row - queensInCol[j]!.row) < orthogonalMinDistance) {
          return `Queens in the same column must be at least ${orthogonalMinDistance} apart`;
        }
      }
    }
  }

  // Fully-flagged rows
  if (lineCoverageRequired) {
    for (let row = 0; row < gridSize; row++) {
      if (playerMarks[row].every((mark) => mark === 'flag')) {
        return 'Each row must still allow a queen';
      }
    }
  }

  // Fully-flagged columns
  if (lineCoverageRequired) {
    for (let col = 0; col < gridSize; col++) {
      if (playerMarks.every((rowArr) => rowArr[col] === 'flag')) {
        return 'Each column must still allow a queen';
      }
    }
  }

  // Multiple queens in a color group
  const colorGroups = buildColorGroups(grid, gridSize);
  for (const squares of Object.values(colorGroups)) {
    const queensInColor = queenPositions.filter((q) =>
      squares.some((s) => s.row === q.row && s.col === q.col)
    );
    if (queensInColor.length > 1) {
      return 'Only 1 queen per color group';
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildColorGroups(grid: GridSquare[][], gridSize: number): Record<string, Pos[]> {
  const groups: Record<string, Pos[]> = {};
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const color = grid[row][col].groupColor;
      if (!color) continue;
      if (!groups[color]) groups[color] = [];
      groups[color].push({ row, col });
    }
  }
  return groups;
}
