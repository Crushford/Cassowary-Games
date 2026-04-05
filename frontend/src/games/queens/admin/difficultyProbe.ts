import type { QueensAdminBoardState } from './types';
import type { GridSquare, MarkType } from '../types/types';

export type QueensDifficultyTier = 'Easy' | 'Medium' | 'Hard' | 'Not Solved';

export interface QueensDifficultyTraceEntry {
  phase: 'easy' | 'medium' | 'hard';
  label: string;
  message: string;
  flagsPlaced: number;
  queensPlaced: number;
}

export interface QueensDifficultyAnalysis {
  solved: boolean;
  tier: QueensDifficultyTier;
  hardestStepReached: 'easy' | 'medium' | 'hard';
  totalFlagsPlaced: number;
  totalQueensPlaced: number;
  loops: number;
  guessesTried: number;
  unresolvedSquares: number;
  trace: QueensDifficultyTraceEntry[];
}

interface ContradictionSummary {
  rows: number[];
  columns: number[];
  colorGroups: string[];
}

function cloneMarks(marks: MarkType[][]): MarkType[][] {
  return marks.map((row) => [...row]);
}

function createEmptyMarks(size: number): MarkType[][] {
  return Array.from({ length: size }, () => Array<MarkType>(size).fill(null));
}

function buildGrid(board: QueensAdminBoardState): GridSquare[][] {
  return board.cells.map((row) =>
    row.map((cell) => ({
      position: { row: cell.row, col: cell.col },
      groupColor: cell.groupColor ?? undefined,
      isSolutionQueen: cell.isSolutionQueen,
    }))
  );
}

function countMarks(marks: MarkType[][], target: MarkType): number {
  return marks.reduce(
    (total, row) => total + row.reduce((rowTotal, mark) => rowTotal + (mark === target ? 1 : 0), 0),
    0
  );
}

function countUnresolved(marks: MarkType[][]): number {
  return countMarks(marks, null);
}

function getRemainingCandidatesInRow(marks: MarkType[][], row: number): number {
  return marks[row].filter((mark) => mark !== 'flag' && mark !== 'queen').length;
}

function getRemainingCandidatesInColumn(marks: MarkType[][], col: number): number {
  return marks.reduce(
    (total, row) => total + (row[col] !== 'flag' && row[col] !== 'queen' ? 1 : 0),
    0
  );
}

function findContradictions(grid: GridSquare[][], marks: MarkType[][]): ContradictionSummary {
  const rows: number[] = [];
  const columns: number[] = [];
  const colorGroups = new Map<string, number>();

  for (let row = 0; row < grid.length; row++) {
    if (getRemainingCandidatesInRow(marks, row) === 0) {
      rows.push(row);
    }
  }

  for (let col = 0; col < grid.length; col++) {
    if (getRemainingCandidatesInColumn(marks, col) === 0) {
      columns.push(col);
    }
  }

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid.length; col++) {
      const color = grid[row][col].groupColor;
      if (!color) continue;
      if (marks[row][col] !== 'flag' && marks[row][col] !== 'queen') {
        colorGroups.set(color, (colorGroups.get(color) ?? 0) + 1);
      } else if (!colorGroups.has(color)) {
        colorGroups.set(color, 0);
      }
    }
  }

  return {
    rows,
    columns,
    colorGroups: Array.from(colorGroups.entries())
      .filter(([, count]) => count === 0)
      .map(([color]) => color)
      .sort(),
  };
}

function contradictionMessage(summary: ContradictionSummary): string | null {
  const pieces: string[] = [];
  if (summary.rows.length > 0) {
    pieces.push(`rows with 0 candidates: ${summary.rows.join(', ')}`);
  }
  if (summary.columns.length > 0) {
    pieces.push(`columns with 0 candidates: ${summary.columns.join(', ')}`);
  }
  if (summary.colorGroups.length > 0) {
    pieces.push(`color groups with 0 candidates: ${summary.colorGroups.join(', ')}`);
  }
  return pieces.length > 0 ? pieces.join(' | ') : null;
}

