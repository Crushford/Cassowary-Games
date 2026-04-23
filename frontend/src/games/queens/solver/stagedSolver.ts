import type { GridSquare, MarkType, Pos } from '../types/types';
import {
  SHARED_QUEENS_SOLVER_CONFIG,
  type SharedBuiltInSolverStepConfig,
  type SharedSolverDifficulty,
  type SharedSolverPatternConfig,
} from './sharedSolverConfig';

export interface QueensSolverState {
  grid: GridSquare[][];
  playerMarks: MarkType[][];
  gridSize: number;
  targetQueenCount: number;
  orthogonalMinDistance: number;
}

export interface QueensSolverCellChange {
  row: number;
  col: number;
  mark: Exclude<MarkType, null | 'invalid'>;
  explanation: string;
}

export interface QueensSolverPatternPreview {
  id: string;
  name: string;
  size: number;
  cells: Array<{ row: number; col: number; activeSquare?: boolean }>;
  outputFlags: Array<{ row: number; col: number }>;
}

export interface QueensSolverStep {
  stepId: string;
  label: string;
  difficultyTier: SharedSolverDifficulty;
  explanation: string;
  evidenceCells: Pos[];
  outputCells: Pos[];
  changes: QueensSolverCellChange[];
  patternPreview?: QueensSolverPatternPreview;
}

interface MutableSolverState {
  grid: GridSquare[][];
  playerMarks: MarkType[][];
  gridSize: number;
  targetQueenCount: number;
  orthogonalMinDistance: number;
}

type ContradictionReasonCode =
  | 'queen-count-exceeded'
  | 'queen-conflict-same-group'
  | 'queen-conflict-orthogonal'
  | 'queen-conflict-diagonal'
  | 'group-no-candidates'
  | 'row-multiple-queens'
  | 'row-no-candidates'
  | 'column-multiple-queens'
  | 'column-no-candidates';

interface ContradictionReason {
  code: ContradictionReasonCode;
  row?: number;
  col?: number;
  color?: string | null;
}

interface ContradictionResult {
  hasContradiction: boolean;
  conflictCells: Pos[];
  reason: ContradictionReason | null;
}

interface PatternVariant {
  activeCells: Pos[];
  activeWindowHeight: number;
  activeWindowWidth: number;
  outputFlags: Pos[];
  previewCells: Pos[];
  previewOutputFlags: Pos[];
}

type FlipMode = 'none' | 'horizontal' | 'vertical';

const DIFFICULTY_RANK = new Map(
  SHARED_QUEENS_SOLVER_CONFIG.difficultyOrder.map(
    (difficulty, index) => [difficulty, index] as const
  )
);

function cloneMarks(playerMarks: MarkType[][]): MarkType[][] {
  return playerMarks.map((row) => [...row]);
}

function cloneState(state: QueensSolverState | MutableSolverState): MutableSolverState {
  return {
    grid: state.grid,
    playerMarks: cloneMarks(state.playerMarks),
    gridSize: state.gridSize,
    targetQueenCount: state.targetQueenCount,
    orthogonalMinDistance: state.orthogonalMinDistance,
  };
}

function keyForPos(row: number, col: number): string {
  return `${row},${col}`;
}

function samePos(left: Pos, right: Pos): boolean {
  return left.row === right.row && left.col === right.col;
}

function sortPositions(positions: Pos[]): Pos[] {
  return [...positions].sort((left, right) =>
    left.row === right.row ? left.col - right.col : left.row - right.row
  );
}

function uniquePositions(positions: Pos[]): Pos[] {
  const seen = new Set<string>();
  const deduped: Pos[] = [];
  for (const pos of positions) {
    const key = keyForPos(pos.row, pos.col);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(pos);
  }
  return deduped;
}

function getPlacedQueens(state: MutableSolverState): Pos[] {
  const queens: Pos[] = [];
  for (let row = 0; row < state.gridSize; row++) {
    for (let col = 0; col < state.gridSize; col++) {
      if (state.playerMarks[row][col] === 'queen') {
        queens.push({ row, col });
      }
    }
  }
  return queens;
}

function requiresLineCoverage(state: MutableSolverState): boolean {
  return state.targetQueenCount === state.gridSize && state.orthogonalMinDistance >= state.gridSize;
}

function isDiagonalTouch(left: Pos, right: Pos): boolean {
  return Math.abs(left.row - right.row) === 1 && Math.abs(left.col - right.col) === 1;
}

function isOrthogonalConflict(left: Pos, right: Pos, orthogonalMinDistance: number): boolean {
  if (left.row === right.row) {
    return Math.abs(left.col - right.col) < orthogonalMinDistance;
  }
  if (left.col === right.col) {
    return Math.abs(left.row - right.row) < orthogonalMinDistance;
  }
  return false;
}

function getGroupColor(state: MutableSolverState, row: number, col: number): string | null {
  return state.grid[row]?.[col]?.groupColor ?? null;
}

