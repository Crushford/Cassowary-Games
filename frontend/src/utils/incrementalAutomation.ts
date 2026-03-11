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
}

interface RunIncrementalAutomationOptions {
  grid: GridSquare[][];
  initialMarks: MarkType[][];
  patternCards: PatternCardDefinition[];
  autoQueenRules: AutoQueenRules;
  maxIterations?: number;
}

export interface IncrementalAutomationAction {
  type: 'flag' | 'queen';
  row: number;
  col: number;
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
}: CollectAutoQueenOptions): Array<{ row: number; col: number }> {
  const placements: Array<{ row: number; col: number }> = [];
  const seen = new Set<string>();
  const size = grid.length;

  const tryAdd = (row: number, col: number) => {
    if (marks[row][col] !== null) return;
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
      const unmarked = group.filter((cell) => marks[cell.row][cell.col] === null);
      const everyOtherFlagged = group.every(
        (cell) =>
          marks[cell.row][cell.col] === 'flag' ||
          (unmarked.length === 1 && cell.row === unmarked[0].row && cell.col === unmarked[0].col)
      );
      if (unmarked.length === 1 && everyOtherFlagged) {
        tryAdd(unmarked[0].row, unmarked[0].col);
      }
    }
  }

  if (rules.byRow) {
    for (let row = 0; row < size; row++) {
      const unmarked: Array<{ row: number; col: number }> = [];
      for (let col = 0; col < size; col++) {
        if (marks[row][col] === null) unmarked.push({ row, col });
      }
      const everyOtherFlagged = marks[row].every(
        (mark, col) =>
          mark === 'flag' ||
          (unmarked.length === 1 && col === unmarked[0].col && row === unmarked[0].row)
      );
      if (unmarked.length === 1 && everyOtherFlagged) {
        tryAdd(unmarked[0].row, unmarked[0].col);
      }
    }
  }

  if (rules.byColumn) {
    for (let col = 0; col < size; col++) {
      const unmarked: Array<{ row: number; col: number }> = [];
      for (let row = 0; row < size; row++) {
        if (marks[row][col] === null) unmarked.push({ row, col });
      }
      const everyOtherFlagged = marks.every(
        (currentRow, row) =>
          currentRow[col] === 'flag' ||
          (unmarked.length === 1 && row === unmarked[0].row && col === unmarked[0].col)
      );
      if (unmarked.length === 1 && everyOtherFlagged) {
        tryAdd(unmarked[0].row, unmarked[0].col);
      }
    }
  }

  return placements;
}

export function buildIncrementalAutomationPlan({
  grid,
  initialMarks,
  patternCards,
  autoQueenRules,
  maxIterations = 100,
}: RunIncrementalAutomationOptions): {
  actions: IncrementalAutomationAction[];
  flagsPlaced: number;
} {
  const marksSnapshot = cloneMarks(initialMarks);
  const actions: IncrementalAutomationAction[] = [];
  let totalFlagPlacements = 0;

  for (let wave = 0; wave < maxIterations; wave++) {
    let changed = false;
    const queuedPlacements =
      patternCards.length > 0 ? collectWavePlacements(grid, marksSnapshot, patternCards) : [];

    for (const position of queuedPlacements) {
      if (marksSnapshot[position.row][position.col] !== null) continue;
      marksSnapshot[position.row][position.col] = 'flag';
      actions.push({
        type: 'flag',
        row: position.row,
        col: position.col,
      });
      totalFlagPlacements += 1;
      changed = true;
    }

    const queenPlacements = collectAutoQueenPlacements({
      grid,
      marks: marksSnapshot,
      rules: autoQueenRules,
    });

    for (const queen of queenPlacements) {
      if (marksSnapshot[queen.row][queen.col] !== null) continue;
      marksSnapshot[queen.row][queen.col] = 'queen';
      actions.push({
        type: 'queen',
        row: queen.row,
        col: queen.col,
      });
      changed = true;
    }

    if (!changed) {
      break;
    }
  }

  return {
    actions,
    flagsPlaced: totalFlagPlacements,
  };
}
