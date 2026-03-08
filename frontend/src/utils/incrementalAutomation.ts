import type { GridSquare, MarkType } from '../types/types';
import {
  collectPatternFlagPlacements,
  type PatternCardDefinition,
} from './incrementalPatternCards';

interface AutoQueenRules {
  byColor: boolean;
  byRow: boolean;
  byColumn: boolean;
}

interface CollectAutoQueenOptions {
  grid: GridSquare[][];
  marks: MarkType[][];
  rules: AutoQueenRules;
  isValidMoveWithMarks: (row: number, col: number, marks: MarkType[][]) => boolean;
}

interface RunIncrementalAutomationOptions {
  grid: GridSquare[][];
  initialMarks: MarkType[][];
  patternCards: PatternCardDefinition[];
  autoQueenRules: AutoQueenRules;
  isValidMoveWithMarks: (row: number, col: number, marks: MarkType[][]) => boolean;
  isValidMoveNow: (row: number, col: number) => boolean;
  getCurrentMarks: () => MarkType[][];
  placeFlag: (row: number, col: number) => void;
  placeQueen: (row: number, col: number) => void;
  onPatternFlagPlaced?: (row: number, col: number) => void;
  maxIterations?: number;
}

function cloneMarks(marks: MarkType[][]): MarkType[][] {
  return marks.map((row) => [...row]);
}

function collectPatternPlacementsForMarks(
  grid: GridSquare[][],
  marks: MarkType[][],
  cards: PatternCardDefinition[]
): Array<{ row: number; col: number }> {
  const placements: Array<{ row: number; col: number }> = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const matches = collectPatternFlagPlacements(grid, marks, card);
    for (const match of matches) {
      const key = `${match.row},${match.col}`;
      if (seen.has(key)) continue;
      seen.add(key);
      placements.push(match);
    }
  }

  return placements;
}

export function collectWavePlacements(
  grid: GridSquare[][],
  seedMarks: MarkType[][],
  cards: PatternCardDefinition[],
  maxIterations = 100
): Array<{ row: number; col: number }> {
  const workingMarks = cloneMarks(seedMarks);
  const queuedPlacements: Array<{ row: number; col: number }> = [];
  const queuedSet = new Set<string>();

  for (let i = 0; i < maxIterations; i++) {
    const matches = collectPatternPlacementsForMarks(grid, workingMarks, cards);
    let addedAny = false;

    for (const match of matches) {
      if (workingMarks[match.row][match.col] !== null) continue;

      const key = `${match.row},${match.col}`;
      if (queuedSet.has(key)) continue;

      queuedSet.add(key);
      queuedPlacements.push(match);
      workingMarks[match.row][match.col] = 'flag';
      addedAny = true;
    }

    if (!addedAny) {
      break;
    }
  }

  return queuedPlacements;
}

export function collectAutoQueenPlacements({
  grid,
  marks,
  rules,
  isValidMoveWithMarks,
}: CollectAutoQueenOptions): Array<{ row: number; col: number }> {
  const placements: Array<{ row: number; col: number }> = [];
  const seen = new Set<string>();
  const size = grid.length;

  const tryAdd = (row: number, col: number) => {
    if (marks[row][col] !== null) return;
    if (!isValidMoveWithMarks(row, col, marks)) return;
    const key = `${row},${col}`;
    if (seen.has(key)) return;
    seen.add(key);
    placements.push({ row, col });
  };

  if (rules.byColor) {
    const colorGroups = new Map<string, Array<{ row: number; col: number }>>();
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const color = grid[row][col].groupColor;
        if (!color) continue;
        if (!colorGroups.has(color)) colorGroups.set(color, []);
        colorGroups.get(color)!.push({ row, col });
      }
    }
    for (const group of colorGroups.values()) {
      const free = group.filter((cell) => marks[cell.row][cell.col] === null);
      if (free.length === 1) {
        tryAdd(free[0].row, free[0].col);
      }
    }
  }

  if (rules.byRow) {
    for (let row = 0; row < size; row++) {
      const free: Array<{ row: number; col: number }> = [];
      for (let col = 0; col < size; col++) {
        if (marks[row][col] === null) free.push({ row, col });
      }
      if (free.length === 1) {
        tryAdd(free[0].row, free[0].col);
      }
    }
  }

  if (rules.byColumn) {
    for (let col = 0; col < size; col++) {
      const free: Array<{ row: number; col: number }> = [];
      for (let row = 0; row < size; row++) {
        if (marks[row][col] === null) free.push({ row, col });
      }
      if (free.length === 1) {
        tryAdd(free[0].row, free[0].col);
      }
    }
  }

  return placements;
}

export function runIncrementalAutomationFixedPoint({
  grid,
  initialMarks,
  patternCards,
  autoQueenRules,
  isValidMoveWithMarks,
  isValidMoveNow,
  getCurrentMarks,
  placeFlag,
  placeQueen,
  onPatternFlagPlaced,
  maxIterations = 100,
}: RunIncrementalAutomationOptions): { flagsPlaced: number } {
  const marksSnapshot = cloneMarks(initialMarks);
  let totalFlagPlacements = 0;

  for (let wave = 0; wave < maxIterations; wave++) {
    let changed = false;
    const queuedPlacements =
      patternCards.length > 0 ? collectWavePlacements(grid, marksSnapshot, patternCards) : [];

    for (const position of queuedPlacements) {
      if (marksSnapshot[position.row][position.col] !== null) continue;
      placeFlag(position.row, position.col);
      onPatternFlagPlaced?.(position.row, position.col);
      marksSnapshot[position.row][position.col] = 'flag';
      totalFlagPlacements += 1;
      changed = true;
    }

    const queenPlacements = collectAutoQueenPlacements({
      grid,
      marks: marksSnapshot,
      rules: autoQueenRules,
      isValidMoveWithMarks,
    });
    let placedQueen = false;

    for (const queen of queenPlacements) {
      if (marksSnapshot[queen.row][queen.col] !== null) continue;
      if (!isValidMoveNow(queen.row, queen.col)) continue;
      placeQueen(queen.row, queen.col);
      placedQueen = true;
      changed = true;
    }

    if (placedQueen) {
      const refreshed = cloneMarks(getCurrentMarks());
      for (let row = 0; row < refreshed.length; row++) {
        for (let col = 0; col < refreshed[row].length; col++) {
          marksSnapshot[row][col] = refreshed[row][col];
        }
      }
    }

    if (!changed) {
      break;
    }
  }

  return { flagsPlaced: totalFlagPlacements };
}