function getGroupedPositions(state: MutableSolverState): Map<string, Pos[]> {
  const groups = new Map<string, Pos[]>();
  for (let row = 0; row < state.gridSize; row++) {
    for (let col = 0; col < state.gridSize; col++) {
      const color = getGroupColor(state, row, col);
      if (!color) continue;
      const positions = groups.get(color) ?? [];
      positions.push({ row, col });
      groups.set(color, positions);
    }
  }
  return groups;
}

function hasQueenInGroup(state: MutableSolverState, color: string): boolean {
  for (let row = 0; row < state.gridSize; row++) {
    for (let col = 0; col < state.gridSize; col++) {
      if (getGroupColor(state, row, col) === color && state.playerMarks[row][col] === 'queen') {
        return true;
      }
    }
  }
  return false;
}

function isCandidateCell(state: MutableSolverState, row: number, col: number): boolean {
  if (state.playerMarks[row][col] !== null) {
    return false;
  }

  const color = getGroupColor(state, row, col);
  if (!color) {
    return false;
  }

  if (hasQueenInGroup(state, color)) {
    return false;
  }

  for (const queen of getPlacedQueens(state)) {
    if (isOrthogonalConflict({ row, col }, queen, state.orthogonalMinDistance)) {
      return false;
    }
    if (isDiagonalTouch({ row, col }, queen)) {
      return false;
    }
    if (getGroupColor(state, queen.row, queen.col) === color) {
      return false;
    }
  }

  return true;
}

function candidatePositions(state: MutableSolverState, positions: Pos[]): Pos[] {
  return positions.filter((position) => isCandidateCell(state, position.row, position.col));
}

function colorGroupLabel(state: MutableSolverState, color: string | null | undefined): string {
  if (!color) {
    return 'this color group';
  }
  for (let row = 0; row < state.gridSize; row++) {
    for (let col = 0; col < state.gridSize; col++) {
      if (getGroupColor(state, row, col) !== color) continue;
      const visualColor = state.grid[row]?.[col]?.groupAppearance?.color;
      if (visualColor) {
        return `the ${visualColor} color group`;
      }
    }
  }
  return 'this color group';
}

function groupDisplayName(state: MutableSolverState, color: string): string {
  for (let row = 0; row < state.gridSize; row++) {
    for (let col = 0; col < state.gridSize; col++) {
      if (getGroupColor(state, row, col) !== color) continue;
      const visualColor = state.grid[row]?.[col]?.groupAppearance?.color;
      if (visualColor) {
        return visualColor;
      }
    }
  }
  return color;
}

