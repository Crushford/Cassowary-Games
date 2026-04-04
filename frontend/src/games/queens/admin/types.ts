export type QueensAdminTool =
  | 'paint-color'
  | 'erase-color'
  | 'place-flag'
  | 'remove-flag'
  | 'place-queen'
  | 'remove-queen'
  | 'inspect-cell';

export type QueensAdminMarkType = 'NONE' | 'FLAG' | 'QUEEN' | 'INVALID';
export type QueensAdminGenerationStrategy = 'baseline' | 'marker-guided';

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
  strategy: QueensAdminGenerationStrategy;
  metrics: {
    solverChecks: number;
    rollbacks: number;
    markerSquares: number;
    markerBlocks: number;
    markerGuidedCandidates: number;
    markerGuidedPlacements: number;
    fallbackPlacements: number;
    successfulPlacements: number;
  };
  elapsedMs: number;
  generationPhase: string | null;
  updatedAt: string;
  result: QueensAdminOperationResult | null;
}

export interface QueensAdminBatchRun {
  runId: string;
  size: number;
  strategy: QueensAdminGenerationStrategy;
  minimumGroupSize: number;
  state: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  durationMs: number | null;
  success: boolean | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  persistenceState: 'SAVED' | 'DUPLICATE' | 'SKIPPED' | 'ERROR' | null;
  persistenceMessage: string | null;
  savedPuzzleId: string | null;
}

export interface QueensAdminBatchStatus {
  batchId: string;
  state: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  totalJobs: number;
  queuedJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  savedUniquePuzzles: number;
  duplicatePuzzles: number;
  persistenceErrors: number;
  maxConcurrentJobs: number;
  saveSuccessfulPuzzles: boolean;
  note: string | null;
  runs: QueensAdminBatchRun[];
  updatedAt: string;
}

export interface QueensAdminSystemLoad {
  processCpuPercent: number | null;
  systemCpuPercent: number | null;
  systemLoadAverage: number | null;
  availableProcessors: number;
  heapUsedMb: number;
  heapMaxMb: number;
  singleJobsRunning: number;
  singleJobsQueued: number;
  batchRunsActive: number;
  batchRunsQueued: number;
  runningBatchCount: number;
  sampledAt: string;
}

export interface QueensAdminPuzzleCatalogStats {
  totalPuzzles: number;
  countsBySize: Record<string, number>;
}
