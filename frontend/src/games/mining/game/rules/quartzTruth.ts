import type { PositionRef } from '../types';
import { createBooleanGrid } from '../utils/createBooleanGrid';

export function buildQuartzTruthGrid(foundGoldPositions: PositionRef[], size: number): boolean[][] {
  const quartz = createBooleanGrid(size);

  const markQuartz = (row: number, col: number) => {
    if (row < 0 || row >= size || col < 0 || col >= size) {
      return;
    }

    quartz[row][col] = true;
  };

  for (const { row, col } of foundGoldPositions) {
    for (let index = 0; index < size; index += 1) {
      if (index !== col) {
        markQuartz(row, index);
      }

      if (index !== row) {
        markQuartz(index, col);
      }
    }

    markQuartz(row - 1, col - 1);
    markQuartz(row - 1, col + 1);
    markQuartz(row + 1, col - 1);
    markQuartz(row + 1, col + 1);
  }

  for (const { row, col } of foundGoldPositions) {
    quartz[row][col] = false;
  }

  return quartz;
}