function formatNaturalList(values: string[]): string {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function formatLineLabel(isColumn: boolean, selectedLines: number[]): string {
  const axisSingular = isColumn ? 'column' : 'row';
  const axisPlural = isColumn ? 'columns' : 'rows';
  const lineNumbers = selectedLines.map((line) => String(line + 1));
  return `${selectedLines.length === 1 ? axisSingular : axisPlural} ${formatNaturalList(lineNumbers)}`;
}

function constrainedLineExplanation(args: {
  state: MutableSolverState;
  isColumn: boolean;
  selectedLines: number[];
  confinedColors: string[];
}): string {
  const { state, isColumn, selectedLines, confinedColors } = args;
  const lineLabel = formatLineLabel(isColumn, selectedLines);
  const colorNames = formatNaturalList(
    confinedColors.map((color) => groupDisplayName(state, color))
  );

  if (state.orthogonalMinDistance >= state.gridSize) {
    return `Only ${colorNames} can place queens in ${lineLabel}. Therefore, every other color group is blocked in ${lineLabel}.`;
  }

  return `Only ${colorNames} can place queens in these squares in ${lineLabel}. With a minimum queen distance of ${state.orthogonalMinDistance}, every other color group is blocked within this distance window.`;
}

function contradictionExplanation(
  state: MutableSolverState,
  contradiction: ContradictionResult
): string {
  const reason = contradiction.reason;
  if (!reason) {
    return 'Placing a queen here causes a contradiction.';
  }

  switch (reason.code) {
    case 'queen-count-exceeded':
      return 'Placing a queen here would exceed the required queen count.';
    case 'queen-conflict-same-group':
      return `Placing a queen here would force two queens into ${colorGroupLabel(state, reason.color)}.`;
    case 'queen-conflict-orthogonal':
      if (typeof reason.row === 'number') {
        return `Placing a queen here would put queens too close in row ${reason.row + 1}.`;
      }
      if (typeof reason.col === 'number') {
        return `Placing a queen here would put queens too close in column ${reason.col + 1}.`;
      }
      return 'Placing a queen here would put two queens too close in the same row or column.';
    case 'queen-conflict-diagonal':
      return 'Placing a queen here would make two queens touch diagonally.';
    case 'group-no-candidates':
      return `Placing a queen here blocks all remaining squares in ${colorGroupLabel(state, reason.color)}.`;
    case 'row-multiple-queens':
      if (typeof reason.row === 'number') {
        return `Placing a queen here would force more than one queen in row ${reason.row + 1}.`;
      }
      return 'Placing a queen here would force more than one queen in a row.';
    case 'row-no-candidates':
      if (typeof reason.row === 'number') {
        return `Placing a queen here blocks all available squares in row ${reason.row + 1}.`;
      }
      return 'Placing a queen here blocks all available squares in a row.';
    case 'column-multiple-queens':
      if (typeof reason.col === 'number') {
        return `Placing a queen here would force more than one queen in column ${reason.col + 1}.`;
      }
      return 'Placing a queen here would force more than one queen in a column.';
    case 'column-no-candidates':
      if (typeof reason.col === 'number') {
        return `Placing a queen here blocks all available squares in column ${reason.col + 1}.`;
      }
      return 'Placing a queen here blocks all available squares in a column.';
    default:
      return 'Placing a queen here causes a contradiction.';
  }
}

function placeFlag(
  state: MutableSolverState,
  row: number,
  col: number,
  explanation: string
): QueensSolverCellChange[] {
  if (state.playerMarks[row][col] !== null) {
    return [];
  }
  state.playerMarks[row][col] = 'flag';
  return [{ row, col, mark: 'flag', explanation }];
}

function placeQueen(
  state: MutableSolverState,
  row: number,
  col: number,
  explanation: string
): QueensSolverCellChange[] {
  if (state.playerMarks[row][col] === 'queen') {
    return [];
  }

  state.playerMarks[row][col] = 'queen';
  const changes: QueensSolverCellChange[] = [{ row, col, mark: 'queen', explanation }];
  const queen = { row, col };
  const color = getGroupColor(state, row, col);

  for (let nextRow = 0; nextRow < state.gridSize; nextRow++) {
    for (let nextCol = 0; nextCol < state.gridSize; nextCol++) {
      if (nextRow === row && nextCol === col) continue;
      if (state.playerMarks[nextRow][nextCol] !== null) continue;

      const sameGroupColor = color !== null && getGroupColor(state, nextRow, nextCol) === color;
      if (
        sameGroupColor ||
        isOrthogonalConflict(queen, { row: nextRow, col: nextCol }, state.orthogonalMinDistance) ||
        isDiagonalTouch(queen, { row: nextRow, col: nextCol })
      ) {
        changes.push(
          ...placeFlag(
            state,
            nextRow,
            nextCol,
            `Flagged because the queen at row ${row + 1}, column ${col + 1} blocks this square.`
          )
        );
      }
    }
  }

  return changes;
}

function findContradiction(state: MutableSolverState): ContradictionResult {
  const conflictCells: Pos[] = [];
  const queens = getPlacedQueens(state);
  if (queens.length > state.targetQueenCount) {
    return {
      hasContradiction: true,
      conflictCells: queens,
      reason: { code: 'queen-count-exceeded' },
    };
  }

  for (let index = 0; index < queens.length; index++) {
    const left = queens[index];
    for (let nextIndex = index + 1; nextIndex < queens.length; nextIndex++) {
      const right = queens[nextIndex];
      const sameGroup =
        getGroupColor(state, left.row, left.col) !== null &&
        getGroupColor(state, left.row, left.col) === getGroupColor(state, right.row, right.col);
      if (
        sameGroup ||
        isOrthogonalConflict(left, right, state.orthogonalMinDistance) ||
        isDiagonalTouch(left, right)
      ) {
        if (sameGroup) {
          return {
            hasContradiction: true,
            conflictCells: [left, right],
            reason: {
              code: 'queen-conflict-same-group',
              color: getGroupColor(state, left.row, left.col),
            },
          };
        }
        if (isOrthogonalConflict(left, right, state.orthogonalMinDistance)) {
          return {
            hasContradiction: true,
            conflictCells: [left, right],
            reason: {
              code: 'queen-conflict-orthogonal',
              row: left.row === right.row ? left.row : undefined,
              col: left.col === right.col ? left.col : undefined,
            },
          };
        }
        return {
          hasContradiction: true,
          conflictCells: [left, right],
          reason: { code: 'queen-conflict-diagonal' },
        };
      }
    }
  }

  const grouped = getGroupedPositions(state);
  for (const [color, positions] of grouped.entries()) {
    const queensInGroup = positions.filter(
      (position) => state.playerMarks[position.row][position.col] === 'queen'
    );
    if (queensInGroup.length > 1) {
      return {
        hasContradiction: true,
        conflictCells: queensInGroup,
        reason: { code: 'queen-conflict-same-group', color },
      };
    }
    if (queensInGroup.length === 0 && candidatePositions(state, positions).length === 0) {
      return {
        hasContradiction: true,
        conflictCells: positions,
        reason: { code: 'group-no-candidates', color },
      };
    }
  }

  if (requiresLineCoverage(state)) {
    for (let row = 0; row < state.gridSize; row++) {
      const rowCells = Array.from({ length: state.gridSize }, (_, col) => ({ row, col }));
      const queensInRow = rowCells.filter(
        (position) => state.playerMarks[position.row][position.col] === 'queen'
      );
      if (queensInRow.length > 1) {
        return {
          hasContradiction: true,
          conflictCells: queensInRow,
          reason: { code: 'row-multiple-queens', row },
        };
      }
      if (
        queensInRow.length === 0 &&
        rowCells.every((position) => !isCandidateCell(state, position.row, position.col))
      ) {
        return {
          hasContradiction: true,
          conflictCells: rowCells,
          reason: { code: 'row-no-candidates', row },
        };
      }
    }

    for (let col = 0; col < state.gridSize; col++) {
      const colCells = Array.from({ length: state.gridSize }, (_, row) => ({ row, col }));
      const queensInCol = colCells.filter(
        (position) => state.playerMarks[position.row][position.col] === 'queen'
      );
      if (queensInCol.length > 1) {
        return {
          hasContradiction: true,
          conflictCells: queensInCol,
          reason: { code: 'column-multiple-queens', col },
        };
      }
      if (
        queensInCol.length === 0 &&
        colCells.every((position) => !isCandidateCell(state, position.row, position.col))
      ) {
        return {
          hasContradiction: true,
          conflictCells: colCells,
          reason: { code: 'column-no-candidates', col },
        };
      }
    }
  }

  return { hasContradiction: false, conflictCells, reason: null };
}

function buildStep(
  config: SharedBuiltInSolverStepConfig | SharedSolverPatternConfig,
  explanation: string,
  evidenceCells: Pos[],
  outputCells: Pos[],
  changes: QueensSolverCellChange[],
  options?: {
    patternPreview?: QueensSolverPatternPreview;
  }
): QueensSolverStep | null {
  if (changes.length === 0) {
    return null;
  }

  return {
    stepId: config.id,
    label: 'label' in config ? config.label : `Pattern ${config.name}`,
    difficultyTier: config.difficultyTier,
    explanation,
    evidenceCells: sortPositions(uniquePositions(evidenceCells)),
    outputCells: sortPositions(uniquePositions(outputCells)),
    changes,
    patternPreview: options?.patternPreview,
  };
}

function runPrecheckStep(initialState: QueensSolverState): QueensSolverStep | null {
  const state = cloneState(initialState);
  const outputs: Pos[] = [];
  const changes: QueensSolverCellChange[] = [];

  for (let row = 0; row < state.gridSize; row++) {
    for (let col = 0; col < state.gridSize; col++) {
      if (getGroupColor(state, row, col) !== null) continue;
      if (state.playerMarks[row][col] !== null) continue;
      changes.push(
        ...placeFlag(state, row, col, 'Flagged because this square has no colour group.')
      );
      outputs.push({ row, col });
    }
  }

  if (changes.length === 0) {
    return null;
  }

  return {
    stepId: 'precheck',
    label: 'Board Precheck',
    difficultyTier: 'tutorial',
    explanation: 'These squares are outside every group.\nThey cannot hold a queen.',
    evidenceCells: [],
    outputCells: outputs,
    changes,
  };
}

function runSingleColorStep(initialState: QueensSolverState): QueensSolverStep | null {
  const config = SHARED_QUEENS_SOLVER_CONFIG.builtInSteps.find(
    (step) => step.id === 'single-color'
  );
  if (!config) return null;

  const state = cloneState(initialState);
  for (const [color, positions] of getGroupedPositions(state)) {
    if (hasQueenInGroup(state, color)) continue;
    const candidates = candidatePositions(state, positions);
    if (candidates.length !== 1) continue;
    const target = candidates[0];
    const changes = placeQueen(
      state,
      target.row,
      target.col,
      `Placed a queen because colour group ${color} has exactly one candidate left.`
    );
    return buildStep(
      config,
      'There is only one unflagged square left in this color group, so we should place a queen here.',
      positions,
      [{ row: target.row, col: target.col }],
      changes
    );
  }

  return null;
}

function runGroupConfinedToLineStep(initialState: QueensSolverState): QueensSolverStep | null {
  const config = SHARED_QUEENS_SOLVER_CONFIG.builtInSteps.find(
    (step) => step.id === 'group-confined-to-line'
  );
  if (!config) return null;

  const state = cloneState(initialState);
  for (const [color, positions] of getGroupedPositions(state)) {
    if (hasQueenInGroup(state, color)) continue;
    const candidates = candidatePositions(state, positions);
    if (candidates.length <= 1) continue;

    const sameRow = candidates.every((position) => position.row === candidates[0].row);
    const sameCol = candidates.every((position) => position.col === candidates[0].col);
    if (!sameRow && !sameCol) continue;

    const changes: QueensSolverCellChange[] = [];
    const outputs: Pos[] = [];
    if (sameRow) {
      const row = candidates[0].row;
      const minCol = Math.min(...candidates.map((position) => position.col));
      const maxCol = Math.max(...candidates.map((position) => position.col));
      const reservedWidth = maxCol - minCol + 1;
      const flagRadius = state.orthogonalMinDistance - reservedWidth;
      if (flagRadius <= 0) continue;

      for (
        let col = Math.max(0, minCol - flagRadius);
        col <= Math.min(state.gridSize - 1, maxCol + flagRadius);
        col++
      ) {
        if (col >= minCol && col <= maxCol) continue;
        if (getGroupColor(state, row, col) === color) continue;
        if (!isCandidateCell(state, row, col)) continue;
        changes.push(
          ...placeFlag(
            state,
            row,
            col,
            `Flagged because colour group ${color} is confined to row ${row + 1}.`
          )
        );
        outputs.push({ row, col });
      }
    }

    if (sameCol) {
      const col = candidates[0].col;
      const minRow = Math.min(...candidates.map((position) => position.row));
      const maxRow = Math.max(...candidates.map((position) => position.row));
      const reservedHeight = maxRow - minRow + 1;
      const flagRadius = state.orthogonalMinDistance - reservedHeight;
      if (flagRadius <= 0 && changes.length === 0) continue;

      if (flagRadius > 0) {
        for (
          let row = Math.max(0, minRow - flagRadius);
          row <= Math.min(state.gridSize - 1, maxRow + flagRadius);
          row++
        ) {
          if (row >= minRow && row <= maxRow) continue;
          if (getGroupColor(state, row, col) === color) continue;
          if (!isCandidateCell(state, row, col)) continue;
          changes.push(
            ...placeFlag(
              state,
              row,
              col,
              `Flagged because colour group ${color} is confined to column ${col + 1}.`
            )
          );
          outputs.push({ row, col });
        }
      }
    }

    const lineType = sameRow ? 'row' : 'column';
    const lineNumber = sameRow ? candidates[0].row + 1 : candidates[0].col + 1;
    const visualColor = state.grid[candidates[0].row]?.[candidates[0].col]?.groupAppearance?.color;
    const colorLabel = visualColor ?? color;
    const step = buildStep(
      config,
      `The ${colorLabel} color group's squares are all in ${lineType} ${lineNumber}.\nSo there can't be a queen anywhere else in ${lineType} ${lineNumber}.`,
      candidates,
      outputs,
      changes
    );
    if (step) return step;
  }

  return null;
}

function runConstrainedLineFamilyStep(
  initialState: QueensSolverState,
  stepId: 'row-column' | 'row-column-sets'
): QueensSolverStep | null {
  const config = SHARED_QUEENS_SOLVER_CONFIG.builtInSteps.find((step) => step.id === stepId);
  if (!config) return null;
  const state = cloneState(initialState);
  const useNonConsecutiveSets = stepId === 'row-column-sets';
  const grouped = getGroupedPositions(state);
  const distance = Math.min(state.orthogonalMinDistance, state.gridSize);

  const lineCombinations = (count: number, total: number): number[][] => {
    const results: number[][] = [];
    const build = (next: number, remaining: number, current: number[]) => {
      if (remaining === 0) {
        results.push([...current]);
        return;
      }
      for (let value = next; value <= total - remaining; value++) {
        current.push(value);
        build(value + 1, remaining - 1, current);
        current.pop();
      }
    };
    build(0, count, []);
    return results;
  };

  for (const isColumn of [false, true]) {
    const axisLabel = isColumn ? 'column' : 'row';
    const windowLabel = isColumn ? 'rows' : 'columns';

    for (let lineCount = useNonConsecutiveSets ? 2 : 1; lineCount <= state.gridSize; lineCount++) {
      const lineSets = useNonConsecutiveSets
        ? lineCombinations(lineCount, state.gridSize).filter(
            (lines) =>
              lines[lines.length - 1] - lines[0] + 1 <= distance &&
              !lines.every((line, index) => index === 0 || line === lines[index - 1] + 1)
          )
        : Array.from({ length: state.gridSize - lineCount + 1 }, (_, start) =>
            Array.from({ length: lineCount }, (_, offset) => start + offset)
          );

      for (const selectedLines of lineSets) {
        for (
          let secondaryStart = 0;
          secondaryStart <= state.gridSize - distance;
          secondaryStart++
        ) {
          const secondaryRange = Array.from(
            { length: distance },
            (_, index) => secondaryStart + index
          );
          const confinedColors = Array.from(grouped.entries())
            .filter(([color, positions]) => {
              if (hasQueenInGroup(state, color)) return false;
              const candidates = candidatePositions(state, positions);
              if (candidates.length === 0) return false;
              if (!useNonConsecutiveSets && lineCount === 1 && candidates.length <= 1) return false;
              return candidates.every((candidate) => {
                const primary = isColumn ? candidate.col : candidate.row;
                const secondary = isColumn ? candidate.row : candidate.col;
                return selectedLines.includes(primary) && secondaryRange.includes(secondary);
              });
            })
            .map(([color]) => color);

          if (confinedColors.length !== selectedLines.length) continue;

          const changes: QueensSolverCellChange[] = [];
          const outputs: Pos[] = [];
          const evidence: Pos[] = [];

          for (const color of confinedColors) {
            const positions = grouped.get(color) ?? [];
            evidence.push(...candidatePositions(state, positions));
          }

          for (const primary of selectedLines) {
            for (const secondary of secondaryRange) {
              const row = isColumn ? secondary : primary;
              const col = isColumn ? primary : secondary;
              if (state.playerMarks[row][col] !== null) continue;
              const color = getGroupColor(state, row, col);
              if (!color || confinedColors.includes(color)) continue;
              if (!isCandidateCell(state, row, col)) continue;
              changes.push(
                ...placeFlag(
                  state,
                  row,
                  col,
                  `Flagged because the ${axisLabel} ${selectedLines.map((line) => line + 1).join(', ')} window is reserved.`
                )
              );
              outputs.push({ row, col });
            }
          }

          const step = buildStep(
            config,
            constrainedLineExplanation({
              state,
              isColumn,
              selectedLines,
              confinedColors,
            }),
            evidence,
            outputs,
            changes
          );
          if (step) {
            return step;
          }
        }
      }
    }
  }

  return null;
}

function runSingleQueenContradictionStep(initialState: QueensSolverState): QueensSolverStep | null {
  const config = SHARED_QUEENS_SOLVER_CONFIG.builtInSteps.find(
    (step) => step.id === 'single-queen-contradiction'
  );
  if (!config) return null;
  const state = cloneState(initialState);

  for (let row = 0; row < state.gridSize; row++) {
    for (let col = 0; col < state.gridSize; col++) {
      if (!isCandidateCell(state, row, col)) continue;
      const assumed = cloneState(state);
      placeQueen(assumed, row, col, 'Temporary contradiction check.');
      const contradiction = findContradiction(assumed);
      if (!contradiction.hasContradiction) continue;
      const changes = placeFlag(
        state,
        row,
        col,
        `Flagged because assuming a queen at row ${row + 1}, column ${col + 1} causes a contradiction.`
      );
      return buildStep(
        config,
        contradictionExplanation(state, contradiction),
        [{ row, col }, ...contradiction.conflictCells],
        [{ row, col }],
        changes
      );
    }
  }

  return null;
}

function runAssumeProgressStep(initialState: QueensSolverState): QueensSolverStep | null {
  const config = SHARED_QUEENS_SOLVER_CONFIG.builtInSteps.find(
    (step) => step.id === 'assume-progress'
  );
  if (!config) return null;
  const contradictionStep = runSingleQueenContradictionStep(initialState);
  if (!contradictionStep) return null;
  return {
    ...contradictionStep,
    stepId: config.id,
    label: config.label,
    difficultyTier: config.difficultyTier,
  };
}

function runAssumeExhaustiveStep(initialState: QueensSolverState): QueensSolverStep | null {
  const config = SHARED_QUEENS_SOLVER_CONFIG.builtInSteps.find(
    (step) => step.id === 'assume-exhaustive'
  );
  if (!config) return null;

  const currentState = cloneState(initialState);
  const combinedChanges: QueensSolverCellChange[] = [];
  const evidenceCells: Pos[] = [];
  const outputCells: Pos[] = [];
  let firstExplanation: string | null = null;

  let nextStep = runSingleQueenContradictionStep(currentState);

  while (nextStep) {
    if (firstExplanation == null) {
      firstExplanation = nextStep.explanation;
    }
    evidenceCells.push(...nextStep.evidenceCells);
    outputCells.push(...nextStep.outputCells);
    combinedChanges.push(...nextStep.changes);

    for (const change of nextStep.changes) {
      currentState.playerMarks[change.row][change.col] = change.mark;
    }

    nextStep = runSingleQueenContradictionStep(currentState);
  }

  return buildStep(
    config,
    firstExplanation ?? 'Placing a queen here causes a contradiction.',
    evidenceCells,
    outputCells,
    combinedChanges
  );
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
      return pos;
  }
}

