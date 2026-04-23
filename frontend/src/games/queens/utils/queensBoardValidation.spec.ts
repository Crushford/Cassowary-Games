import { describe, it, expect } from 'vitest';
import { evaluateBoardCompletion } from './queensBoardValidation';
import type { GridSquare, MarkType } from '../types/types';

function makeGrid(size: number, solutionPositions: { row: number; col: number }[]): GridSquare[][] {
  const solutionSet = new Set(solutionPositions.map((p) => `${p.row},${p.col}`));
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      position: { row: r, col: c },
      isSolutionQueen: solutionSet.has(`${r},${c}`),
    }))
  );
}

function marks(size: number, queens: { row: number; col: number }[]): MarkType[][] {
  const board: MarkType[][] = Array.from({ length: size }, () => Array(size).fill(null));
  for (const q of queens) {
    board[q.row][q.col] = 'queen';
  }
  return board;
}

describe('evaluateBoardCompletion', () => {
  const solution = [
    { row: 0, col: 1 },
    { row: 1, col: 3 },
    { row: 2, col: 0 },
    { row: 3, col: 2 },
  ];

  it('returns valid when all queens match solution', () => {
    const grid = makeGrid(4, solution);
    const playerMarks = marks(4, solution);
    const result = evaluateBoardCompletion({ grid, playerMarks, gridSize: 4, targetQueenCount: 4 });
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBeNull();
  });

  it('returns invalid when fewer queens than required', () => {
    const grid = makeGrid(4, solution);
    const playerMarks = marks(4, [solution[0]!]);
    const result = evaluateBoardCompletion({ grid, playerMarks, gridSize: 4, targetQueenCount: 4 });
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toMatch(/need 4 queens/i);
  });

  it('returns invalid when a queen is in the wrong position', () => {
    const grid = makeGrid(4, solution);
    // Place queens at correct count but one wrong position
    const wrongPlacement = [solution[0]!, solution[1]!, solution[2]!, { row: 3, col: 3 }];
    const playerMarks = marks(4, wrongPlacement);
    const result = evaluateBoardCompletion({ grid, playerMarks, gridSize: 4, targetQueenCount: 4 });
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toMatch(/incorrect positions/i);
  });

  it('returns invalid when too many queens are placed', () => {
    const grid = makeGrid(4, solution);
    const playerMarks = marks(4, [...solution, { row: 3, col: 3 }]);
    const result = evaluateBoardCompletion({ grid, playerMarks, gridSize: 4, targetQueenCount: 4 });
    expect(result.isValid).toBe(false);
  });
});
