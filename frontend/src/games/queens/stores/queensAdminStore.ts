import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { ColorName } from '../types/types';
import { COLOR_PALETTE } from '../utils/colorPalette';
import { queensAdminApi } from '../admin/api';
import { useQueensStore } from './queensStore';
import type {
  QueensAdminBatchRunMode,
  QueensAdminBatchStatus,
  QueensAdminBoardState,
  QueensAdminGenerationProgress,
  QueensAdminQueenCountMode,
  QueensAdminGenerationStrategy,
  QueensAdminHistoryEntry,
  QueensAdminOperationResult,
  QueensAdminTool,
  QueensAdminValidationSummary,
} from '../admin/types';

const DEFAULT_BOARD_SIZE = 6;
const MAX_HISTORY_ENTRIES = 30;
const MAX_BOARD_HISTORY_ENTRIES = 30;
const TRACKED_BATCH_STORAGE_KEY = 'queens-admin-tracked-batches-v1';
const MAX_TRACKED_BATCHES = 8;

export const useQueensAdminStore = defineStore('queensAdmin', () => {
  const queensStore = useQueensStore();
  const board = ref<QueensAdminBoardState | null>(null);
  const boardSize = ref(DEFAULT_BOARD_SIZE);
  const queenCountMode = ref<QueensAdminQueenCountMode>('exact');
  const targetQueenCount = ref(DEFAULT_BOARD_SIZE);
  const orthogonalMinDistance = ref(DEFAULT_BOARD_SIZE);
  const minimumGroupSize = ref(3);
  const generationStrategy = ref<QueensAdminGenerationStrategy>('baseline');
  const selectedTool = ref<QueensAdminTool>('paint-color');
  const selectedColor = ref<ColorName>(COLOR_PALETTE[0]);
  const loading = ref(false);
  const lastActionResult = ref<QueensAdminOperationResult | null>(null);
  const actionHistory = ref<QueensAdminHistoryEntry[]>([]);
  const validation = ref<QueensAdminValidationSummary | null>(null);
  const backendError = ref<string | null>(null);
  const highlightedChangedCells = ref<string[]>([]);
  const selectedCellKey = ref<string | null>(null);
  const canCancelRequest = ref(false);
  const generationProgress = ref<QueensAdminGenerationProgress | null>(null);
  const batchStatus = ref<QueensAdminBatchStatus | null>(null);
  const trackedBatches = ref<QueensAdminBatchStatus[]>([]);
  const batchLoading = ref(false);
  const workshopBoardHistory = ref<QueensAdminBoardState[]>([]);
  let highlightTimer: ReturnType<typeof setTimeout> | null = null;
  let currentRequestController: AbortController | null = null;
  let currentGenerationJobId: string | null = null;
  let currentBatchId: string | null = null;

  function readTrackedBatchIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(TRACKED_BATCH_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((value): value is string => typeof value === 'string')
        .slice(0, MAX_TRACKED_BATCHES);
    } catch {
      return [];
    }
  }

  function writeTrackedBatchIds(batchIds: string[]): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      TRACKED_BATCH_STORAGE_KEY,
      JSON.stringify(batchIds.slice(0, MAX_TRACKED_BATCHES))
    );
  }

  function trackBatchId(batchId: string): void {
    const nextIds = [
      batchId,
      ...readTrackedBatchIds().filter((existingId) => existingId !== batchId),
    ];
    writeTrackedBatchIds(nextIds);
  }

  function untrackBatchId(batchId: string): void {
    writeTrackedBatchIds(readTrackedBatchIds().filter((existingId) => existingId !== batchId));
  }

  function upsertTrackedBatch(status: QueensAdminBatchStatus): void {
    trackedBatches.value = [
      status,
      ...trackedBatches.value.filter((batch) => batch.batchId !== status.batchId),
    ]
      .sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )
      .slice(0, MAX_TRACKED_BATCHES);
  }

  function removeTrackedBatch(batchId: string): void {
    trackedBatches.value = trackedBatches.value.filter((batch) => batch.batchId !== batchId);
    untrackBatchId(batchId);
    if (batchStatus.value?.batchId === batchId) {
      batchStatus.value = null;
    }
  }

  const boardSummary = computed(() => {
    if (!board.value) {
      return {
        size: boardSize.value,
        queenCount: 0,
        flaggedCount: 0,
        coloredCellCount: 0,
        distinctColorCount: 0,
      };
    }

    let queenCount = 0;
    let flaggedCount = 0;
    let coloredCellCount = 0;
    const colors = new Set<string>();

    for (const row of board.value.cells) {
      for (const cell of row) {
        if (cell.markType === 'QUEEN') queenCount += 1;
        if (cell.markType === 'FLAG') flaggedCount += 1;
        if (cell.groupColor) {
          coloredCellCount += 1;
          colors.add(cell.groupColor);
        }
      }
    }

    return {
      size: board.value.size,
      queenCount,
      flaggedCount,
      coloredCellCount,
      distinctColorCount: colors.size,
    };
  });

  const selectedCell = computed(() => {
    if (!board.value || !selectedCellKey.value) return null;
    const [rowValue, colValue] = selectedCellKey.value.split(':');
    const row = Number(rowValue);
    const col = Number(colValue);
    return board.value.cells[row]?.[col] ?? null;
  });

  const canUndoWorkshopBoard = computed(() => workshopBoardHistory.value.length > 0);

  function cloneAdminBoardState(boardState: QueensAdminBoardState): QueensAdminBoardState {
    return {
      size: boardState.size,
      cells: boardState.cells.map((row) => row.map((cell) => ({ ...cell }))),
      generationPhase: boardState.generationPhase,
      metadata: boardState.metadata ? { ...boardState.metadata } : undefined,
    };
  }

  function pushWorkshopBoardHistory(snapshot: QueensAdminBoardState | null): void {
    if (!snapshot) return;
    workshopBoardHistory.value = [
      cloneAdminBoardState(snapshot),
      ...workshopBoardHistory.value,
    ].slice(0, MAX_BOARD_HISTORY_ENTRIES);
  }

  function setSelectedTool(tool: QueensAdminTool): void {
    selectedTool.value = tool;
  }

  function setSelectedColor(color: ColorName): void {
    selectedColor.value = color;
  }

  function setSelectedCell(row: number, col: number): void {
    selectedCellKey.value = `${row}:${col}`;
  }

  function clearHighlights(): void {
    highlightedChangedCells.value = [];
    if (highlightTimer) {
      clearTimeout(highlightTimer);
      highlightTimer = null;
    }
  }

  function applyBoardSnapshot(nextBoard: QueensAdminBoardState | null): void {
    if (!nextBoard) return;
    board.value = nextBoard;
    boardSize.value = nextBoard.size;
    targetQueenCount.value = Number(nextBoard.metadata?.targetQueenCount ?? nextBoard.size);
    orthogonalMinDistance.value = Number(
      nextBoard.metadata?.orthogonalMinDistance ?? nextBoard.size
    );
    selectedCellKey.value = null;
    queensStore.hydrateFromAdminBoard(nextBoard, {
      showSolutionQueens: true,
      resetHistory: false,
    });
  }

  function applyResult(result: QueensAdminOperationResult): QueensAdminOperationResult {
    loading.value = false;
    lastActionResult.value = result;
    backendError.value = result.success ? null : result.error || 'Operation failed';

    const previousBoard = board.value;
    if (result.board) {
      if (previousBoard && previousBoard !== result.board) {
        pushWorkshopBoardHistory(previousBoard);
      }
      board.value = result.board;
      boardSize.value = result.board.size;
      targetQueenCount.value = Number(result.board.metadata?.targetQueenCount ?? result.board.size);
      orthogonalMinDistance.value = Number(
        result.board.metadata?.orthogonalMinDistance ?? result.board.size
      );

      const shouldResetHistory =
        !previousBoard ||
        previousBoard.size !== result.board.size ||
        result.action === 'create-board';

      if (shouldResetHistory) {
        queensStore.hydrateFromAdminBoard(result.board, {
          showSolutionQueens: true,
          resetHistory: true,
        });
      } else {
        queensStore.applyAdminBoardResult(result.board, {
          showSolutionQueens: true,
          saveHistory: true,
        });
      }
    }

    validation.value = result.validation;

    const changedCellKeys = result.changedCells.map((cell) => `${cell.row}:${cell.col}`);
    highlightedChangedCells.value = changedCellKeys;
    if (highlightTimer) {
      clearTimeout(highlightTimer);
    }
    if (changedCellKeys.length > 0) {
      highlightTimer = setTimeout(() => {
        highlightedChangedCells.value = [];
        highlightTimer = null;
      }, 2200);
    }

    actionHistory.value.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action: result.action,
      explanation: result.explanation,
      success: result.success,
      changedCells: result.changedCells,
      warnings: result.warnings,
      error: result.error,
      createdAt: new Date().toISOString(),
    });
    actionHistory.value = actionHistory.value.slice(0, MAX_HISTORY_ENTRIES);

    return result;
  }

  async function callBackendOperation(
    action: (signal: AbortSignal) => Promise<QueensAdminOperationResult>
  ): Promise<QueensAdminOperationResult> {
    if (currentRequestController) {
      currentRequestController.abort();
    }

    currentRequestController = new AbortController();
    loading.value = true;
    canCancelRequest.value = true;
    backendError.value = null;

    try {
      const result = await action(currentRequestController.signal);
      return applyResult(result);
    } catch (error) {
      const isAborted =
        error instanceof DOMException
          ? error.name === 'AbortError'
          : error instanceof Error
            ? error.name === 'AbortError'
            : false;
      const fallbackResult: QueensAdminOperationResult = {
        success: isAborted ? true : false,
        action: isAborted ? 'request-cancelled' : 'request-failed',
        explanation: isAborted
          ? 'The current admin backend request was cancelled from the workshop.'
          : 'The admin backend request failed.',
        board: board.value,
        changedCells: [],
        warnings: [],
        validation: validation.value,
        metadata: null,
        error: isAborted
          ? null
          : error instanceof Error
            ? error.message
            : 'Unknown request failure',
      };
      return applyResult(fallbackResult);
    } finally {
      currentRequestController = null;
      canCancelRequest.value = false;
    }
  }

  async function wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function pollBatch(batchId: string): Promise<void> {
    currentBatchId = batchId;
    batchLoading.value = true;
    canCancelRequest.value = true;

    try {
      while (currentBatchId === batchId) {
        const nextStatus = await queensAdminApi.getBatchGenerationStatus(batchId);
        batchStatus.value = nextStatus;
        upsertTrackedBatch(nextStatus);

        if (nextStatus.state === 'COMPLETED' || nextStatus.state === 'CANCELLED') {
          currentBatchId = null;
          return;
        }

        await wait(300);
      }
    } catch (error) {
      backendError.value =
        error instanceof Error ? error.message : 'Batch generation request failed';
      currentBatchId = null;
    } finally {
      batchLoading.value = false;
      if (!currentBatchId && !currentGenerationJobId) {
        canCancelRequest.value = false;
      }
    }
  }

  async function cancelCurrentOperation(): Promise<void> {
    if (currentBatchId) {
      try {
        batchStatus.value = await queensAdminApi.cancelBatchGeneration(currentBatchId);
        if (batchStatus.value) {
          upsertTrackedBatch(batchStatus.value);
        }
      } catch (error) {
        backendError.value =
          error instanceof Error ? error.message : 'Failed to cancel batch generation';
      }
      return;
    }

    if (currentGenerationJobId) {
      try {
        generationProgress.value = await queensAdminApi.cancelGenerationJob(currentGenerationJobId);
      } catch (error) {
        backendError.value =
          error instanceof Error ? error.message : 'Failed to cancel generation job';
      }
      return;
    }

    if (!currentRequestController) return;
    currentRequestController.abort();
  }

  async function createBoard(
    size: number = boardSize.value,
    options?: {
      queenCountMode?: QueensAdminQueenCountMode;
      targetQueenCount?: number;
      orthogonalMinDistance?: number;
    }
  ): Promise<void> {
    boardSize.value = size;
    queenCountMode.value = options?.queenCountMode ?? queenCountMode.value;
    targetQueenCount.value =
      queenCountMode.value === 'max'
        ? targetQueenCount.value
        : Math.max(1, Math.min(size * size, options?.targetQueenCount ?? targetQueenCount.value));
    orthogonalMinDistance.value = Math.max(
      1,
      options?.orthogonalMinDistance ?? orthogonalMinDistance.value
    );
    generationProgress.value = null;
    await callBackendOperation((signal) =>
      queensAdminApi.createEmptyBoard(
        size,
        {
          queenCountMode: queenCountMode.value,
          targetQueenCount: targetQueenCount.value,
          orthogonalMinDistance: orthogonalMinDistance.value,
        },
        signal
      )
    );
  }

  async function generateBoard(
    size: number = boardSize.value,
    options?: {
      seedTemplateOffsets?: Array<{ row: number; col: number }>;
      previewIntervalMs?: number;
      queenCountMode?: QueensAdminQueenCountMode;
      targetQueenCount?: number;
      orthogonalMinDistance?: number;
      blackoutFingerprintKey?: string | null;
    }
  ): Promise<void> {
    boardSize.value = size;
    queenCountMode.value = options?.queenCountMode ?? queenCountMode.value;
    targetQueenCount.value =
      queenCountMode.value === 'max'
        ? targetQueenCount.value
        : Math.max(1, Math.min(size * size, options?.targetQueenCount ?? targetQueenCount.value));
    orthogonalMinDistance.value = Math.max(
      1,
      options?.orthogonalMinDistance ?? orthogonalMinDistance.value
    );
    minimumGroupSize.value = Math.max(1, Math.min(minimumGroupSize.value, size));
    loading.value = true;
    canCancelRequest.value = true;
    backendError.value = null;
    generationProgress.value = null;

    try {
      let lastPreviewAppliedAt = 0;
      const jobId = await queensAdminApi.startGenerateValidBoardJob(size, {
        includeProgressUpdates: true,
        minimumGroupSize: minimumGroupSize.value,
        queenCountMode: queenCountMode.value,
        targetQueenCount: targetQueenCount.value,
        orthogonalMinDistance: orthogonalMinDistance.value,
        generationStrategy: generationStrategy.value,
        seedTemplateOffsets: options?.seedTemplateOffsets,
        blackoutFingerprintKey: options?.blackoutFingerprintKey ?? null,
      });
      currentGenerationJobId = jobId;

      while (currentGenerationJobId === jobId) {
        const progress = await queensAdminApi.getGenerationJobStatus(jobId);
        generationProgress.value = progress;

        const previewIntervalMs = Math.max(50, options?.previewIntervalMs ?? 1000);
        const canApplyPreview =
          progress.board &&
          (lastPreviewAppliedAt === 0 || Date.now() - lastPreviewAppliedAt >= previewIntervalMs);

        if (progress.state === 'RUNNING' && progress.board && canApplyPreview) {
          applyBoardSnapshot(progress.board);
          lastPreviewAppliedAt = Date.now();
        }

        if (progress.state === 'COMPLETED' && progress.result) {
          applyResult(progress.result);
          currentGenerationJobId = null;
          return;
        }

        if (progress.state === 'FAILED') {
          const fallbackResult: QueensAdminOperationResult = progress.result ?? {
            success: false,
            action: 'generate-valid-board',
            explanation: progress.message,
            board: board.value,
            changedCells: [],
            warnings: [],
            validation: validation.value,
            metadata: null,
            error: progress.message,
          };
          applyResult(fallbackResult);
          currentGenerationJobId = null;
          return;
        }

        if (progress.state === 'CANCELLED') {
          const cancelledResult: QueensAdminOperationResult = progress.result ?? {
            success: true,
            action: 'request-cancelled',
            explanation: 'The current generation job was cancelled from the workshop.',
            board: board.value,
            changedCells: [],
            warnings: [],
            validation: validation.value,
            metadata: null,
            error: null,
          };
          applyResult(cancelledResult);
          currentGenerationJobId = null;
          return;
        }

        await wait(300);
      }
    } catch (error) {
      const fallbackResult: QueensAdminOperationResult = {
        success: false,
        action: 'generate-valid-board',
        explanation: 'Failed to start or track the generation job.',
        board: board.value,
        changedCells: [],
        warnings: [],
        validation: validation.value,
        metadata: null,
        error: error instanceof Error ? error.message : 'Unknown generation failure',
      };
      applyResult(fallbackResult);
    } finally {
      currentGenerationJobId = null;
      loading.value = false;
      canCancelRequest.value = false;
    }
  }

  async function startBatchGeneration(options: {
    sizes: number[];
    orthogonalMinDistances: number[];
    strategies: QueensAdminGenerationStrategy[];
    runsPerCombination: number;
    runMode: QueensAdminBatchRunMode;
    queenCountMode: 'exact' | 'max';
    targetQueenCount?: number | null;
    orthogonalMinDistance?: number | null;
    minimumGroupSize: number;
    maxConcurrentJobs: number;
    saveSuccessfulPuzzles: boolean;
  }): Promise<void> {
    batchLoading.value = true;
    canCancelRequest.value = true;
    backendError.value = null;
    batchStatus.value = null;

    try {
      const batchId = await queensAdminApi.startBatchGeneration(options);
      trackBatchId(batchId);
      await pollBatch(batchId);
    } catch (error) {
      backendError.value =
        error instanceof Error ? error.message : 'Batch generation request failed';
    }
  }

  async function refreshTrackedBatches(): Promise<void> {
    const batchIds = readTrackedBatchIds();
    if (batchIds.length === 0) {
      trackedBatches.value = [];
      return;
    }

    const snapshots = await Promise.all(
      batchIds.map(async (batchId) => {
        try {
          return await queensAdminApi.getBatchGenerationStatus(batchId);
        } catch {
          return null;
        }
      })
    );

    const validSnapshots = snapshots.filter((snapshot): snapshot is QueensAdminBatchStatus =>
      Boolean(snapshot)
    );
    trackedBatches.value = validSnapshots.sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
    writeTrackedBatchIds(validSnapshots.map((snapshot) => snapshot.batchId));

    const activeBatch = validSnapshots.find(
      (snapshot) => snapshot.state === 'RUNNING' || snapshot.state === 'QUEUED'
    );
    if (activeBatch) {
      batchStatus.value = activeBatch;
      if (currentBatchId !== activeBatch.batchId) {
        void pollBatch(activeBatch.batchId);
      }
    } else if (!currentBatchId && !batchStatus.value && validSnapshots[0]) {
      batchStatus.value = validSnapshots[0];
    }
  }

  async function placeQueens(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation((signal) => queensAdminApi.placeQueens(board.value, signal));
  }

  async function assignInitialColors(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation((signal) => queensAdminApi.assignInitialColors(board.value, signal));
  }

  async function expandAllGroupsOnce(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation((signal) => queensAdminApi.expandAllGroupsOnce(board.value, signal));
  }

  async function expandSelectedGroup(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation((signal) =>
      queensAdminApi.expandSelectedGroup(board.value, selectedColor.value, signal)
    );
  }

  async function expandBlockedSquares(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation((signal) =>
      queensAdminApi.expandBlockedSquares(board.value, signal)
    );
  }

  async function clearBoard(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation((signal) => queensAdminApi.clearBoard(board.value, signal));
  }

  function deleteBoard(): void {
    workshopBoardHistory.value = [];
    board.value = null;
    validation.value = null;
    backendError.value = null;
    lastActionResult.value = null;
    generationProgress.value = null;
    selectedCellKey.value = null;
    clearHighlights();
    queensStore.initializeGrid();
    actionHistory.value.unshift({
      id: `${Date.now()}-delete-board`,
      action: 'delete-board',
      explanation: 'Removed the working board from the current admin session.',
      success: true,
      changedCells: [],
      warnings: [],
      error: null,
      createdAt: new Date().toISOString(),
    });
    actionHistory.value = actionHistory.value.slice(0, MAX_HISTORY_ENTRIES);
  }

  function undoWorkshopBoardChange(): void {
    const previousBoard = workshopBoardHistory.value.shift();
    if (!previousBoard) return;

    clearHighlights();
    applyBoardSnapshot(previousBoard);
    validation.value = null;
    backendError.value = null;
    lastActionResult.value = null;
  }

  function clearWorkshopBoardMarks(): void {
    if (!board.value) return;

    pushWorkshopBoardHistory(board.value);
    queensStore.clearAdminMarks();
    board.value = queensStore.exportAdminBoardState();
    validation.value = null;
    backendError.value = null;
    lastActionResult.value = null;
    clearHighlights();
  }

  async function validateCurrentBoard(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation((signal) => queensAdminApi.runAllSolverSteps(board.value, signal));
  }

  async function applyManualToolToCell(row: number, col: number): Promise<void> {
    setSelectedCell(row, col);

    if (!board.value) {
      return;
    }

    if (selectedTool.value === 'inspect-cell') {
      clearHighlights();
      return;
    }

    switch (selectedTool.value) {
      case 'paint-color':
        await callBackendOperation((signal) =>
          queensAdminApi.setCellColor(board.value, row, col, selectedColor.value, signal)
        );
        break;
      case 'erase-color':
        await callBackendOperation((signal) =>
          queensAdminApi.clearCellColor(board.value, row, col, signal)
        );
        break;
      case 'place-flag':
        await callBackendOperation((signal) =>
          queensAdminApi.placeFlag(board.value, row, col, signal)
        );
        break;
      case 'remove-flag':
        await callBackendOperation((signal) =>
          queensAdminApi.removeFlag(board.value, row, col, signal)
        );
        break;
      case 'place-queen':
        await callBackendOperation((signal) =>
          queensAdminApi.placeQueen(board.value, row, col, signal)
        );
        break;
      case 'remove-queen':
        await callBackendOperation((signal) =>
          queensAdminApi.removeQueen(board.value, row, col, signal)
        );
        break;
    }
  }

  function resetHistory(): void {
    actionHistory.value = [];
  }

  return {
    board,
    boardSize,
    queenCountMode,
    targetQueenCount,
    orthogonalMinDistance,
    minimumGroupSize,
    generationStrategy,
    selectedTool,
    selectedColor,
    loading,
    lastActionResult,
    actionHistory,
    validation,
    backendError,
    canCancelRequest,
    generationProgress,
    batchStatus,
    trackedBatches,
    batchLoading,
    canUndoWorkshopBoard,
    highlightedChangedCells,
    selectedCell,
    boardSummary,
    setSelectedTool,
    setSelectedColor,
    setSelectedCell,
    createBoard,
    generateBoard,
    startBatchGeneration,
    refreshTrackedBatches,
    removeTrackedBatch,
    placeQueens,
    assignInitialColors,
    expandAllGroupsOnce,
    expandSelectedGroup,
    expandBlockedSquares,
    clearBoard,
    clearWorkshopBoardMarks,
    deleteBoard,
    undoWorkshopBoardChange,
    validateCurrentBoard,
    callBackendOperation,
    cancelCurrentOperation,
    applyManualToolToCell,
    resetHistory,
  };
});