function isValidPosition(grid: GridSquare[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid.length;
}

function isValidMoveWithMarks(
  grid: GridSquare[][],
  marks: MarkType[][],
  row: number,
  col: number
): boolean {
  for (let i = 0; i < grid.length; i++) {
    if (marks[row][i] === 'queen' || marks[i][col] === 'queen') {
      return false;
    }
  }

  const diagonalPositions = [
    { row: row - 1, col: col - 1 },
    { row: row - 1, col: col + 1 },
    { row: row + 1, col: col - 1 },
    { row: row + 1, col: col + 1 },
  ];

  for (const pos of diagonalPositions) {
    if (isValidPosition(grid, pos.row, pos.col) && marks[pos.row][pos.col] === 'queen') {
      return false;
    }
  }

  const squareColor = grid[row][col].groupColor;
  if (squareColor) {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid.length; c++) {
        if (marks[r][c] === 'queen' && grid[r][c].groupColor === squareColor) {
          return false;
        }
      }
    }
  }

  return true;
}

function autoFlagBlockedMoves(grid: GridSquare[][], marks: MarkType[][]): number {
  let flagsPlaced = 0;

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid.length; col++) {
      if (marks[row][col] === null && !isValidMoveWithMarks(grid, marks, row, col)) {
        marks[row][col] = 'flag';
        flagsPlaced += 1;
      }
    }
  }

  return flagsPlaced;
}

function placeKnownQueen(
  grid: GridSquare[][],
  marks: MarkType[][],
  row: number,
  col: number
): number {
  if (marks[row][col] === 'queen') return 0;
  if (!grid[row][col].isSolutionQueen) {
    throw new Error(
      `Tried to place a queen at (${row}, ${col}) but it is not part of the solution.`
    );
  }
  marks[row][col] = 'queen';
  return autoFlagBlockedMoves(grid, marks);
}

function placeLastFreeQueens(
  grid: GridSquare[][],
  marks: MarkType[][]
): { queensPlaced: number; flagsPlaced: number } {
  let queensPlaced = 0;
  let flagsPlaced = 0;
  let placed: boolean;

  do {
    placed = false;

    const colorGroups = new Map<string, Array<{ row: number; col: number }>>();
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid.length; col++) {
        const color = grid[row][col].groupColor;
        if (!color) continue;
        const positions = colorGroups.get(color) ?? [];
        positions.push({ row, col });
        colorGroups.set(color, positions);
      }
    }

    for (const group of colorGroups.values()) {
      const free = group.filter(
        ({ row, col }) => marks[row][col] !== 'flag' && marks[row][col] !== 'queen'
      );
      if (free.length === 1) {
        const target = free[0];
        flagsPlaced += placeKnownQueen(grid, marks, target.row, target.col);
        queensPlaced += 1;
        placed = true;
        break;
      }
    }
    if (placed) continue;

    for (let row = 0; row < grid.length; row++) {
      const free = [];
      for (let col = 0; col < grid.length; col++) {
        if (marks[row][col] !== 'flag' && marks[row][col] !== 'queen') {
          free.push({ row, col });
        }
      }
      if (free.length === 1) {
        const target = free[0];
        flagsPlaced += placeKnownQueen(grid, marks, target.row, target.col);
        queensPlaced += 1;
        placed = true;
        break;
      }
    }
    if (placed) continue;

    for (let col = 0; col < grid.length; col++) {
      const free = [];
      for (let row = 0; row < grid.length; row++) {
        if (marks[row][col] !== 'flag' && marks[row][col] !== 'queen') {
          free.push({ row, col });
        }
      }
      if (free.length === 1) {
        const target = free[0];
        flagsPlaced += placeKnownQueen(grid, marks, target.row, target.col);
        queensPlaced += 1;
        placed = true;
        break;
      }
    }
  } while (placed);

  return { queensPlaced, flagsPlaced };
}

function flagBlockingSquares(grid: GridSquare[][], marks: MarkType[][]): number {
  let flagsPlaced = 0;
  const size = grid.length;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (marks[row][col] !== null) continue;

      const simulated = cloneMarks(marks);
      simulated[row][col] = 'queen';

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (simulated[r][c] !== null) continue;
          if (!isValidMoveWithMarks(grid, simulated, r, c)) {
            simulated[r][c] = 'flag';
          }
        }
      }

      const rowFullyBlocked = simulated.some((line) => line.every((mark) => mark === 'flag'));
      const colFullyBlocked = Array.from({ length: size }, (_, candidateCol) =>
        simulated.every((line) => line[candidateCol] === 'flag')
      ).some(Boolean);

      const colorGroups = new Map<string, Array<{ row: number; col: number }>>();
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const color = grid[r][c].groupColor;
          if (!color) continue;
          const positions = colorGroups.get(color) ?? [];
          positions.push({ row: r, col: c });
          colorGroups.set(color, positions);
        }
      }

      const colorGroupBlocked = Array.from(colorGroups.values()).some((positions) =>
        positions.every((position) => simulated[position.row][position.col] === 'flag')
      );

      if ((rowFullyBlocked || colFullyBlocked || colorGroupBlocked) && marks[row][col] === null) {
        marks[row][col] = 'flag';
        flagsPlaced += 1;
      }
    }
  }

  return flagsPlaced;
}

