export type QueensAdminTool =
  | 'paint-color'
  | 'erase-color'
  | 'place-flag'
  | 'remove-flag'
  | 'place-queen'
  | 'remove-queen'
  | 'inspect-cell';

export type QueensAdminMarkType = 'NONE' | 'FLAG' | 'QUEEN' | 'INVALID';
export type QueensAdminGenerationStrategy = 'baseline' | 'marker-guided' | 'template-seeded';
export type QueensAdminQueenCountMode = 'exact' | 'max';
export type QueensAdminBatchRunMode = 'cartesian' | 'lowest-count';
export type QueensAdminSizeOption = number;
export type QueensAdminDifficulty =
  | 'tutorial'
  | 'extra-easy'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'extra-hard'
  | 'unsolvable';
export type QueensAdminPuzzleDifficulty = QueensAdminDifficulty;

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
    constrainedWindowHits: number;
    constrainedWindowFlags: number;
    deterministicSolved: boolean | null;
    deterministicStepsTaken: number;
    deterministicQueensPlaced: number;
    deterministicUnresolvedSquares: number;
    deterministicHardestTier: string | null;
    deterministicLastRule: string | null;
  };
  elapsedMs: number;
  generationPhase: string | null;
  board: QueensAdminBoardState | null;
  history: Array<{
    attempt: number;
    stage: string;
    message: string;
    coloredCellCount: number;
    totalCellCount: number;
    generationPhase: string | null;
    createdAt: string;
  }>;
  updatedAt: string;
  result: QueensAdminOperationResult | null;
}

export interface QueensAdminBatchRun {
  runId: string;
  size: number;
  strategy: QueensAdminGenerationStrategy;
  queenCountMode: QueensAdminQueenCountMode;
  targetQueenCount: number;
  orthogonalMinDistance: number;
  minimumGroupSize: number;
  state: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  coloredCellCount: number;
  totalCellCount: number;
  durationMs: number | null;
  success: boolean | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  persistenceState: 'SAVED' | 'DUPLICATE' | 'SKIPPED' | 'ERROR' | 'UNSOLVABLE' | null;
  persistenceMessage: string | null;
  savedPuzzleId: string | null;
  encodedPuzzleLayout: string | null;
  completedQueenCount: number | null;
  difficulty: QueensAdminPuzzleDifficulty | null;
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

export interface QueensAdminMaxQueenResolution {
  size: number;
  orthogonalMinDistance: number;
  maxQueenCount: number;
  elapsedMs: number;
}

export interface QueensAdminPuzzleCatalogStats {
  totalPuzzles: number;
  countsBySize: Record<string, number>;
  countsBySizeAndDistance: Record<string, number>;
  groups: QueensAdminPuzzleCatalogGroup[];
}

export interface QueensAdminPuzzleCatalogGroup {
  size: number;
  orthogonalMinDistance: number;
  targetQueenCount: number;
  minimumGroupSize: number;
  difficulty?: QueensAdminPuzzleDifficulty;
  count: number;
}

export interface QueensAdminCatalogPuzzleSelection {
  puzzleId: string;
  size: number;
  orthogonalMinDistance: number;
  targetQueenCount: number;
  minimumGroupSize: number;
  difficulty?: QueensAdminPuzzleDifficulty;
  board: QueensAdminBoardState;
}

export interface QueensAdminBuiltInSolverStep {
  id: string;
  label: string;
  description: string;
  difficulty: QueensAdminDifficulty;
  enabled: boolean;
  sortOrder: number;
}

export interface QueensAdminSolverPattern {
  id: string;
  name: string;
  size: number;
  cells: Array<{ row: number; col: number; activeSquare?: boolean }>;
  outputFlags: Array<{ row: number; col: number }>;
  difficulty: QueensAdminDifficulty;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueensAdminSolverConfig {
  builtInSteps: QueensAdminBuiltInSolverStep[];
  patterns: QueensAdminSolverPattern[];
}

export type QueensAdminStitchingCellState = 'active' | 'queen' | 'blackout' | 'join-fill';

export interface QueensAdminStitchingCell {
  state: QueensAdminStitchingCellState;
  groupId?: string | null;
  groupSlot?: number | null;
}

export interface QueensAdminStitchingBoard {
  width: number;
  height: number;
  cells: QueensAdminStitchingCell[][];
}

export interface QueensAdminStitchingQuadrant {
  pieceKind: string;
  queenCount: number;
  targetQueenCount: number;
  blackoutCellCount: number;
  leftBlackoutSignature: number[];
  topBlackoutSignature: number[];
  board: QueensAdminStitchingBoard;
}

export interface QueensAdminStitchingPreview {
  size: number;
  orthogonalMinDistance: number;
  minimumGroupSize: number;
  topLeft: QueensAdminStitchingQuadrant;
  topRight: QueensAdminStitchingQuadrant;
  bottomLeft: QueensAdminStitchingQuadrant;
  bottomRight: QueensAdminStitchingQuadrant;
  stitchedBoard: QueensAdminStitchingBoard;
}
