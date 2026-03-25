import type { PositionRef } from '../types';
import { createBooleanGrid } from '../utils/createBooleanGrid';

export function buildAutoFlagGrid(
  foundGoldPositions: PositionRef[],
  revealed: boolean[][],
  size: number
): boolean[][] {
  const flagged = createBooleanGrid(size);

  const markIfHidden = (row: number, col: number) => {
    if (row < 0 || row >= size || col < 0 || col >= size) {
      return;
    }

    if (revealed[row][col]) {
      return;
    }

    flagged[row][col] = true;
  };

  for (const { row, col } of foundGoldPositions) {
    for (let index = 0; index < size; index += 1) {
      if (index !== col) {
        markIfHidden(row, index);
      }

      if (index !== row) {
        markIfHidden(index, col);
      }
    }

    markIfHidden(row - 1, col - 1);
    markIfHidden(row - 1, col + 1);
    markIfHidden(row + 1, col - 1);
    markIfHidden(row + 1, col + 1);
  }

  return flagged;
}