function transformCoord(pos: Pos, size: number, rotationsCW: number, flipMode: FlipMode): Pos {
  const rotated = rotateCoord(pos, size, rotationsCW);
  if (flipMode === 'horizontal') {
    return { row: rotated.row, col: size - 1 - rotated.col };
  }
  if (flipMode === 'vertical') {
    return { row: size - 1 - rotated.row, col: rotated.col };
  }
  return rotated;
}

function getPatternVariants(pattern: SharedSolverPatternConfig): PatternVariant[] {
  const activeCells = pattern.cells
    .filter((cell) => cell.activeSquare === true)
    .map((cell) => ({ row: cell.row, col: cell.col }));
  const unique = new Map<string, PatternVariant>();

  for (const flipMode of ['none', 'horizontal', 'vertical'] as const) {
    for (const rotationsCW of [0, 1, 2, 3] as const) {
      const transformedActive = activeCells.map((cell) =>
        transformCoord(cell, pattern.size, rotationsCW, flipMode)
      );
      const transformedFlags = pattern.outputFlags.map((flag) =>
        transformCoord(flag, pattern.size, rotationsCW, flipMode)
      );
      const minRow = transformedActive.length
        ? Math.min(...transformedActive.map((cell) => cell.row))
        : 0;
      const minCol = transformedActive.length
        ? Math.min(...transformedActive.map((cell) => cell.col))
        : 0;
      const maxRow = transformedActive.length
        ? Math.max(...transformedActive.map((cell) => cell.row))
        : 0;
      const maxCol = transformedActive.length
        ? Math.max(...transformedActive.map((cell) => cell.col))
        : 0;
      const variant: PatternVariant = {
        activeCells: sortPositions(
          transformedActive.map((cell) => ({
            row: cell.row - minRow,
            col: cell.col - minCol,
          }))
        ),
        activeWindowHeight: maxRow - minRow + 1,
        activeWindowWidth: maxCol - minCol + 1,
        outputFlags: sortPositions(
          transformedFlags.map((flag) => ({
            row: flag.row - minRow,
            col: flag.col - minCol,
          }))
        ),
        previewCells: sortPositions(transformedActive),
        previewOutputFlags: sortPositions(transformedFlags),
      };
      const signature = `${variant.activeCells.map((cell) => keyForPos(cell.row, cell.col)).join('|')}::${variant.outputFlags
        .map((flag) => keyForPos(flag.row, flag.col))
        .join('|')}`;
      if (!unique.has(signature)) {
        unique.set(signature, variant);
      }
    }
  }

  return Array.from(unique.values());
}

