import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import type { GridSquare, MarkType, Pos } from '../types/types';
import type { QueensAdminStitchingPreview } from '../admin/types';
import { assignRegionPaletteColors } from '../utils/regionDisplay';
import { isDiagonalTouch, isOrthogonalConflict } from '../utils/queensRules';

export type ScrollingQueensPlacementMode = 'auto' | 'flag' | 'queen';
export type ScrollingQueensAutoFlagAnimationSource = 'blocked' | 'pattern';

interface RectangularBoardContext {
  grid: GridSquare[][];
  playerMarks: MarkType[][];
  rowCount: number;
  colCount: number;
  orthogonalMinDistance: number;
}

function cloneMarks(playerMarks: MarkType[][]): MarkType[][] {
  return playerMarks.map((row) => [...row]);
}

function emptyMarks(rowCount: number, colCount: number): MarkType[][] {
  return Array.from({ length: rowCount }, () => Array<MarkType>(colCount).fill(null));
}

function collectMarks(playerMarks: MarkType[][], markType: MarkType): Pos[] {
  const positions: Pos[] = [];
  for (let row = 0; row < playerMarks.length; row++) {
    for (let col = 0; col < (playerMarks[row]?.length ?? 0); col++) {
      if (playerMarks[row]?.[col] === markType) {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

function countMarks(playerMarks: MarkType[][], markType: MarkType): number {
  return collectMarks(playerMarks, markType).length;
}

function isValidMoveOnRectangularBoard(
  ctx: RectangularBoardContext,
  row: number,
  col: number
): boolean {
  const target = ctx.grid[row]?.[col];
  if (!target || target.isBlackout) return false;

  const candidate = { row, col };
  const groupColor = target.groupColor;
  for (let r = 0; r < ctx.rowCount; r++) {
    for (let c = 0; c < ctx.colCount; c++) {
      if (ctx.playerMarks[r]?.[c] !== 'queen') continue;
      const queen = { row: r, col: c };
      if (isOrthogonalConflict(candidate, queen, ctx.orthogonalMinDistance)) return false;
      if (isDiagonalTouch(candidate, queen)) return false;
      if (groupColor && ctx.grid[r]?.[c]?.groupColor === groupColor) return false;
    }
  }

  return true;
}

function getAutoFlagPositions(ctx: RectangularBoardContext): Pos[] {
  const positions: Pos[] = [];
  for (let row = 0; row < ctx.rowCount; row++) {
    for (let col = 0; col < ctx.colCount; col++) {
      if (ctx.playerMarks[row]?.[col] === null && !isValidMoveOnRectangularBoard(ctx, row, col)) {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

function buildColorGroups(grid: GridSquare[][]): Record<string, Pos[]> {
  const groups: Record<string, Pos[]> = {};
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
      const color = grid[row]?.[col]?.groupColor;
      if (!color) continue;
      if (!groups[color]) groups[color] = [];
      groups[color].push({ row, col });
    }
  }
  return groups;
}

function detectRectangularErrors(ctx: RectangularBoardContext): {
  keys: Set<string>;
  message: string | null;
} {
  const errorKeys = new Set<string>();
  const queens = collectMarks(ctx.playerMarks, 'queen');

  for (let index = 0; index < queens.length; index++) {
    const left = queens[index]!;
    for (let nextIndex = index + 1; nextIndex < queens.length; nextIndex++) {
      const right = queens[nextIndex]!;
      if (isDiagonalTouch(left, right)) {
        errorKeys.add(`${left.row},${left.col}`);
        errorKeys.add(`${right.row},${right.col}`);
        return { keys: errorKeys, message: 'Queens cannot touch diagonally' };
      }
    }
  }

  let orthogonalMessage: string | null = null;
  for (let index = 0; index < queens.length; index++) {
    const left = queens[index]!;
    for (let nextIndex = index + 1; nextIndex < queens.length; nextIndex++) {
      const right = queens[nextIndex]!;
      if (isOrthogonalConflict(left, right, ctx.orthogonalMinDistance)) {
        errorKeys.add(`${left.row},${left.col}`);
        errorKeys.add(`${right.row},${right.col}`);
        orthogonalMessage =
          left.row === right.row
            ? `Queens in the same row must be at least ${ctx.orthogonalMinDistance} apart`
            : `Queens in the same column must be at least ${ctx.orthogonalMinDistance} apart`;
      }
    }
  }
  if (orthogonalMessage) return { keys: errorKeys, message: orthogonalMessage };

  for (const squares of Object.values(buildColorGroups(ctx.grid))) {
    const queensInGroup = squares.filter(
      (square) => ctx.playerMarks[square.row]?.[square.col] === 'queen'
    );
    if (queensInGroup.length > 1) {
      queensInGroup.forEach((square) => errorKeys.add(`${square.row},${square.col}`));
      return { keys: errorKeys, message: 'Only 1 queen per color group' };
    }
  }

  for (const [color, squares] of Object.entries(buildColorGroups(ctx.grid))) {
    const allFlagged =
      squares.length > 0 &&
      squares.every((square) => ctx.playerMarks[square.row]?.[square.col] === 'flag');
    if (allFlagged) {
      squares.forEach((square) => errorKeys.add(`${square.row},${square.col}`));
      return { keys: errorKeys, message: `Color group ${color} must still allow a queen` };
    }
  }

  return { keys: errorKeys, message: null };
}

function boardIsSolved(
  grid: GridSquare[][],
  playerMarks: MarkType[][],
  targetQueenCount: number
): boolean {
  const playerQueens = collectMarks(playerMarks, 'queen');
  if (playerQueens.length !== targetQueenCount) return false;

  const solutionQueens = new Set<string>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell.isSolutionQueen) {
        solutionQueens.add(`${cell.position.row},${cell.position.col}`);
      }
    }
  }

  return playerQueens.every((queen) => solutionQueens.has(`${queen.row},${queen.col}`));
}

export const useScrollingQueensStore = defineStore('scrollingQueens', () => {
  const grid = ref<GridSquare[][]>([]);
  const playerMarks = ref<MarkType[][]>([]);
  const moveHistory = ref<MarkType[][][]>([]);
  const targetQueenCount = ref(0);
  const orthogonalMinDistance = ref(5);
  const showSolution = ref(false);
  const isComplete = ref(false);
  const errorMessage = ref<string | null>(null);
  const errorSquares = ref<Set<string>>(new Set());
  const hintMessage = ref<string | null>(null);
  const hintOutputCellKeys = ref<Set<string>>(new Set());
  const hintDisplayTimeout = ref<number | null>(null);
  const autoFlagAnimationCells = ref<Set<string>>(new Set());
  const autoFlagAnimationSources = reactive(
    new Map<string, ScrollingQueensAutoFlagAnimationSource>()
  );
  const autoFlagTimeouts = reactive(new Map<string, number>());
  const uiState = reactive({
    placementMode: 'auto' as ScrollingQueensPlacementMode,
    autoFlagging: true,
  });

  const rowCount = computed(() => grid.value.length);
  const colCount = computed(() => grid.value[0]?.length ?? 0);
  const queenCount = computed(() => countMarks(playerMarks.value, 'queen'));
  const flagCount = computed(() => countMarks(playerMarks.value, 'flag'));
  const solutionQueenPositions = computed(() =>
    grid.value.flatMap((row) =>
      row.filter((cell) => cell.isSolutionQueen).map((cell) => cell.position)
    )
  );

  function context(): RectangularBoardContext {
    return {
      grid: grid.value,
      playerMarks: playerMarks.value,
      rowCount: rowCount.value,
      colCount: colCount.value,
      orthogonalMinDistance: orthogonalMinDistance.value,
    };
  }

  function clearAutoFlagAnimations(): void {
    for (const timeout of autoFlagTimeouts.values()) {
      window.clearTimeout(timeout);
    }
    autoFlagTimeouts.clear();
    autoFlagAnimationCells.value = new Set();
    autoFlagAnimationSources.clear();
  }

  function clearHintState(): void {
    hintMessage.value = null;
    hintOutputCellKeys.value = new Set();
    if (hintDisplayTimeout.value !== null) {
      window.clearTimeout(hintDisplayTimeout.value);
      hintDisplayTimeout.value = null;
    }
  }

  function showHint(message: string, outputCells: Pos[] = []): void {
    clearHintState();
    hintMessage.value = message;
    hintOutputCellKeys.value = new Set(outputCells.map((cell) => `${cell.row},${cell.col}`));
    hintDisplayTimeout.value = window.setTimeout(() => {
      clearHintState();
    }, 8000);
  }

  function syncErrorState(): void {
    const result = detectRectangularErrors(context());
    errorSquares.value = result.keys;
    errorMessage.value = result.message;
  }

  function checkCompletion(): void {
    isComplete.value = boardIsSolved(grid.value, playerMarks.value, targetQueenCount.value);
  }

  function saveToHistory(): void {
    moveHistory.value = [...moveHistory.value, cloneMarks(playerMarks.value)];
  }

  function triggerAutoFlagAnimation(
    row: number,
    col: number,
    source: ScrollingQueensAutoFlagAnimationSource,
    delayMs = 0
  ): void {
    const key = `${row},${col}`;
    if (autoFlagTimeouts.has(key)) {
      window.clearTimeout(autoFlagTimeouts.get(key));
    }
    const timeout = window.setTimeout(() => {
      autoFlagAnimationCells.value = new Set([...autoFlagAnimationCells.value, key]);
      autoFlagAnimationSources.set(key, source);
      const clearTimeoutId = window.setTimeout(() => {
        const next = new Set(autoFlagAnimationCells.value);
        next.delete(key);
        autoFlagAnimationCells.value = next;
        autoFlagAnimationSources.delete(key);
        autoFlagTimeouts.delete(key);
      }, 650);
      autoFlagTimeouts.set(key, clearTimeoutId);
    }, delayMs);
    autoFlagTimeouts.set(key, timeout);
  }

  function updateBlockedMoves(): void {
    let flagsPlaced = 0;
    for (const position of getAutoFlagPositions(context())) {
      if (playerMarks.value[position.row]?.[position.col] !== null) continue;
      playerMarks.value[position.row]![position.col] = 'flag';
      triggerAutoFlagAnimation(
        position.row,
        position.col,
        'blocked',
        Math.min(flagsPlaced, 10) * 45
      );
      flagsPlaced += 1;
    }
    syncErrorState();
  }

  function hydrateFromVerticalPreview(preview: QueensAdminStitchingPreview): void {
    clearAutoFlagAnimations();
    clearHintState();
    const cells = preview.stitchedBoard.cells;
    const baseGrid = cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        position: { row: rowIndex, col: colIndex },
        groupColor: cell.state === 'blackout' ? undefined : (cell.groupId ?? undefined),
        isSolutionQueen: cell.state === 'queen',
        isBlackout: cell.state === 'blackout',
      }))
    );

    grid.value = assignRegionPaletteColors(baseGrid, 'pattern-variants');
    playerMarks.value = emptyMarks(preview.stitchedBoard.height, preview.stitchedBoard.width);
    moveHistory.value = [];
    targetQueenCount.value = solutionQueenPositions.value.length;
    orthogonalMinDistance.value = preview.orthogonalMinDistance;
    showSolution.value = false;
    isComplete.value = false;
    errorMessage.value = null;
    errorSquares.value = new Set();
  }

  function placeFlag(row: number, col: number): void {
    if (!grid.value[row]?.[col] || grid.value[row]?.[col]?.isBlackout) return;
    if (playerMarks.value[row]?.[col] !== null) return;
    saveToHistory();
    playerMarks.value[row]![col] = 'flag';
    syncErrorState();
    clearHintState();
  }

  function placeQueen(row: number, col: number): void {
    if (!grid.value[row]?.[col] || grid.value[row]?.[col]?.isBlackout) return;
    saveToHistory();
    playerMarks.value[row]![col] = 'queen';
    if (uiState.autoFlagging) {
      updateBlockedMoves();
    } else {
      syncErrorState();
    }
    checkCompletion();
    clearHintState();
  }

  function removeMark(row: number, col: number): void {
    if (playerMarks.value[row]?.[col] == null) return;
    saveToHistory();
    playerMarks.value[row]![col] = null;
    syncErrorState();
    checkCompletion();
    clearHintState();
  }

  function handleSquareClick(row: number, col: number): void {
    if (!grid.value[row]?.[col] || grid.value[row]?.[col]?.isBlackout) return;
    const current = playerMarks.value[row]?.[col] ?? null;

    if (uiState.placementMode === 'flag') {
      if (current === null) placeFlag(row, col);
      else removeMark(row, col);
      return;
    }

    if (uiState.placementMode === 'queen') {
      if (current === 'queen') removeMark(row, col);
      else placeQueen(row, col);
      return;
    }

    if (current === null) {
      placeFlag(row, col);
    } else if (current === 'flag') {
      placeQueen(row, col);
    } else {
      removeMark(row, col);
    }
  }

  function handleUndo(): void {
    const previous = moveHistory.value.at(-1);
    if (!previous) return;
    playerMarks.value = cloneMarks(previous);
    moveHistory.value = moveHistory.value.slice(0, -1);
    syncErrorState();
    checkCompletion();
    clearHintState();
  }

  function clearAll(): void {
    if (rowCount.value === 0 || colCount.value === 0) return;
    saveToHistory();
    playerMarks.value = emptyMarks(rowCount.value, colCount.value);
    clearAutoFlagAnimations();
    syncErrorState();
    checkCompletion();
    clearHintState();
  }

  function getFirstTenCells(): Pos[] {
    const total = Math.min(10, rowCount.value * colCount.value);
    return Array.from({ length: total }, (_, index) => ({
      row: Math.floor(index / colCount.value),
      col: index % colCount.value,
    }));
  }

  function buildFirstTenSolverProjection(): {
    grid: GridSquare[][];
    playerMarks: MarkType[][];
    gridSize: number;
    allowedKeys: Set<string>;
  } | null {
    if (colCount.value <= 0) return null;
    const firstTenCells = getFirstTenCells();
    if (firstTenCells.length === 0) return null;
    const gridSize = Math.max(
      colCount.value,
      ...firstTenCells.map((cell) => cell.row + 1),
      ...firstTenCells.map((cell) => cell.col + 1)
    );
    const allowedKeys = new Set(firstTenCells.map((cell) => `${cell.row},${cell.col}`));
    const projectedGrid: GridSquare[][] = Array.from({ length: gridSize }, (_, row) =>
      Array.from({ length: gridSize }, (_, col) => {
        const source = allowedKeys.has(`${row},${col}`) ? grid.value[row]?.[col] : null;
        return source
          ? {
              ...source,
              position: { row, col },
            }
          : {
              position: { row, col },
              groupColor: undefined,
              isSolutionQueen: false,
            };
      })
    );
    const projectedMarks: MarkType[][] = Array.from({ length: gridSize }, (_, row) =>
      Array.from({ length: gridSize }, (_, col) =>
        allowedKeys.has(`${row},${col}`) ? (playerMarks.value[row]?.[col] ?? null) : 'flag'
      )
    );

    return {
      grid: projectedGrid,
      playerMarks: projectedMarks,
      gridSize,
      allowedKeys,
    };
  }

  async function requestHint(): Promise<void> {
    const projection = buildFirstTenSolverProjection();
    if (!projection) {
      showHint('Limited hint looked only at the first 10 squares. No board is loaded yet.');
      return;
    }

    const { applyQueensSolverStep, getOrderedApplicableQueensSolverSteps } = await import(
      '../solver/stagedSolver'
    );
    const solverState = {
      grid: projection.grid,
      playerMarks: projection.playerMarks,
      gridSize: projection.gridSize,
      targetQueenCount: targetQueenCount.value,
      orthogonalMinDistance: orthogonalMinDistance.value,
    };
    const step =
      getOrderedApplicableQueensSolverSteps(solverState, 'unsolvable').find((candidate) =>
        candidate.changes.some((change) =>
          projection.allowedKeys.has(`${change.row},${change.col}`)
        )
      ) ?? null;

    if (!step) {
      showHint(
        'Limited hint used the existing Queens solver on only the first 10 squares. Nothing useful was visible there.'
      );
      return;
    }

    const nextProjectedMarks = applyQueensSolverStep(solverState, step);
    const outputCells = step.outputCells.filter((cell) =>
      projection.allowedKeys.has(`${cell.row},${cell.col}`)
    );
    let changed = false;
    const nextMarks = cloneMarks(playerMarks.value);

    for (const key of projection.allowedKeys) {
      const [row, col] = key.split(',').map(Number) as [number, number];
      const nextMark = nextProjectedMarks[row]?.[col] ?? null;
      if (nextMarks[row]?.[col] === nextMark) continue;
      nextMarks[row]![col] = nextMark;
      changed = true;
    }

    if (!changed) {
      showHint(
        'Limited hint used the existing Queens solver on only the first 10 squares, but its next move was outside that window.'
      );
      return;
    }

    saveToHistory();
    playerMarks.value = nextMarks;
    syncErrorState();
    checkCompletion();
    showHint(`Limited hint used existing Queens solver: ${step.explanation}`, outputCells);
  }

  function setPlacementMode(mode: ScrollingQueensPlacementMode): void {
    uiState.placementMode = mode;
  }

  function setAutoFlagging(enabled: boolean): void {
    uiState.autoFlagging = enabled;
  }

  function toggleSolution(): void {
    showSolution.value = !showSolution.value;
  }

  function isSquareInError(row: number, col: number): boolean {
    return errorSquares.value.has(`${row},${col}`);
  }

  function isAutoFlagAnimating(row: number, col: number): boolean {
    return autoFlagAnimationCells.value.has(`${row},${col}`);
  }

  function getAutoFlagAnimationSource(
    row: number,
    col: number
  ): ScrollingQueensAutoFlagAnimationSource | null {
    return autoFlagAnimationSources.get(`${row},${col}`) ?? null;
  }

  return {
    grid,
    playerMarks,
    moveHistory,
    targetQueenCount,
    orthogonalMinDistance,
    showSolution,
    isComplete,
    errorMessage,
    errorSquares,
    hintMessage,
    hintOutputCellKeys,
    uiState,
    rowCount,
    colCount,
    queenCount,
    flagCount,
    solutionQueenPositions,
    hydrateFromVerticalPreview,
    handleSquareClick,
    placeFlag,
    placeQueen,
    removeMark,
    handleUndo,
    clearAll,
    requestHint,
    clearHintState,
    updateBlockedMoves,
    setPlacementMode,
    setAutoFlagging,
    toggleSolution,
    isSquareInError,
    isAutoFlagAnimating,
    getAutoFlagAnimationSource,
  };
});

export type ScrollingQueensStore = ReturnType<typeof useScrollingQueensStore>;
