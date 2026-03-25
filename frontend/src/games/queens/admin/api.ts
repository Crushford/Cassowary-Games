import type {
  QueensAdminBoardState,
  QueensAdminChangedCell,
  QueensAdminOperationResult,
  QueensAdminValidationSummary,
} from './types';
import type { ColorName } from '../types/types';

interface CellDto {
  row: number;
  col: number;
  groupColor: string | null;
  isSolutionQueen: boolean;
  markType: 'NONE' | 'FLAG' | 'QUEEN' | 'INVALID';
}

interface BoardStateDto {
  size: number;
  cells: CellDto[][];
  generationPhase: string | null;
  metadata?: Record<string, string>;
}

interface ChangedCellDto {
  row: number;
  col: number;
  changeType: string;
  explanation?: string | null;
}

interface ValidationSummaryDto {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  queenCount: number;
  markedFlagCount: number;
  coloredCellCount: number;
  distinctColorCount: number;
}

interface OperationResultDto {
  success: boolean;
  actionType: string;
  explanation: string;
  boardState: BoardStateDto | null;
  changedCells: ChangedCellDto[];
  warnings: string[];
  errors: string[];
  validation: ValidationSummaryDto | null;
}

function toLocalBoardState(boardState: BoardStateDto | null): QueensAdminBoardState | null {
  if (!boardState) return null;

  return {
    size: boardState.size,
    cells: boardState.cells.map((row) =>
      row.map((cell) => ({
        row: cell.row,
        col: cell.col,
        groupColor: cell.groupColor as ColorName | null,
        isSolutionQueen: cell.isSolutionQueen,
        markType: cell.markType,
      }))
    ),
    generationPhase: boardState.generationPhase,
    metadata: boardState.metadata,
  };
}

function toLocalChangedCells(changedCells: ChangedCellDto[]): QueensAdminChangedCell[] {
  return changedCells.map((cell) => ({
    row: cell.row,
    col: cell.col,
    reason: cell.explanation || cell.changeType,
  }));
}

function toLocalValidation(
  validation: ValidationSummaryDto | null
): QueensAdminValidationSummary | null {
  if (!validation) return null;

  return {
    isValid: validation.isValid,
    warnings: validation.warnings,
    errors: validation.errors,
    queenCount: validation.queenCount,
    flaggedCount: validation.markedFlagCount,
    coloredCellCount: validation.coloredCellCount,
    distinctColorCount: validation.distinctColorCount,
  };
}

function toOperationResult(data: OperationResultDto): QueensAdminOperationResult {
  return {
    success: data.success,
    action: data.actionType,
    explanation: data.explanation,
    board: toLocalBoardState(data.boardState),
    changedCells: toLocalChangedCells(data.changedCells),
    warnings: data.warnings,
    validation: toLocalValidation(data.validation),
    metadata: null,
    error: data.errors.length > 0 ? data.errors.join(' ') : null,
  };
}

async function postOperation(
  path: string,
  body: Record<string, unknown>
): Promise<QueensAdminOperationResult> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as OperationResultDto;
  return toOperationResult(data);
}

export const queensAdminApi = {
  createEmptyBoard(size: number): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/create', {
      size,
    });
  },

  generateValidBoard(size: number): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/generation/generate-valid-board', {
      size,
    });
  },

  placeQueens(boardState: QueensAdminBoardState | null): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/generation/place-queens', { boardState });
  },

  assignInitialColors(
    boardState: QueensAdminBoardState | null
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/generation/assign-initial-colors', { boardState });
  },

  expandAllGroupsOnce(
    boardState: QueensAdminBoardState | null
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/generation/expand-all-groups-once', { boardState });
  },

  expandSelectedGroup(
    boardState: QueensAdminBoardState | null,
    targetColor: string
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/generation/expand-selected-group', {
      boardState,
      targetColor,
    });
  },

  expandBlockedSquares(
    boardState: QueensAdminBoardState | null
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/generation/expand-blocked-squares', { boardState });
  },

  clearBoard(boardState: QueensAdminBoardState | null): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/clear', { boardState });
  },

  validateBoard(boardState: QueensAdminBoardState | null): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/validate', { boardState });
  },

  setCellColor(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number,
    color: string
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/set-color', {
      boardState,
      row,
      col,
      color,
    });
  },

  clearCellColor(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/clear-color', {
      boardState,
      row,
      col,
    });
  },

  placeFlag(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/place-flag', {
      boardState,
      row,
      col,
    });
  },

  removeFlag(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/remove-flag', {
      boardState,
      row,
      col,
    });
  },

  placeQueen(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/place-queen', {
      boardState,
      row,
      col,
    });
  },

  removeQueen(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/remove-queen', {
      boardState,
      row,
      col,
    });
  },
};