function runPatternStep(
  initialState: QueensSolverState,
  pattern: SharedSolverPatternConfig
): QueensSolverStep | null {
  if (pattern.size <= 0 || pattern.cells.length === 0 || pattern.outputFlags.length === 0) {
    return null;
  }

  const state = cloneState(initialState);
  const variants = getPatternVariants(pattern);

  for (const variant of variants) {
    for (let baseRow = 0; baseRow <= state.gridSize - variant.activeWindowHeight; baseRow++) {
      for (let baseCol = 0; baseCol <= state.gridSize - variant.activeWindowWidth; baseCol++) {
        const absoluteActive = variant.activeCells.map((cell) => ({
          row: baseRow + cell.row,
          col: baseCol + cell.col,
        }));
        if (
          absoluteActive.some(
            (cell) =>
              cell.row < 0 ||
              cell.row >= state.gridSize ||
              cell.col < 0 ||
              cell.col >= state.gridSize
          )
        ) {
          continue;
        }

        const focusColor = getGroupColor(state, absoluteActive[0].row, absoluteActive[0].col);
        if (!focusColor) continue;
        if (
          absoluteActive.some(
            (cell) =>
              getGroupColor(state, cell.row, cell.col) !== focusColor ||
              state.playerMarks[cell.row][cell.col] !== null
          )
        ) {
          continue;
        }

        const colorCells = Array.from({ length: state.gridSize }, (_, row) =>
          Array.from({ length: state.gridSize }, (_, col) => ({ row, col }))
        )
          .flat()
          .filter((cell) => getGroupColor(state, cell.row, cell.col) === focusColor);

        if (
          colorCells.some(
            (cell) =>
              !absoluteActive.some((active) => samePos(active, cell)) &&
              state.playerMarks[cell.row][cell.col] === null
          )
        ) {
          continue;
        }

        const outputs: Pos[] = [];
        const changes: QueensSolverCellChange[] = [];
        const seen = new Set<string>();

        for (const output of variant.outputFlags) {
          const row = baseRow + output.row;
          const col = baseCol + output.col;
          if (row < 0 || row >= state.gridSize || col < 0 || col >= state.gridSize) continue;
          if (state.playerMarks[row][col] !== null) continue;
          if (!isCandidateCell(state, row, col)) continue;
          const key = keyForPos(row, col);
          if (seen.has(key)) continue;
          seen.add(key);
          outputs.push({ row, col });
          changes.push(...placeFlag(state, row, col, `Flagged by solver pattern ${pattern.name}.`));
        }

        if (changes.length === 0) {
          continue;
        }

        return buildStep(
          pattern,
          "Here's a common pattern. When a color group forms the green shape, we can place flags in these squares.\nThey can't be queens because each one would block all remaining squares in the group.",
          absoluteActive,
          outputs,
          changes,
          {
            patternPreview: {
              id: pattern.id,
              name: pattern.name,
              size: pattern.size,
              cells: variant.previewCells.map((cell) => ({
                row: cell.row,
                col: cell.col,
                activeSquare: true,
              })),
              outputFlags: variant.previewOutputFlags.map((flag) => ({
                row: flag.row,
                col: flag.col,
              })),
            },
          }
        );
      }
    }
  }

  return null;
}

