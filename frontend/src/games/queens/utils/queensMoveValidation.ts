/**
 * queensMoveValidation.ts
 *
 * Stateless helpers for deciding whether a queen placement is legal.
 * Accepts all required board context as arguments — no store dependencies.
 * Reusable by queensStore, infiniteQueensStore, admin tools, and tests.
 */

import type { GridSquare, MarkType } from '../types/types';
import { isDiagonalTouch, isOrthogonalConflict } from './queensRules';

export interface QueensMoveContext {
  grid: GridSquare[][];
  playerMarks: MarkType[][];
  gridSize: number;
  orthogonalMinDistance: number;
}

/**
 * Returns true if placing a queen at (row, col) is legal given the current board state.
 *
 * Checks:
 *   1. Orthogonal distance — no existing queen within `orthogonalMinDistance` in same row/col.
 *   2. Diagonal touch — no existing queen diagonally adjacent.
 *   3. Color group — the target cell's group colour must not already have a queen.
 */
export function isValidMoveOnBoard(ctx: QueensMoveContext, row: number, col: number): boolean {
  const { grid, playerMarks, gridSize, orthogonalMinDistance } = ctx;
  const candidate = { row, col };

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (playerMarks[r][c] !== 'queen') continue;
      const queen = { row: r, col: c };
      if (isOrthogonalConflict(candidate, queen, orthogonalMinDistance)) return false;
      if (isDiagonalTouch(candidate, queen)) return false;
    }
  }

  // Color-group constraint: only one queen per group
  const groupColor = grid[row][col].groupColor;
  if (groupColor) {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (playerMarks[r][c] === 'queen' && grid[r][c].groupColor === groupColor) {
          return false;
        }
      }
    }
  }

  return true;
}
