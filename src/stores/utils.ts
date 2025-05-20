/**
 * utils.ts
 *
 * General utility functions used throughout the application.
 */
import type { GridSquare } from '../types/grid';

/**
 * Position in a grid - row and column coordinates.
 */
export interface Pos {
  row: number;
  col: number;
}

/**
 * Generate a range of numbers [0, 1, ..., n-1]
 */
export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/**
 * Find all positions in a grid that satisfy a predicate.
 */
export function findPositions<T>(
  grid: T[][],
  predicate: (cell: T, row: number, col: number) => boolean
): Pos[] {
  const positions: Pos[] = [];

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (predicate(grid[row][col], row, col)) {
        positions.push({ row, col });
      }
    }
  }

  return positions;
}

/**
 * Check if a position is valid within grid bounds.
 */
export function isValidPosition(grid: any[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
}

/**
 * Generate a random integer between min (inclusive) and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm.
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Create a deep clone of an object.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Group an array of items by a key.
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

/**
 * Create an empty grid of given size, each cell initialized via factory.
 */
export function createEmptyGrid(
  gridSize: number,
  cellFactory: () => GridSquare = () => ({ state: 'empty' }) as GridSquare
): GridSquare[][] {
  return range(gridSize).map(() => range(gridSize).map(cellFactory));
}

/**
 * Get all positions where queens are placed.
 */
export function getQueenPositions(grid: GridSquare[][]): Pos[] {
  return findPositions(grid, (cell) => cell.state === 'queen');
}

/**
 * Update the list of available moves (empty + valid).
 */
export function computeAvailableMoves(
  grid: GridSquare[][],
  isValidMove: (row: number, col: number) => boolean
): Pos[] {
  return findPositions(grid, (cell, row, col) => cell.state === 'empty' && isValidMove(row, col));
}

/**
 * Clear all queens, flags, invalid markers but keep other data (e.g., colors).
 */
export function clearMarkers(grid: GridSquare[][]): void {
  grid.forEach((row) =>
    row.forEach((cell) => {
      if (cell.state === 'queen' || cell.state === 'flag' || cell.state === 'invalid') {
        cell.state = 'empty';
      }
    })
  );
}

/**
 * Count how many cells satisfy a predicate.
 */
export function countCells(grid: GridSquare[][], predicate: (cell: GridSquare) => boolean): number {
  return findPositions(grid, (cell) => predicate(cell)).length;
}

/**
 * Check if all squares are filled (queen or flag).
 */
export function allFilled(grid: GridSquare[][]): boolean {
  return grid.every((row) => row.every((cell) => cell.state === 'queen' || cell.state === 'flag'));
}

/**
 * Compute counts of each groupColor in the grid.
 */
export function countColorGroups(grid: GridSquare[][]): Record<string, number> {
  const counts: Record<string, number> = {};
  grid.forEach((row) =>
    row.forEach((cell) => {
      if (cell.groupColor) {
        counts[cell.groupColor] = (counts[cell.groupColor] || 0) + 1;
      }
    })
  );
  return counts;
}

/**
 * Validate puzzle requirements:
 * - exact number of queens
 * - all squares filled
 * - each color group has at least minGroupSize
 */
export function validatePuzzle(
  grid: GridSquare[][],
  requiredQueens: number,
  minGroupSize: number = 2
): { queenCountValid: boolean; allFilled: boolean; colorGroupsValid: boolean } {
  const queenCount = countCells(grid, (cell) => cell.state === 'queen');
  const allFilledFlag = allFilled(grid);
  const groupCounts = countColorGroups(grid);
  const colorGroupsFlag = Object.values(groupCounts).every((c) => c >= minGroupSize);
  return {
    queenCountValid: queenCount === requiredQueens,
    allFilled: allFilledFlag,
    colorGroupsValid: colorGroupsFlag,
  };
}

/**
 * Clone a grid deeply.
 */
export function cloneGrid(grid: GridSquare[][]): GridSquare[][] {
  return deepClone(grid);
}

/**
 * Count cells with a specific state.
 */
export function countCellsWithState(grid: GridSquare[][], state: string): number {
  return countCells(grid, (cell) => cell.state === state);
}

/**
 * Count empty cells in the grid.
 */
export function countEmptyCells(grid: GridSquare[][]): number {
  return countCellsWithState(grid, 'empty');
}

/**
 * Check if a queen at position would attack another position.
 */
export function queenAttacks(
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number
): boolean {
  return (
    fromRow === toRow ||
    fromCol === toCol ||
    Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol)
  );
}

/**
 * Get positions of cells with a specific color.
 */
export function getColorGroupPositions(grid: GridSquare[][], color: string): Pos[] {
  return findPositions(grid, (cell) => cell.groupColor === color);
}

/**
 * Get color distribution statistics.
 */
export function getColorDistribution(grid: GridSquare[][]): {
  totalColored: number;
  totalSquares: number;
  colorCounts: Record<string, number>;
} {
  const colorCounts = countColorGroups(grid);
  const totalColored = Object.values(colorCounts).reduce((sum, count) => sum + count, 0);
  const totalSquares = grid.length * grid[0].length;

  return {
    totalColored,
    totalSquares,
    colorCounts,
  };
}
