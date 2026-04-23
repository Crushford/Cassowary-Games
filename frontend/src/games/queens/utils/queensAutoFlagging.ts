/**
 * queensAutoFlagging.ts
 *
 * Pure computation for auto-flag logic.
 * Returns positions that should be flagged given current board state — no mutations,
 * no store side effects. The caller is responsible for applying the result.
 */

import type { Pos } from '../types/types';
import { isValidMoveOnBoard, type QueensMoveContext } from './queensMoveValidation';

/**
 * Returns every currently-empty cell that would be an illegal queen placement given
 * the queens already on the board. These are the positions that should be auto-flagged.
 *
 * Note: this function does NOT mutate `playerMarks`. The caller applies the result.
 */
export function getAutoFlagPositions(ctx: QueensMoveContext): Pos[] {
  const { playerMarks, gridSize } = ctx;
  const positions: Pos[] = [];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (playerMarks[r][c] === null && !isValidMoveOnBoard(ctx, r, c)) {
        positions.push({ row: r, col: c });
      }
    }
  }

  return positions;
}
