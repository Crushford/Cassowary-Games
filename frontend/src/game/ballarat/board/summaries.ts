import type { BoardState, PositionRef } from '../types';
import { getAccessiblePositions, getStack, getTopAccessibleCard } from './access';

export function getBoardAverageAccessibleValue(board: BoardState): number | null {
  const positions = getAccessiblePositions(board);
  if (positions.length === 0) {
    return null;
  }

  let total = 0;
  for (const position of positions) {
    const topCard = getTopAccessibleCard(getStack(board, position));
    if (topCard) {
      total += topCard.value;
    }
  }

  return total / positions.length;
}

export function getRowAverageAccessibleValue(board: BoardState, row: number): number | null {
  const positions: PositionRef[] = [];
  for (let col = 0; col < board.columns; col += 1) {
    positions.push({ row, col });
  }

  let total = 0;
  let count = 0;

  for (const position of positions) {
    const topCard = getTopAccessibleCard(getStack(board, position));
    if (topCard) {
      total += topCard.value;
      count += 1;
    }
  }

  return count === 0 ? null : total / count;
}
