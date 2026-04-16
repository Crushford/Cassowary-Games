/**
 * queensBoardValidation.ts
 *
 * Stateless board-state evaluation — determines whether a completed board is a valid solution.
 * No store dependencies, no side effects.
 * Reusable by queensStore, infiniteQueensStore, and tests.
 */

import type { GridSquare, MarkType, Pos } from '../types/types';

export interface QueensBoardEvaluationContext {
  grid: GridSquare[][];
  playerMarks: MarkType[][];
  gridSize: number;
  targetQueenCount: number;
}

export interface QueensBoardEvaluationResult {
  isValid: boolean;
  errorMessage: string | null;
}

/**
 * Evaluates whether the current player marks represent a correct solution.
 *
 * Checks:
 *   1. Correct queen count.
 *   2. All placed queens match solution positions.
 *
 * Returns `{ isValid: true }` only when both conditions hold.
 */
export function evaluateBoardCompletion(
  ctx: QueensBoardEvaluationContext
): QueensBoardEvaluationResult {
  const { grid, playerMarks, gridSize, targetQueenCount } = ctx;

  // Collect player queens
  const playerQueens: Pos[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (playerMarks[row][col] === 'queen') {
        playerQueens.push({ row, col });
      }
    }
  }

  if (playerQueens.length !== targetQueenCount) {
    return {
      isValid: false,
      errorMessage: `Need ${targetQueenCount} queens, but only ${playerQueens.length} placed`,
    };
  }

  // Collect solution queens
  const solutionSet = new Set<string>();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c].isSolutionQueen) {
        solutionSet.add(`${r},${c}`);
      }
    }
  }

  for (const queen of playerQueens) {
    if (!solutionSet.has(`${queen.row},${queen.col}`)) {
      return {
        isValid: false,
        errorMessage: 'Some queens are placed in incorrect positions',
      };
    }
  }

  return { isValid: true, errorMessage: null };
}
