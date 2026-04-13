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

interface ContradictionResult {
  hasContradiction: boolean;
  conflictCells: Pos[];
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
    return { hasContradiction: true, conflictCells: queens };
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
        return { hasContradiction: true, conflictCells: [left, right] };
      }
    }
  }

  const grouped = getGroupedPositions(state);
  for (const positions of grouped.values()) {
    const queensInGroup = positions.filter(
      (position) => state.playerMarks[position.row][position.col] === 'queen'
    );
    if (queensInGroup.length > 1) {
      return { hasContradiction: true, conflictCells: queensInGroup };
    }
    if (queensInGroup.length === 0 && candidatePositions(state, positions).length === 0) {
      return { hasContradiction: true, conflictCells: positions };
    }
  }

  if (requiresLineCoverage(state)) {
    for (let row = 0; row < state.gridSize; row++) {
      const rowCells = Array.from({ length: state.gridSize }, (_, col) => ({ row, col }));
      const queensInRow = rowCells.filter(
        (position) => state.playerMarks[position.row][position.col] === 'queen'
      );
      if (queensInRow.length > 1) {
        return { hasContradiction: true, conflictCells: queensInRow };
      }
      if (
        queensInRow.length === 0 &&
        rowCells.every((position) => !isCandidateCell(state, position.row, position.col))
      ) {
        return { hasContradiction: true, conflictCells: rowCells };
      }
    }

    for (let col = 0; col < state.gridSize; col++) {
      const colCells = Array.from({ length: state.gridSize }, (_, row) => ({ row, col }));
      const queensInCol = colCells.filter(
        (position) => state.playerMarks[position.row][position.col] === 'queen'
      );
      if (queensInCol.length > 1) {
        return { hasContradiction: true, conflictCells: queensInCol };
      }
      if (
        queensInCol.length === 0 &&
        colCells.every((position) => !isCandidateCell(state, position.row, position.col))
      ) {
        return { hasContradiction: true, conflictCells: colCells };
      }
    }
  }

  return { hasContradiction: false, conflictCells };
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
      "This group only has one spot left.\nThat's where the queen goes.",
      positions,
      changes.map(({ row, col }) => ({ row, col })),
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

    const step = buildStep(
      config,
      "All the spots for this group are in one line.\nSo these nearby squares can't work.",
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
            stepId === 'row-column'
              ? "These lines are already taken by these groups.\nThere's no space left here."
              : 'These lines already have just enough space.\nNothing else fits here.',
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
        "If a queen went here, something would break.\nSo this square can't be right.",
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
    explanation: "Try imagining a queen here.\nIt doesn't work, so we can rule it out.",
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

  let nextStep = runSingleQueenContradictionStep(currentState);

  while (nextStep) {
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
    "Try imagining a queen here.\nIt doesn't work, so we can rule it out.",
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
  const outputs: Pos[] = [];
  const evidenceCells: Pos[] = [];
  const changes: QueensSolverCellChange[] = [];
  const seen = new Set<string>();
  let matchedPreviewVariant: PatternVariant | null = null;

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

        for (const cell of absoluteActive) {
          evidenceCells.push(cell);
        }

        if (matchedPreviewVariant === null) {
          matchedPreviewVariant = variant;
        }

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
      }
    }
  }

  if (changes.length === 0) {
    return null;
  }

  return buildStep(
    pattern,
    `This group matches the ${pattern.name} pattern.\nWhen a group has this shape, these squares cannot hold the queen.`,
    evidenceCells,
    outputs,
    changes,
    {
      patternPreview: matchedPreviewVariant
        ? {
            id: pattern.id,
            name: pattern.name,
            size: pattern.size,
            cells: matchedPreviewVariant.previewCells.map((cell) => ({
              row: cell.row,
              col: cell.col,
              activeSquare: true,
            })),
            outputFlags: matchedPreviewVariant.previewOutputFlags.map((flag) => ({
              row: flag.row,
              col: flag.col,
            })),
          }
        : undefined,
    }
  );
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
