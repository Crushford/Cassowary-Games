import type { PositionRef } from '../types';
import { createBooleanGrid } from '../utils/createBooleanGrid';

interface AutoFlagRuleSet {
  row?: boolean;
  column?: boolean;
  diagonal?: boolean;
}

export function buildSelectiveAutoFlagGrid(
  foundGoldPositions: PositionRef[],
  revealed: boolean[][],
  size: number,
  rules: AutoFlagRuleSet
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
    if (rules.row) {
      for (let index = 0; index < size; index += 1) {
        if (index !== col) {
          markIfHidden(row, index);
        }
      }
    }

    if (rules.column) {
      for (let index = 0; index < size; index += 1) {
        if (index !== row) {
          markIfHidden(index, col);
        }
      }
    }

    if (rules.diagonal) {
      markIfHidden(row - 1, col - 1);
      markIfHidden(row - 1, col + 1);
      markIfHidden(row + 1, col - 1);
      markIfHidden(row + 1, col + 1);
    }
  }

  return flagged;
}

export function buildAutoFlagGrid(
  foundGoldPositions: PositionRef[],
  revealed: boolean[][],
  size: number
): boolean[][] {
  return buildSelectiveAutoFlagGrid(foundGoldPositions, revealed, size, {
    row: true,
    column: true,
    diagonal: true,
  });
}