function eliminateConstrainedLines(
  grid: GridSquare[][],
  marks: MarkType[][],
  isColumn: boolean
): number {
  const size = grid.length;
  const colorToAxisMap = new Map<string, Set<number>>();

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const color = grid[row][col].groupColor;
      if (!color || marks[row][col] !== null) continue;
      const coordinate = isColumn ? col : row;
      const set = colorToAxisMap.get(color) ?? new Set<number>();
      set.add(coordinate);
      colorToAxisMap.set(color, set);
    }
  }

  const axisSetToColors = new Map<string, Set<string>>();
  for (const [color, axisSet] of colorToAxisMap.entries()) {
    const key = Array.from(axisSet)
      .sort((left, right) => left - right)
      .join(',');
    const set = axisSetToColors.get(key) ?? new Set<string>();
    set.add(color);
    axisSetToColors.set(key, set);
  }

  let flagsPlaced = 0;
  for (const [axisKey, allowedColors] of axisSetToColors.entries()) {
    if (allowedColors.size < 2) continue;

    const axisValues = axisKey
      .split(',')
      .filter((value) => value.length > 0)
      .map((value) => Number.parseInt(value, 10));
    if (axisValues.length !== allowedColors.size) continue;

    for (const primaryIndex of axisValues) {
      for (let secondaryIndex = 0; secondaryIndex < size; secondaryIndex++) {
        const row = isColumn ? secondaryIndex : primaryIndex;
        const col = isColumn ? primaryIndex : secondaryIndex;
        const squareColor = grid[row][col].groupColor;
        const isUnmarked = marks[row][col] === null;
        const outsideAllowedColors = !squareColor || !allowedColors.has(squareColor);

        if (isUnmarked && outsideAllowedColors) {
          marks[row][col] = 'flag';
          flagsPlaced += 1;
        }
      }
    }
  }

  return flagsPlaced;
}

function runEasyPhase(
  grid: GridSquare[][],
  marks: MarkType[][]
): { flagsPlaced: number; queensPlaced: number; loops: number } {
  let flagsPlaced = 0;
  let queensPlaced = 0;
  let loops = 0;
  let changed = true;
  while (changed) {
    changed = false;
    loops += 1;
    const beforeFlags = countMarks(marks, 'flag');
    const beforeQueens = countMarks(marks, 'queen');

    flagsPlaced += flagBlockingSquares(grid, marks);
    const forced = placeLastFreeQueens(grid, marks);
    flagsPlaced += forced.flagsPlaced;
    queensPlaced += forced.queensPlaced;

    const afterFlags = countMarks(marks, 'flag');
    const afterQueens = countMarks(marks, 'queen');
    changed = afterFlags !== beforeFlags || afterQueens !== beforeQueens;
  }

  return { flagsPlaced, queensPlaced, loops };
}

function runMediumPhase(
  grid: GridSquare[][],
  marks: MarkType[][]
): { flagsPlaced: number; queensPlaced: number } {
  const rowFlags = eliminateConstrainedLines(grid, marks, false);
  const columnFlags = eliminateConstrainedLines(grid, marks, true);
  const forced = placeLastFreeQueens(grid, marks);

  return {
    flagsPlaced: rowFlags + columnFlags + forced.flagsPlaced,
    queensPlaced: forced.queensPlaced,
  };
}

function isSolved(grid: GridSquare[][], marks: MarkType[][]): boolean {
  return countMarks(marks, 'queen') === grid.length && countUnresolved(marks) === 0;
}

