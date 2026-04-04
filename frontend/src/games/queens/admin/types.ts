export type QueensAdminTool =
  | 'paint-color'
  | 'erase-color'
  | 'place-flag'
  | 'remove-flag'
  | 'place-queen'
  | 'remove-queen'
  | 'inspect-cell';

export type QueensAdminMarkType = 'NONE' | 'FLAG' | 'QUEEN' | 'INVALID';

export interface QueensAdminCell {
  row: number;
  col: number;
  groupColor: string | null;
  isSolutionQueen: boolean;
  markType: QueensAdminMarkType;
}

export interface QueensAdminBoardState {
  size: number;
  cells: QueensAdminCell[][];
  generationPhase: string | null;
  metadata?: Record<string, string>;
}

export interface QueensAdminChangedCell {
  row: number;
  col: number;
  reason?: string;
}

export interface QueensAdminValidationSummary {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  queenCount: number;
  flaggedCount: number;
  coloredCellCount: number;
  distinctColorCount: number;
}

export interface QueensAdminOperationResult {
  success: boolean;
  action: string;
  explanation: string;
  board: QueensAdminBoardState | null;
  changedCells: QueensAdminChangedCell[];
  warnings: string[];
  validation: QueensAdminValidationSummary | null;
  metadata: Record<string, unknown> | null;
  error: string | null;
}

export interface QueensAdminHistoryEntry {
  id: string;
  action: string;
  explanation: string;
  success: boolean;
  changedCells: QueensAdminChangedCell[];
  warnings: string[];
  error: string | null;
  createdAt: string;
}

export interface QueensAdminGenerationProgress {
  jobId: string;
  state: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  attempt: number;
  stage: string;
  message: string;
  coloredCellCount: number;
  totalCellCount: number;
  generationPhase: string | null;
  updatedAt: string;
  result: QueensAdminOperationResult | null;
}