function runConfiguredStep(
  initialState: QueensSolverState,
  stepId: string
): QueensSolverStep | null {
  switch (stepId) {
    case 'group-confined-to-line':
      return runGroupConfinedToLineStep(initialState);
    case 'row-column':
      return runConstrainedLineFamilyStep(initialState, 'row-column');
    case 'row-column-sets':
      return runConstrainedLineFamilyStep(initialState, 'row-column-sets');
    case 'single-queen-contradiction':
      return runSingleQueenContradictionStep(initialState);
    case 'assume-progress':
      return runAssumeProgressStep(initialState);
    case 'assume-exhaustive':
      return runAssumeExhaustiveStep(initialState);
    default:
      return null;
  }
}

export function compareConfiguredStepOrder(
  left: SharedBuiltInSolverStepConfig | SharedSolverPatternConfig,
  right: SharedBuiltInSolverStepConfig | SharedSolverPatternConfig
): number {
  const leftRank = DIFFICULTY_RANK.get(left.difficultyTier) ?? Number.POSITIVE_INFINITY;
  const rightRank = DIFFICULTY_RANK.get(right.difficultyTier) ?? Number.POSITIVE_INFINITY;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }
  const leftLabel = 'label' in left ? left.label : left.name;
  const rightLabel = 'label' in right ? right.label : right.name;
  return leftLabel.localeCompare(rightLabel);
}

