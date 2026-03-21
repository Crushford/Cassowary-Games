import { describe, expect, it } from 'vitest';
import type { GridSquare, MarkType, Pos } from '../types/types';
import {
  PATTERN_CARD_DEFINITIONS,
  collectPatternFlagPlacements,
  type PatternCardDefinition,
} from './incrementalPatternCards';

type FlipMode = 'none' | 'horizontal' | 'vertical';

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

function sortedPositions(positions: Pos[]): Pos[] {
  return [...positions].sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));
}

function expectSamePositions(actual: Pos[], expected: Pos[]): void {
  expect(sortedPositions(actual)).toEqual(sortedPositions(expected));
}

function rotateCoord(pos: Pos, size: number, rotationsCW: number): Pos {
  switch (rotationsCW % 4) {
    case 0:
      return { row: pos.row, col: pos.col };
    case 1:
      return { row: pos.col, col: size - 1 - pos.row };
    case 2:
      return { row: size - 1 - pos.row, col: size - 1 - pos.col };
    case 3:
      return { row: size - 1 - pos.col, col: pos.row };
    default:
      return { row: pos.row, col: pos.col };
  }
}

function flipCoord(pos: Pos, size: number, flipMode: FlipMode): Pos {
  if (flipMode === 'horizontal') {
    return { row: pos.row, col: size - 1 - pos.col };
  }
  if (flipMode === 'vertical') {
    return { row: size - 1 - pos.row, col: pos.col };
  }
  return pos;
}

function transformCoord(pos: Pos, size: number, rotationsCW: number, flipMode: FlipMode): Pos {
  return flipCoord(rotateCoord(pos, size, rotationsCW), size, flipMode);
}

function activeCells(card: PatternCardDefinition): Pos[] {
  return card.cells
    .filter((cell) => cell.activeSquare === true)
    .map((cell) => ({ row: cell.row, col: cell.col }));
}

function getActiveBounds(card: PatternCardDefinition): {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
} | null {
  const cells = activeCells(card);
  if (cells.length === 0) return null;
  return {
    minRow: Math.min(...cells.map((cell) => cell.row)),
    maxRow: Math.max(...cells.map((cell) => cell.row)),
    minCol: Math.min(...cells.map((cell) => cell.col)),
    maxCol: Math.max(...cells.map((cell) => cell.col)),
  };
}

function placePatternWindow(
  grid: GridSquare[][],
  card: PatternCardDefinition,
  transform: { rotationsCW: number; flipMode: FlipMode },
  base: Pos,
  focusColor = 'focus'
) {
  const transformedActive = activeCells(card).map((cell) =>
    transformCoord(cell, card.size, transform.rotationsCW, transform.flipMode)
  );
  const transformedOutputs = card.outputFlags.map((cell) =>
    transformCoord(cell, card.size, transform.rotationsCW, transform.flipMode)
  );

  for (const cell of transformedActive) {
    grid[base.row + cell.row][base.col + cell.col].groupColor = focusColor;
  }

  return {
    transformedActive,
    transformedOutputs: transformedOutputs.map((cell) => ({
      row: base.row + cell.row,
      col: base.col + cell.col,
    })),
  };
}

describe('collectPatternFlagPlacements invariants for all pattern cards', () => {
  for (const card of PATTERN_CARD_DEFINITIONS) {
    it(`${card.id}: matches base orientation outputs`, () => {
      const grid = createGrid(card.size, 'other');
      const marks = createMarks(card.size);

      placePatternWindow(grid, card, { rotationsCW: 0, flipMode: 'none' }, { row: 0, col: 0 });
      const placements = collectPatternFlagPlacements(grid, marks, card);

      expectSamePositions(placements, card.outputFlags);
    });

    it(`${card.id}: matches rotated/flipped orientation at corner`, () => {
      const boardSize = card.size + 2;
      const grid = createGrid(boardSize, 'other');
      const marks = createMarks(boardSize);
      const transform = { rotationsCW: 1, flipMode: 'horizontal' as const };
      const base = { row: 0, col: 0 };

      const placed = placePatternWindow(grid, card, transform, base);
      const placements = collectPatternFlagPlacements(grid, marks, card);

      expectSamePositions(placements, placed.transformedOutputs);
    });

    it(`${card.id}: does not place output that is already marked`, () => {
      const boardSize = card.size + 2;
      const grid = createGrid(boardSize, 'other');
      const marks = createMarks(boardSize);
      const base = { row: 0, col: 0 };

      const placed = placePatternWindow(grid, card, { rotationsCW: 0, flipMode: 'none' }, base);
      if (placed.transformedOutputs.length > 0) {
        const first = placed.transformedOutputs[0];
        marks[first.row][first.col] = 'flag';
      }

      const placements = collectPatternFlagPlacements(grid, marks, card);
      const expected = placed.transformedOutputs.slice(1);
      expectSamePositions(placements, expected);
    });

    it(`${card.id}: requires active cells to be only remaining unmarked cells in that color group`, () => {
      const boardSize = card.size + 3;
      const grid = createGrid(boardSize, 'other');
      const marks = createMarks(boardSize);
      const base = { row: 0, col: 0 };

      const placed = placePatternWindow(grid, card, { rotationsCW: 0, flipMode: 'none' }, base);
      const extraFocus = { row: boardSize - 1, col: boardSize - 1 };
      grid[extraFocus.row][extraFocus.col].groupColor = 'focus';

      const blocked = collectPatternFlagPlacements(grid, marks, card);
      expect(blocked).toEqual([]);

      marks[extraFocus.row][extraFocus.col] = 'flag';
      const placements = collectPatternFlagPlacements(grid, marks, card);
      expectSamePositions(placements, placed.transformedOutputs);
    });

    it(`${card.id}: ignores full-card non-active focus cells when they are already resolved`, () => {
      const bounds = getActiveBounds(card);
      if (!bounds) {
        return;
      }

      const candidate: Pos | null = (() => {
        for (let row = 0; row < card.size; row++) {
          for (let col = 0; col < card.size; col++) {
            const withinActiveBounds =
              row >= bounds.minRow &&
              row <= bounds.maxRow &&
              col >= bounds.minCol &&
              col <= bounds.maxCol;
            if (!withinActiveBounds) {
              return { row, col };
            }
          }
        }
        return null;
      })();

      if (!candidate) {
        return;
      }

      const boardSize = card.size + 2;
      const grid = createGrid(boardSize, 'other');
      const marks = createMarks(boardSize);
      const base = { row: 0, col: 0 };
      const placed = placePatternWindow(grid, card, { rotationsCW: 0, flipMode: 'none' }, base);

      grid[candidate.row][candidate.col].groupColor = 'focus';
      marks[candidate.row][candidate.col] = 'flag';

      const placements = collectPatternFlagPlacements(grid, marks, card);
      expectSamePositions(placements, placed.transformedOutputs);
    });

    it(`${card.id}: respects canPlaceFlagAt filter`, () => {
      const boardSize = card.size + 2;
      const grid = createGrid(boardSize, 'other');
      const marks = createMarks(boardSize);
      const base = { row: 0, col: 0 };

      const placed = placePatternWindow(grid, card, { rotationsCW: 0, flipMode: 'none' }, base);
      const blocked = placed.transformedOutputs[0];

      const placements = collectPatternFlagPlacements(grid, marks, card, (row, col) => {
        if (!blocked) return true;
        return !(row === blocked.row && col === blocked.col);
      });

      const expected = blocked ? placed.transformedOutputs.slice(1) : [];
      expectSamePositions(placements, expected);
    });
  }
});
