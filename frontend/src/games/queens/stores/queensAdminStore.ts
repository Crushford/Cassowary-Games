import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { ColorName } from '../types/types';
import { COLOR_PALETTE } from '../utils/colorPalette';
import { queensAdminApi } from '../admin/api';
import type {
  QueensAdminBoardState,
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
  let highlightTimer: ReturnType<typeof setTimeout> | null = null;

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
    action: () => Promise<QueensAdminOperationResult>
  ): Promise<QueensAdminOperationResult> {
    loading.value = true;
    backendError.value = null;

    try {
      const result = await action();
      return applyResult(result);
    } catch (error) {
      const fallbackResult: QueensAdminOperationResult = {
        success: false,
        action: 'request-failed',
        explanation: 'The admin backend request failed.',
        board: board.value,
        changedCells: [],
        warnings: [],
        validation: validation.value,
        metadata: null,
        error: error instanceof Error ? error.message : 'Unknown request failure',
      };
      return applyResult(fallbackResult);
    }
  }

  async function createBoard(size: number = boardSize.value): Promise<void> {
    boardSize.value = size;
    await callBackendOperation(() => queensAdminApi.createEmptyBoard(size));
  }

  async function generateBoard(size: number = boardSize.value): Promise<void> {
    boardSize.value = size;
    await callBackendOperation(() => queensAdminApi.generateValidBoard(size));
  }

  async function placeQueens(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation(() => queensAdminApi.placeQueens(board.value));
  }

  async function assignInitialColors(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation(() => queensAdminApi.assignInitialColors(board.value));
  }

  async function expandAllGroupsOnce(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation(() => queensAdminApi.expandAllGroupsOnce(board.value));
  }

  async function expandSelectedGroup(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation(() =>
      queensAdminApi.expandSelectedGroup(board.value, selectedColor.value)
    );
  }

  async function expandBlockedSquares(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation(() => queensAdminApi.expandBlockedSquares(board.value));
  }

  async function clearBoard(): Promise<void> {
    if (!board.value) return;
    await callBackendOperation(() => queensAdminApi.clearBoard(board.value));
  }

  function deleteBoard(): void {
    board.value = null;
    validation.value = null;
    backendError.value = null;
    lastActionResult.value = null;
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
    await callBackendOperation(() => queensAdminApi.validateBoard(board.value));
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
        await callBackendOperation(() =>
          queensAdminApi.setCellColor(board.value, row, col, selectedColor.value)
        );
        break;
      case 'erase-color':
        await callBackendOperation(() => queensAdminApi.clearCellColor(board.value, row, col));
        break;
      case 'place-flag':
        await callBackendOperation(() => queensAdminApi.placeFlag(board.value, row, col));
        break;
      case 'remove-flag':
        await callBackendOperation(() => queensAdminApi.removeFlag(board.value, row, col));
        break;
      case 'place-queen':
        await callBackendOperation(() => queensAdminApi.placeQueen(board.value, row, col));
        break;
      case 'remove-queen':
        await callBackendOperation(() => queensAdminApi.removeQueen(board.value, row, col));
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
    applyManualToolToCell,
    resetHistory,
  };
});
