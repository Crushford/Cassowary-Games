import { describe, expect, it } from 'vitest';
import type { GridSquare, MarkType, Pos } from '../types/types';
import {
  collectPatternFlagPlacements,
  getPatternCardById,
  type PatternCardDefinition,
} from './incrementalPatternCards';

function createGrid(size: number, defaultColor = 'other'): GridSquare[][] {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      position: { row, col },
      groupColor: defaultColor,
    }))
  );
}

function createMarks(size: number): MarkType[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function setGroup(grid: GridSquare[][], cells: Pos[], color: string): void {
  for (const cell of cells) {
    grid[cell.row][cell.col].groupColor = color;
  }
}

function sortPositions(positions: Pos[]): Pos[] {
  return [...positions].sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));
}

function expectSamePositions(actual: Pos[], expected: Pos[]): void {
  expect(sortPositions(actual)).toEqual(sortPositions(expected));
}

function getTestCard(): PatternCardDefinition {
  const card = getPatternCardById('pattern-new-card');
  if (!card) {
    throw new Error('pattern-new-card is required for these tests');
  }
  return card;
}

describe('collectPatternFlagPlacements(pattern-new-card)', () => {
  it('matches the base orientation and returns the expected output flags', () => {
    const card = getTestCard();
    const grid = createGrid(5, 'other');
    const marks = createMarks(5);

    setGroup(
      grid,
      [
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
      'focus'
    );

    const placements = collectPatternFlagPlacements(grid, marks, card);

    expectSamePositions(placements, [
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 2, col: 1 },
    ]);
  });

  it('matches rotated and flipped variants at the board corner', () => {
    const card = getTestCard();
    const grid = createGrid(5, 'other');
    const marks = createMarks(5);

    setGroup(
      grid,
      [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 1 },
      ],
      'focus'
    );

    const placements = collectPatternFlagPlacements(grid, marks, card);

    expect(placements.length).toBeGreaterThan(0);
  });

  it('does not return output cells that are already marked', () => {
    const card = getTestCard();
    const grid = createGrid(5, 'other');
    const marks = createMarks(5);

    setGroup(
      grid,
      [
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
      'focus'
    );
    marks[0][2] = 'flag';

    const placements = collectPatternFlagPlacements(grid, marks, card);

    expectSamePositions(placements, [
      { row: 1, col: 0 },
      { row: 2, col: 1 },
    ]);
  });

  it('respects canPlaceFlagAt filtering', () => {
    const card = getTestCard();
    const grid = createGrid(5, 'other');
    const marks = createMarks(5);

    setGroup(
      grid,
      [
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
      'focus'
    );

    const placements = collectPatternFlagPlacements(grid, marks, card, (row, col) => {
      return !(row === 1 && col === 0);
    });

    expectSamePositions(placements, [
      { row: 0, col: 2 },
      { row: 2, col: 1 },
    ]);
  });

  it('only matches when active pattern is the only remaining unmarked cells in that color group', () => {
    const card = getTestCard();
    const grid = createGrid(5, 'other');
    const marks = createMarks(5);

    setGroup(
      grid,
      [
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 4, col: 4 },
      ],
      'focus'
    );

    const placements = collectPatternFlagPlacements(grid, marks, card);

    expect(placements).toEqual([]);
  });

  it('still matches when non-pattern cells in the same color group are already resolved', () => {
    const card = getTestCard();
    const grid = createGrid(5, 'other');
    const marks = createMarks(5);

    setGroup(
      grid,
      [
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 4, col: 4 },
      ],
      'focus'
    );
    marks[4][4] = 'flag';

    const placements = collectPatternFlagPlacements(grid, marks, card);

    expectSamePositions(placements, [
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 2, col: 1 },
    ]);
  });
});