export function getNextQueensSolverStep(
  initialState: QueensSolverState,
  maxDifficultyTier: SharedSolverDifficulty = 'unsolvable'
): QueensSolverStep | null {
  return getOrderedApplicableQueensSolverSteps(initialState, maxDifficultyTier)[0] ?? null;
}

export function getOrderedApplicableQueensSolverSteps(
  initialState: QueensSolverState,
  maxDifficultyTier: SharedSolverDifficulty = 'unsolvable'
): QueensSolverStep[] {
  const maxRank = DIFFICULTY_RANK.get(maxDifficultyTier) ?? Number.POSITIVE_INFINITY;
  const applicableSteps: QueensSolverStep[] = [];
  const precheck = runPrecheckStep(initialState);
  if (precheck) {
    applicableSteps.push(precheck);
    return applicableSteps;
  }

  const singleColor = runSingleColorStep(initialState);
  if (singleColor) {
    applicableSteps.push(singleColor);
    return applicableSteps;
  }

  const configuredSteps = [
    ...SHARED_QUEENS_SOLVER_CONFIG.builtInSteps.filter((step) => step.id !== 'single-color'),
    ...SHARED_QUEENS_SOLVER_CONFIG.patterns,
  ]
    .filter((step) => step.enabled && (DIFFICULTY_RANK.get(step.difficultyTier) ?? 0) <= maxRank)
    .sort(compareConfiguredStepOrder);

  for (const step of configuredSteps) {
    const nextStep =
      'cells' in step
        ? runPatternStep(initialState, step)
        : runConfiguredStep(initialState, step.id);
    if (nextStep) {
      applicableSteps.push(nextStep);
    }
  }

  return applicableSteps;
}

