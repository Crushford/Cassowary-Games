import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { GridSquare, MarkType, Pos } from '../types/types';
import {
  PATTERN_CARD_DEFINITIONS,
  collectPatternFlagPlacements,
  getPatternCardById,
  type PatternCardDefinition,
} from './incrementalPatternCards';

interface PuzzleStringFormat {
  id: string;
  layout: string;
  queens: string;
}

function loadFiveByFivePuzzles(): PuzzleStringFormat[] {
  const jsonPath = new URL('../../public/puzzles.json', import.meta.url);
  const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, PuzzleStringFormat[]>;
  return data['5x5'].filter((puzzle) => puzzle.id.endsWith('-0'));
}

function parsePuzzleGrid(puzzle: PuzzleStringFormat): {
  grid: GridSquare[][];
  solutionQueens: Pos[];
} {
  const size = Math.sqrt(puzzle.layout.length);
  if (!Number.isInteger(size)) {
    throw new Error(`Invalid puzzle layout length for ${puzzle.id}`);
  }

  const grid: GridSquare[][] = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      position: { row, col },
      groupColor: puzzle.layout[row * size + col],
    }))
  );

  const solutionQueens: Pos[] = [];
  for (let i = 0; i < puzzle.queens.length; i++) {
    if (puzzle.queens[i] !== 'Q') continue;
    solutionQueens.push({
      row: Math.floor(i / size),
      col: i % size,
    });
  }

  return { grid, solutionQueens };
}

function createMarks(size: number): MarkType[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function applyPatternToFixedPoint(
  grid: GridSquare[][],
  marks: MarkType[][],
  card: PatternCardDefinition
): number {
  let totalPlaced = 0;

  for (let i = 0; i < 20; i++) {
    const placements = collectPatternFlagPlacements(grid, marks, card);
    if (placements.length === 0) {
      break;
    }

    for (const placement of placements) {
      if (marks[placement.row][placement.col] !== null) continue;
      marks[placement.row][placement.col] = 'flag';
      totalPlaced += 1;
    }
  }

  return totalPlaced;
}

function isSolvableWithFixedFlags(grid: GridSquare[][], marks: MarkType[][]): boolean {
  const size = grid.length;
  const usedCols = new Set<number>();
  const usedColors = new Set<string>();
  const placedQueens: Pos[] = [];

  function canPlace(row: number, col: number): boolean {
    if (marks[row][col] !== null) return false;
    const color = grid[row][col].groupColor;
    if (!color) return false;

    if (usedCols.has(col)) return false;
    if (usedColors.has(color)) return false;

    for (const queen of placedQueens) {
      if (Math.abs(queen.row - row) === 1 && Math.abs(queen.col - col) === 1) {
        return false;
      }
    }

    return true;
  }

  function search(row: number): boolean {
    if (row === size) {
      return true;
    }

    for (let col = 0; col < size; col++) {
      if (!canPlace(row, col)) continue;

      const color = grid[row][col].groupColor!;
      usedCols.add(col);
      usedColors.add(color);
      placedQueens.push({ row, col });

      if (search(row + 1)) {
        return true;
      }

      placedQueens.pop();
      usedColors.delete(color);
      usedCols.delete(col);
    }

    return false;
  }

  return search(0);
}

function deterministicSample<T>(items: T[], sampleSize: number, seed = 1337): T[] {
  const copy = [...items];
  let state = seed >>> 0;

  function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  }

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(0, Math.min(sampleSize, copy.length));
}

describe('pattern card safety on real puzzles', () => {
  function assertPatternCardSafety(cardId: string) {
    const card = getPatternCardById(cardId);
    if (!card) {
      throw new Error(`${cardId} is required for these tests`);
    }

    const sample = deterministicSample(loadFiveByFivePuzzles(), 120, 20260308);

    const flaggedSolutionQueenPuzzles: string[] = [];
    const unsolvablePuzzles: string[] = [];
    for (const puzzle of sample) {
      const { grid, solutionQueens } = parsePuzzleGrid(puzzle);
      const marks = createMarks(grid.length);

      const placed = applyPatternToFixedPoint(grid, marks, card);
      void placed;

      const flaggedSolutionQueen = solutionQueens.some(
        (queen) => marks[queen.row][queen.col] === 'flag'
      );
      if (flaggedSolutionQueen) {
        flaggedSolutionQueenPuzzles.push(puzzle.id);
      }

      const solvable = isSolvableWithFixedFlags(grid, marks);
      if (!solvable) {
        unsolvablePuzzles.push(puzzle.id);
      }
    }

    expect(flaggedSolutionQueenPuzzles).toEqual([]);
    expect(unsolvablePuzzles).toEqual([]);
  }

  for (const card of PATTERN_CARD_DEFINITIONS) {
    it(`keeps sampled puzzles safe for ${card.id}`, () => {
      assertPatternCardSafety(card.id);
    });
  }
});
