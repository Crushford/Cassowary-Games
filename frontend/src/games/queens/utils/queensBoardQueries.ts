/**
 * queensBoardQueries.ts
 *
 * Stateless helpers that inspect or derive information from board state.
 * All functions accept board data as arguments and return values — no store dependencies.
 * Safe to use from queensStore, infiniteQueensStore, admin tools, and tests.
 */

import type { GridSquare, MarkType, Pos } from '../types/types';

// ---------------------------------------------------------------------------
// Mark counting / position collection
// ---------------------------------------------------------------------------

/** Count the number of queen marks on a board. */
export function countQueenMarks(playerMarks: MarkType[][]): number {
  let count = 0;
  for (const row of playerMarks) {
    for (const mark of row) {
      if (mark === 'queen') count++;
    }
  }
  return count;
}

/** Count the number of flag marks on a board. */
export function countFlagMarks(playerMarks: MarkType[][]): number {
  let count = 0;
  for (const row of playerMarks) {
    for (const mark of row) {
      if (mark === 'flag') count++;
    }
  }
  return count;
}

/** Collect all positions that carry a given mark type. */
export function collectMarkedPositions(playerMarks: MarkType[][], markType: MarkType): Pos[] {
  const positions: Pos[] = [];
  for (let row = 0; row < playerMarks.length; row++) {
    for (let col = 0; col < (playerMarks[row]?.length ?? 0); col++) {
      if (playerMarks[row]?.[col] === markType) {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

// ---------------------------------------------------------------------------
// Puzzle parameter derivation
// ---------------------------------------------------------------------------

/** Count solution queens in the queens string (number of 'Q' characters). */
export function deriveTargetQueenCountFromQueensString(queens: string): number {
  let count = 0;
  for (const symbol of queens) {
    if (symbol === 'Q') count += 1;
  }
  return count;
}

/**
 * Analyse existing solution queen positions to derive the minimum distance between
 * any two queens that share a row or column. Falls back to boardSize when there are
 * fewer than 2 queens or none share a line.
 */
export function deriveOrthogonalMinDistanceFromQueens(queens: Pos[], boardSize: number): number {
  let minimumSharedLineDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < queens.length; index++) {
    const left = queens[index];
    for (let nextIndex = index + 1; nextIndex < queens.length; nextIndex++) {
      const right = queens[nextIndex];
      if (left.row === right.row) {
        minimumSharedLineDistance = Math.min(
          minimumSharedLineDistance,
          Math.abs(left.col - right.col)
        );
      } else if (left.col === right.col) {
        minimumSharedLineDistance = Math.min(
          minimumSharedLineDistance,
          Math.abs(left.row - right.row)
        );
      }
    }
  }

  return Number.isFinite(minimumSharedLineDistance) ? minimumSharedLineDistance : boardSize;
}

/**
 * Returns true when the puzzle requires every row AND every column to contain
 * exactly one queen. This is the case when queens == boardSize and the orthogonal
 * distance rule spans the entire board (i.e. standard one-per-line coverage).
 */
export function requiresLineCoverage(
  targetQueenCount: number,
  orthogonalMinDistance: number,
  boardSize: number
): boolean {
  return targetQueenCount === boardSize && orthogonalMinDistance >= boardSize;
}

// ---------------------------------------------------------------------------
// Debug / snapshot helpers
// ---------------------------------------------------------------------------

/** Serialise board group colours to an array of strings (one per row). */
export function snapshotBoardGroups(grid: GridSquare[][]): string[] {
  return grid.map((row) => row.map((cell) => cell.groupColor ?? '.').join(''));
}

/** Serialise player marks to an array of strings (Q / F / X / .). */
export function snapshotPlayerMarks(playerMarks: MarkType[][]): string[] {
  return playerMarks.map((row) =>
    row
      .map((mark) => {
        if (mark === 'queen') return 'Q';
        if (mark === 'flag') return 'F';
        if (mark === 'invalid') return 'X';
        return '.';
      })
      .join('')
  );
}