export function applyQueensSolverStep(
  state: QueensSolverState,
  step: QueensSolverStep
): MarkType[][] {
  const nextMarks = cloneMarks(state.playerMarks);
  for (const change of step.changes) {
    nextMarks[change.row][change.col] = change.mark;
  }
  return nextMarks;
}

export function isQueensSolverStateSolved(state: QueensSolverState): boolean {
  let placedQueens = 0;
  for (let row = 0; row < state.gridSize; row++) {
    for (let col = 0; col < state.gridSize; col++) {
      const hasQueen = state.playerMarks[row][col] === 'queen';
      const isSolutionQueen = state.grid[row][col].isSolutionQueen;
      if (hasQueen !== isSolutionQueen) {
        return false;
      }
      if (hasQueen) {
        placedQueens += 1;
      }
    }
  }

  return placedQueens === state.targetQueenCount;
}

export function runQueensSolverUntilStuck(
  initialState: QueensSolverState,
  maxSteps: number = 256,
  maxDifficultyTier: SharedSolverDifficulty = 'unsolvable'
): QueensSolverStep[] {
  const steps: QueensSolverStep[] = [];
  const state = cloneState(initialState);
  for (let count = 0; count < maxSteps; count++) {
    const nextStep = getNextQueensSolverStep(state, maxDifficultyTier);
    if (!nextStep) {
      break;
    }
    steps.push(nextStep);
    state.playerMarks = applyQueensSolverStep(state, nextStep);
  }
  return steps;
}