function isReadyForDifficultyProbe(board: QueensAdminBoardState): { ok: boolean; error?: string } {
  if (!board.cells.every((row) => row.every((cell) => Boolean(cell.groupColor)))) {
    return { ok: false, error: 'Difficulty probe only works on a fully colored puzzle.' };
  }

  const solutionQueenCount = board.cells.flat().filter((cell) => cell.isSolutionQueen).length;
  if (solutionQueenCount !== board.size) {
    return {
      ok: false,
      error: `Difficulty probe expects exactly ${board.size} hidden solution queens, found ${solutionQueenCount}.`,
    };
  }

  return { ok: true };
}

export function analyzeQueensDifficulty(board: QueensAdminBoardState): QueensDifficultyAnalysis {
  const readiness = isReadyForDifficultyProbe(board);
  if (!readiness.ok) {
    return {
      solved: false,
      tier: 'Not Solved',
      hardestStepReached: 'easy',
      totalFlagsPlaced: 0,
      totalQueensPlaced: 0,
      loops: 0,
      guessesTried: 0,
      unresolvedSquares: board.size * board.size,
      trace: [
        {
          phase: 'easy',
          label: 'Probe blocked',
          message: readiness.error ?? 'Puzzle is not ready for difficulty probing.',
          flagsPlaced: 0,
          queensPlaced: 0,
        },
      ],
    };
  }

  const grid = buildGrid(board);
  const marks = createEmptyMarks(board.size);
  const trace: QueensDifficultyTraceEntry[] = [];

  let totalFlagsPlaced = 0;
  let totalQueensPlaced = 0;
  let loops = 0;
  let hardestStepReached: 'easy' | 'medium' | 'hard' = 'easy';

  let shouldContinue = true;
  while (shouldContinue) {
    shouldContinue = false;
    const easyResult = runEasyPhase(grid, marks);
    totalFlagsPlaced += easyResult.flagsPlaced;
    totalQueensPlaced += easyResult.queensPlaced;
    loops += easyResult.loops;

    if (easyResult.flagsPlaced > 0 || easyResult.queensPlaced > 0) {
      trace.push({
        phase: 'easy',
        label: 'Easy step: blocking flags',
        message:
          'Flagged every square where placing a queen would block an entire remaining row, column, or color group, then placed any queens forced by those flags.',
        flagsPlaced: easyResult.flagsPlaced,
        queensPlaced: easyResult.queensPlaced,
      });
    }

    const easyContradiction = contradictionMessage(findContradictions(grid, marks));
    if (easyContradiction) {
      trace.push({
        phase: 'easy',
        label: 'Easy step contradiction',
        message: `The probe contradicted itself during the easy phase: ${easyContradiction}.`,
        flagsPlaced: 0,
        queensPlaced: 0,
      });
      return {
        solved: false,
        tier: 'Not Solved',
        hardestStepReached,
        totalFlagsPlaced,
        totalQueensPlaced,
        loops,
        guessesTried: 0,
        unresolvedSquares: countUnresolved(marks),
        trace,
      };
    }

    if (isSolved(grid, marks)) {
      return {
        solved: true,
        tier: 'Easy',
        hardestStepReached,
        totalFlagsPlaced,
        totalQueensPlaced,
        loops,
        guessesTried: 0,
        unresolvedSquares: countUnresolved(marks),
        trace,
      };
    }

    const mediumResult = runMediumPhase(grid, marks);
    if (mediumResult.flagsPlaced === 0 && mediumResult.queensPlaced === 0) {
      break;
    }
    shouldContinue = true;

    hardestStepReached = 'medium';
    totalFlagsPlaced += mediumResult.flagsPlaced;
    totalQueensPlaced += mediumResult.queensPlaced;
    trace.push({
      phase: 'medium',
      label: 'Medium step: constrained rows and columns',
      message:
        'Applied constrained row and constrained column eliminations, then placed any queens forced by the new flags before returning to the easy step.',
      flagsPlaced: mediumResult.flagsPlaced,
      queensPlaced: mediumResult.queensPlaced,
    });

    const mediumContradiction = contradictionMessage(findContradictions(grid, marks));
    if (mediumContradiction) {
      return {
        solved: false,
        tier: 'Not Solved',
        hardestStepReached,
        totalFlagsPlaced,
        totalQueensPlaced,
        loops,
        guessesTried: 0,
        unresolvedSquares: countUnresolved(marks),
        trace: [
          ...trace,
          {
            phase: 'medium',
            label: 'Medium step contradiction',
            message: `The probe contradicted itself during the medium phase: ${mediumContradiction}.`,
            flagsPlaced: 0,
            queensPlaced: 0,
          },
        ],
      };
    }

    if (isSolved(grid, marks)) {
      return {
        solved: true,
        tier: 'Medium',
        hardestStepReached,
        totalFlagsPlaced,
        totalQueensPlaced,
        loops,
        guessesTried: 0,
        unresolvedSquares: countUnresolved(marks),
        trace,
      };
    }
  }

  let guessesTried = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid.length; col++) {
      if (marks[row][col] !== null) continue;
      guessesTried += 1;

      if (!grid[row][col].isSolutionQueen) {
        trace.push({
          phase: 'hard',
          label: `Hard step: guess queen at (${row}, ${col})`,
          message:
            'Skipped this guess because the hidden solution says this square is not a queen. The hard probe keeps trying other queen assumptions until one finishes the puzzle.',
          flagsPlaced: 0,
          queensPlaced: 0,
        });
        continue;
      }

      const guessMarks = cloneMarks(marks);
      let guessFlagsPlaced = 0;
      let guessQueensPlaced = 0;

      guessFlagsPlaced += placeKnownQueen(grid, guessMarks, row, col);
      guessQueensPlaced += 1;

      let keepTryingGuess = true;
      while (keepTryingGuess) {
        keepTryingGuess = false;
        const easyResult = runEasyPhase(grid, guessMarks);
        guessFlagsPlaced += easyResult.flagsPlaced;
        guessQueensPlaced += easyResult.queensPlaced;

        if (isSolved(grid, guessMarks)) {
          trace.push({
            phase: 'hard',
            label: `Hard step: guess queen at (${row}, ${col})`,
            message:
              'Assumed a queen here, then the easy and medium rules were enough to finish the puzzle from that point.',
            flagsPlaced: guessFlagsPlaced,
            queensPlaced: guessQueensPlaced,
          });

          return {
            solved: true,
            tier: 'Hard',
            hardestStepReached: 'hard',
            totalFlagsPlaced: totalFlagsPlaced + guessFlagsPlaced,
            totalQueensPlaced: totalQueensPlaced + guessQueensPlaced,
            loops,
            guessesTried,
            unresolvedSquares: 0,
            trace,
          };
        }

        const guessEasyContradiction = contradictionMessage(findContradictions(grid, guessMarks));
        if (guessEasyContradiction) {
          trace.push({
            phase: 'hard',
            label: `Hard step: guess queen at (${row}, ${col})`,
            message: `That guess caused a contradiction during the easy phase: ${guessEasyContradiction}.`,
            flagsPlaced: guessFlagsPlaced,
            queensPlaced: guessQueensPlaced,
          });
          break;
        }

        const mediumResult = runMediumPhase(grid, guessMarks);
        guessFlagsPlaced += mediumResult.flagsPlaced;
        guessQueensPlaced += mediumResult.queensPlaced;

        const guessMediumContradiction = contradictionMessage(findContradictions(grid, guessMarks));
        if (guessMediumContradiction) {
          trace.push({
            phase: 'hard',
            label: `Hard step: guess queen at (${row}, ${col})`,
            message: `That guess caused a contradiction during the medium phase: ${guessMediumContradiction}.`,
            flagsPlaced: guessFlagsPlaced,
            queensPlaced: guessQueensPlaced,
          });
          break;
        }

        if (mediumResult.flagsPlaced === 0 && mediumResult.queensPlaced === 0) {
          break;
        }
        keepTryingGuess = true;
      }

      trace.push({
        phase: 'hard',
        label: `Hard step: guess queen at (${row}, ${col})`,
        message:
          'Assuming a queen here did not let the current easy/medium rule set finish the puzzle, so the probe moved on to the next guess.',
        flagsPlaced: guessFlagsPlaced,
        queensPlaced: guessQueensPlaced,
      });
    }
  }

  return {
    solved: false,
    tier: 'Not Solved',
    hardestStepReached,
    totalFlagsPlaced,
    totalQueensPlaced,
    loops,
    guessesTried,
    unresolvedSquares: countUnresolved(marks),
    trace: [
      ...trace,
      {
        phase: 'hard',
        label: 'Hard step exhausted',
        message:
          'The workshop difficulty probe could not finish this puzzle with the current easy/medium rules plus one queen assumption at a time.',
        flagsPlaced: 0,
        queensPlaced: 0,
      },
    ],
  };
}
