import type {
  QueensAdminBoardState,
  QueensAdminChangedCell,
  QueensAdminGenerationProgress,
  QueensAdminOperationResult,
  QueensAdminValidationSummary,
} from './types';

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

interface GenerationJobStartedDto {
  jobId: string;
}

interface GenerationJobStatusDto {
  jobId: string;
  state: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  attempt: number;
  stage: string;
  message: string;
  coloredCellCount: number;
  totalCellCount: number;
  generationPhase: string | null;
  result: OperationResultDto | null;
  updatedAt: string;
}

function toLocalBoardState(boardState: BoardStateDto | null): QueensAdminBoardState | null {
  if (!boardState) return null;

  return {
    size: boardState.size,
    cells: boardState.cells.map((row) =>
      row.map((cell) => ({
        row: cell.row,
        col: cell.col,
        groupColor: cell.groupColor,
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

function toGenerationProgress(data: GenerationJobStatusDto): QueensAdminGenerationProgress {
  return {
    jobId: data.jobId,
    state: data.state,
    attempt: data.attempt,
    stage: data.stage,
    message: data.message,
    coloredCellCount: data.coloredCellCount,
    totalCellCount: data.totalCellCount,
    generationPhase: data.generationPhase,
    updatedAt: data.updatedAt,
    result: data.result ? toOperationResult(data.result) : null,
  };
}

async function postOperation(
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<QueensAdminOperationResult> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  const data = (await response.json()) as OperationResultDto;
  return toOperationResult(data);
}

export const queensAdminApi = {
  createEmptyBoard(size: number, signal?: AbortSignal): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/board/create',
      {
        size,
      },
      signal
    );
  },

  generateValidBoard(
    size: number,
    minimumGroupSize: number,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/generation/generate-valid-board',
      {
        size,
        minimumGroupSize,
      },
      signal
    );
  },

  async startGenerateValidBoardJob(
    size: number,
    options?: { includeProgressUpdates?: boolean; minimumGroupSize?: number }
  ): Promise<string> {
    const response = await fetch('/api/queens/admin/generation/generate-valid-board/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        size,
        minimumGroupSize: options?.minimumGroupSize ?? 3,
        includeProgressUpdates: options?.includeProgressUpdates ?? false,
      }),
    });
    const data = (await response.json()) as GenerationJobStartedDto;
    return data.jobId;
  },

  async getGenerationJobStatus(jobId: string): Promise<QueensAdminGenerationProgress> {
    const response = await fetch(`/api/queens/admin/generation/jobs/${jobId}`);
    const data = (await response.json()) as GenerationJobStatusDto;
    return toGenerationProgress(data);
  },

  async cancelGenerationJob(jobId: string): Promise<QueensAdminGenerationProgress> {
    const response = await fetch(`/api/queens/admin/generation/jobs/${jobId}/cancel`, {
      method: 'POST',
    });
    const data = (await response.json()) as GenerationJobStatusDto;
    return toGenerationProgress(data);
  },

  placeQueens(
    boardState: QueensAdminBoardState | null,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/generation/place-queens', { boardState }, signal);
  },

  assignInitialColors(
    boardState: QueensAdminBoardState | null,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/generation/assign-initial-colors',
      { boardState },
      signal
    );
  },

  expandAllGroupsOnce(
    boardState: QueensAdminBoardState | null,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/generation/expand-all-groups-once',
      { boardState },
      signal
    );
  },

  expandSelectedGroup(
    boardState: QueensAdminBoardState | null,
    targetColor: string,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/generation/expand-selected-group',
      {
        boardState,
        targetColor,
      },
      signal
    );
  },

  expandBlockedSquares(
    boardState: QueensAdminBoardState | null,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/generation/expand-blocked-squares',
      { boardState },
      signal
    );
  },

  clearBoard(
    boardState: QueensAdminBoardState | null,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/clear', { boardState }, signal);
  },

  validateBoard(
    boardState: QueensAdminBoardState | null,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/board/validate', { boardState }, signal);
  },

  setCellColor(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number,
    color: string,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/board/set-color',
      {
        boardState,
        row,
        col,
        color,
      },
      signal
    );
  },

  clearCellColor(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/board/clear-color',
      {
        boardState,
        row,
        col,
      },
      signal
    );
  },

  placeFlag(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/board/place-flag',
      {
        boardState,
        row,
        col,
      },
      signal
    );
  },

  removeFlag(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/board/remove-flag',
      {
        boardState,
        row,
        col,
      },
      signal
    );
  },

  placeQueen(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/board/place-queen',
      {
        boardState,
        row,
        col,
      },
      signal
    );
  },

  removeQueen(
    boardState: QueensAdminBoardState | null,
    row: number,
    col: number,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/board/remove-queen',
      {
        boardState,
        row,
        col,
      },
      signal
    );
  },
};
