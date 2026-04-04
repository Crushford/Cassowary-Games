import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { ColorName } from '../types/types';
import { COLOR_PALETTE } from '../utils/colorPalette';
import { queensAdminApi } from '../admin/api';
import type {
  QueensAdminBoardState,
  QueensAdminGenerationProgress,
  QueensAdminHistoryEntry,
  QueensAdminOperationResult,
  QueensAdminTool,
  QueensAdminValidationSummary,
} from '../admin/types';

const DEFAULT_BOARD_SIZE = 6;
const MAX_HISTORY_ENTRIES = 30;

export const useQueensAdminStore = defineStore('queensAdmin', () => {
  const board = ref<QueensAdminBoardState | null>(null);
  const boardSize = ref(DEFAULT_BOARD_SIZE);
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
  let highlightTimer: ReturnType<typeof setTimeout> | null = null;
  let currentRequestController: AbortController | null = null;
  let currentGenerationJobId: string | null = null;

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

  function applyResult(result: QueensAdminOperationResult): QueensAdminOperationResult {
    loading.value = false;
    lastActionResult.value = result;
    backendError.value = result.success ? null : result.error || 'Operation failed';

    if (result.board) {
      board.value = result.board;
      boardSize.value = result.board.size;
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

  async function cancelCurrentOperation(): Promise<void> {
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

  async function createBoard(size: number = boardSize.value): Promise<void> {
    boardSize.value = size;
    generationProgress.value = null;
    await callBackendOperation((signal) => queensAdminApi.createEmptyBoard(size, signal));
  }

  async function generateBoard(size: number = boardSize.value): Promise<void> {
    boardSize.value = size;
    loading.value = true;
    canCancelRequest.value = true;
    backendError.value = null;
    generationProgress.value = null;

    try {
      const jobId = await queensAdminApi.startGenerateValidBoardJob(size, {
        includeProgressUpdates: true,
      });
      currentGenerationJobId = jobId;

      while (currentGenerationJobId === jobId) {
        const progress = await queensAdminApi.getGenerationJobStatus(jobId);
        generationProgress.value = progress;

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
    board.value = null;
    validation.value = null;
    backendError.value = null;
    lastActionResult.value = null;
    generationProgress.value = null;
    selectedCellKey.value = null;
    clearHighlights();
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

  async function validateCurrentBoard(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation((signal) => queensAdminApi.validateBoard(board.value, signal));
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
    selectedTool,
    selectedColor,
    loading,
    lastActionResult,
    actionHistory,
    validation,
    backendError,
    canCancelRequest,
    generationProgress,
    highlightedChangedCells,
    selectedCell,
    boardSummary,
    setSelectedTool,
    setSelectedColor,
    setSelectedCell,
    createBoard,
    generateBoard,
    placeQueens,
    assignInitialColors,
    expandAllGroupsOnce,
    expandSelectedGroup,
    expandBlockedSquares,
    clearBoard,
    deleteBoard,
    validateCurrentBoard,
    callBackendOperation,
    cancelCurrentOperation,
    applyManualToolToCell,
    resetHistory,
  };
});
