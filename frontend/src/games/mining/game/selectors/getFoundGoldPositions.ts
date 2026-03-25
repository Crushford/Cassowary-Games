import type { PositionRef } from '../types';

export function getFoundGoldPositions(
  truthGold: boolean[][],
  revealed: boolean[][]
): PositionRef[] {
  const positions: PositionRef[] = [];

  for (let row = 0; row < truthGold.length; row += 1) {
    for (let col = 0; col < truthGold[row].length; col += 1) {
      if (truthGold[row][col] && revealed[row][col]) {
        positions.push({ row, col });
      }
    }
  }

  return positions;
}
