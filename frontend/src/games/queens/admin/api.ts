import type {
  QueensAdminBatchRunMode,
  QueensAdminBatchStatus,
  QueensAdminBoardState,
  QueensAdminBuiltInSolverStep,
  QueensAdminCatalogPuzzleSelection,
  QueensAdminChangedCell,
  QueensAdminDifficulty,
  QueensAdminPuzzleDifficulty,
  QueensAdminGenerationProgress,
  QueensAdminMaxQueenResolution,
  QueensAdminPuzzleCatalogGroup,
  QueensAdminQueenCountMode,
  QueensAdminOperationResult,
  QueensAdminPuzzleCatalogStats,
  QueensAdminGenerationStrategy,
  QueensAdminSolverConfig,
  QueensAdminStitchingBoard,
  QueensAdminStitchingBatchStatus,
  QueensAdminStitchingCatalogStats,
  QueensAdminStitchingDiscoveryStatus,
  QueensAdminStitchingFingerprintSpace,
  QueensAdminStitchingCell,
  QueensAdminStitchingPreview,
  QueensAdminStitchingQuadrant,
  QueensAdminSolverPattern,
  QueensAdminSystemLoad,
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

interface TemplateOffsetDto {
  row: number;
  col: number;
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

interface BatchGenerationStartedDto {
  batchId: string;
}

interface GenerationJobStatusDto {
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
  boardState: BoardStateDto | null;
  result: OperationResultDto | null;
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
}

interface BatchGenerationRunDto {
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

interface BatchGenerationStatusDto {
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
  runs: BatchGenerationRunDto[];
  updatedAt: string;
}

interface SystemLoadDto {
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

interface ResolveMaxQueensResultDto {
  size: number;
  orthogonalMinDistance: number;
  maxQueenCount: number;
  elapsedMs: number;
}

interface PuzzleCatalogStatsDto {
  totalPuzzles: number;
  countsBySize: Record<string, number>;
  countsBySizeAndDistance: Record<string, number>;
  groups: PuzzleCatalogGroupDto[];
}

interface PuzzleCatalogGroupDto {
  size: number;
  orthogonalMinDistance: number;
  targetQueenCount: number;
  minimumGroupSize: number;
  difficulty?: QueensAdminPuzzleDifficulty;
  count: number;
}

interface DeletePuzzleCatalogGroupResultDto {
  deletedCount: number;
}

interface CatalogPuzzleSelectionDto {
  puzzleId: string;
  size: number;
  orthogonalMinDistance: number;
  targetQueenCount: number;
  minimumGroupSize: number;
  difficulty?: QueensAdminPuzzleDifficulty;
  boardState: BoardStateDto;
}

interface SolverPatternDto {
  id: string;
  name: string;
  size: number;
  cells: Array<{ row: number; col: number; activeSquare?: boolean }>;
  outputFlags: Array<{ row: number; col: number }>;
  difficultyTier: QueensAdminDifficulty;
  enabled: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface SolverPatternExecutionDto {
  id: string;
  size: number;
  cells: Array<{ row: number; col: number; activeSquare?: boolean }>;
  outputFlags: Array<{ row: number; col: number }>;
}

interface BuiltInSolverStepDto {
  id: string;
  label: string;
  description: string;
  difficultyTier: QueensAdminDifficulty;
  enabled: boolean;
  sortOrder: number;
}

interface SolverConfigDto {
  builtInSteps: BuiltInSolverStepDto[];
  patterns: SolverPatternDto[];
}

interface StitchingPreviewCellDto {
  state: QueensAdminStitchingCell['state'];
  groupId?: string | null;
  groupSlot?: number | null;
}

interface StitchingPreviewBoardDto {
  width: number;
  height: number;
  cells: StitchingPreviewCellDto[][];
}

interface StitchingPreviewQuadrantDto {
  pieceKind: string;
  queenCount: number;
  targetQueenCount: number;
  blackoutCellCount: number;
  leftBlackoutSignature: number[];
  topBlackoutSignature: number[];
  board: StitchingPreviewBoardDto;
}

interface StitchingPreviewDto {
  size: number;
  orthogonalMinDistance: number;
  minimumGroupSize: number;
  topLeft: StitchingPreviewQuadrantDto;
  topRight: StitchingPreviewQuadrantDto;
  bottomLeft: StitchingPreviewQuadrantDto;
  bottomRight: StitchingPreviewQuadrantDto;
  stitchedBoard: StitchingPreviewBoardDto;
}

interface StitchingBatchRunRequestDto {
  pieceKind: string;
  leftBlackoutSignature: number[];
  topBlackoutSignature: number[];
  targetQueenCount: number;
}

interface StitchingBatchRequestDto {
  size: number;
  orthogonalMinDistance: number;
  minimumGroupSize: number;
  runsPerFingerprint: number;
  maxConcurrentJobs: number;
  preset?: string | null;
  runs: StitchingBatchRunRequestDto[];
}

interface StitchingBatchStartedDto {
  batchId: string;
}

interface StitchingBatchRunDto {
  runId: string;
  pieceKind: string;
  leftBlackoutSignature: number[];
  topBlackoutSignature: number[];
  leftBlackoutFingerprint: string;
  topBlackoutFingerprint: string;
  fingerprintKey: string;
  pieceCategory: 'STANDARD' | 'LEFT_ONLY' | 'TOP_ONLY' | 'BOTH';
  targetQueenCount: number;
  state: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  queenCount: number | null;
  canonicalSignature: string | null;
  savedPuzzleId: string | null;
  persistenceState: 'SAVED' | 'DUPLICATE' | null;
  persistenceMessage: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

interface StitchingBatchStatusDto {
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
  note: string | null;
  runs: StitchingBatchRunDto[];
  updatedAt: string;
}

interface StitchingCatalogBucketStatsDto {
  boardSize: number;
  orthogonalMinDistance: number;
  targetQueenCount: number;
  pieceCategory: 'STANDARD' | 'LEFT_ONLY' | 'TOP_ONLY' | 'BOTH';
  leftBlackoutFingerprint: string;
  topBlackoutFingerprint: string;
  fingerprintKey: string;
  puzzleCount: number;
  countsByPieceKind: Record<string, number>;
}

interface StitchingCatalogStatsDto {
  totalPuzzles: number;
  bucketCount: number;
  buckets: StitchingCatalogBucketStatsDto[];
}

interface StitchingCatalogExportDto {
  outputPath: string;
  bucketCount: number;
  puzzleCount: number;
}

interface StitchingFingerprintSpaceDto {
  leftOnlyFingerprintCount: number;
  topOnlyFingerprintCount: number;
  bothFingerprintCount: number;
  totalFingerprintCount: number;
}

interface StitchingDiscoveryBucketDto {
  bucketKey: string;
  pieceCategory: string;
  pieceKind: string;
  fingerprintKey: string;
  leftBlackoutSignature: number[];
  topBlackoutSignature: number[];
  targetQueenCount: number;
  state: 'INFERRED' | 'QUEUED' | 'GENERATED' | 'SKIPPED' | 'FAILED';
  provenance: string[];
  message: string | null;
  puzzleId: string | null;
  canonicalSignature: string | null;
}

interface StitchingDiscoveryStatusDto {
  runId: string;
  state: 'IDLE' | 'RUNNING' | 'STOPPING' | 'COMPLETED' | 'INTERRUPTED' | 'FAILED';
  generationLimit: number;
  skipSatisfiedBuckets: boolean;
  maxConcurrentJobs: number;
  activeJobs: number;
  generatedCount: number;
  skippedCount: number;
  inferredCount: number;
  validatedCount: number;
  failedCount: number;
  queuedCount: number;
  activeBucket: StitchingDiscoveryBucketDto | null;
  generatedBuckets: StitchingDiscoveryBucketDto[];
  skippedBuckets: StitchingDiscoveryBucketDto[];
  failedBuckets: StitchingDiscoveryBucketDto[];
  queuedBuckets: StitchingDiscoveryBucketDto[];
  inferredBuckets: StitchingDiscoveryBucketDto[];
  note: string | null;
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

function toStitchingBoard(data: StitchingPreviewBoardDto): QueensAdminStitchingBoard {
  return {
    width: data.width,
    height: data.height,
    cells: data.cells.map((row) =>
      row.map((cell) => ({
        state: cell.state,
        groupId: cell.groupId ?? null,
        groupSlot: cell.groupSlot ?? null,
      }))
    ),
  };
}

function toStitchingQuadrant(data: StitchingPreviewQuadrantDto): QueensAdminStitchingQuadrant {
  return {
    pieceKind: data.pieceKind,
    queenCount: data.queenCount,
    targetQueenCount: data.targetQueenCount,
    blackoutCellCount: data.blackoutCellCount,
    leftBlackoutSignature: data.leftBlackoutSignature,
    topBlackoutSignature: data.topBlackoutSignature,
    board: toStitchingBoard(data.board),
  };
}

function toStitchingPreview(data: StitchingPreviewDto): QueensAdminStitchingPreview {
  return {
    size: data.size,
    orthogonalMinDistance: data.orthogonalMinDistance,
    minimumGroupSize: data.minimumGroupSize,
    topLeft: toStitchingQuadrant(data.topLeft),
    topRight: toStitchingQuadrant(data.topRight),
    bottomLeft: toStitchingQuadrant(data.bottomLeft),
    bottomRight: toStitchingQuadrant(data.bottomRight),
    stitchedBoard: toStitchingBoard(data.stitchedBoard),
  };
}

function toStitchingBatchStatus(data: StitchingBatchStatusDto): QueensAdminStitchingBatchStatus {
  return { ...data };
}

function toStitchingCatalogStats(data: StitchingCatalogStatsDto): QueensAdminStitchingCatalogStats {
  return { ...data };
}

function toStitchingFingerprintSpace(
  data: StitchingFingerprintSpaceDto
): QueensAdminStitchingFingerprintSpace {
  return { ...data };
}

function toStitchingDiscoveryStatus(
  data: StitchingDiscoveryStatusDto
): QueensAdminStitchingDiscoveryStatus {
  return { ...data };
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
    strategy: data.strategy,
    metrics: data.metrics,
    elapsedMs: data.elapsedMs,
    generationPhase: data.generationPhase,
    board: toLocalBoardState(data.boardState),
    history: data.history ?? [],
    updatedAt: data.updatedAt,
    result: data.result ? toOperationResult(data.result) : null,
  };
}

function toBatchStatus(data: BatchGenerationStatusDto): QueensAdminBatchStatus {
  return {
    batchId: data.batchId,
    state: data.state,
    totalJobs: data.totalJobs,
    queuedJobs: data.queuedJobs,
    activeJobs: data.activeJobs,
    completedJobs: data.completedJobs,
    failedJobs: data.failedJobs,
    cancelledJobs: data.cancelledJobs,
    savedUniquePuzzles: data.savedUniquePuzzles,
    duplicatePuzzles: data.duplicatePuzzles,
    persistenceErrors: data.persistenceErrors,
    maxConcurrentJobs: data.maxConcurrentJobs,
    saveSuccessfulPuzzles: data.saveSuccessfulPuzzles,
    note: data.note,
    runs: data.runs.map((run) => ({
      runId: run.runId,
      size: run.size,
      strategy: run.strategy,
      queenCountMode: run.queenCountMode,
      targetQueenCount: run.targetQueenCount,
      orthogonalMinDistance: run.orthogonalMinDistance,
      minimumGroupSize: run.minimumGroupSize,
      state: run.state,
      coloredCellCount: run.coloredCellCount,
      totalCellCount: run.totalCellCount,
      durationMs: run.durationMs,
      success: run.success,
      error: run.error,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      persistenceState: run.persistenceState,
      persistenceMessage: run.persistenceMessage,
      savedPuzzleId: run.savedPuzzleId,
      encodedPuzzleLayout: run.encodedPuzzleLayout,
      completedQueenCount: run.completedQueenCount,
      difficulty: run.difficulty,
    })),
    updatedAt: data.updatedAt,
  };
}

function toSystemLoad(data: SystemLoadDto): QueensAdminSystemLoad {
  return {
    processCpuPercent: data.processCpuPercent,
    systemCpuPercent: data.systemCpuPercent,
    systemLoadAverage: data.systemLoadAverage,
    availableProcessors: data.availableProcessors,
    heapUsedMb: data.heapUsedMb,
    heapMaxMb: data.heapMaxMb,
    singleJobsRunning: data.singleJobsRunning,
    singleJobsQueued: data.singleJobsQueued,
    batchRunsActive: data.batchRunsActive,
    batchRunsQueued: data.batchRunsQueued,
    runningBatchCount: data.runningBatchCount,
    sampledAt: data.sampledAt,
  };
}

function toMaxQueenResolution(data: ResolveMaxQueensResultDto): QueensAdminMaxQueenResolution {
  return {
    size: data.size,
    orthogonalMinDistance: data.orthogonalMinDistance,
    maxQueenCount: data.maxQueenCount,
    elapsedMs: data.elapsedMs,
  };
}

function toPuzzleCatalogStats(data: PuzzleCatalogStatsDto): QueensAdminPuzzleCatalogStats {
  return {
    totalPuzzles: data.totalPuzzles,
    countsBySize: data.countsBySize,
    countsBySizeAndDistance: data.countsBySizeAndDistance ?? {},
    groups: (data.groups ?? []).map(toPuzzleCatalogGroup),
  };
}

function toPuzzleCatalogGroup(data: PuzzleCatalogGroupDto): QueensAdminPuzzleCatalogGroup {
  return {
    size: data.size,
    orthogonalMinDistance: data.orthogonalMinDistance,
    targetQueenCount: data.targetQueenCount,
    minimumGroupSize: data.minimumGroupSize,
    difficulty: data.difficulty,
    count: data.count,
  };
}

function toCatalogPuzzleSelection(
  data: CatalogPuzzleSelectionDto
): QueensAdminCatalogPuzzleSelection {
  return {
    puzzleId: data.puzzleId,
    size: data.size,
    orthogonalMinDistance: data.orthogonalMinDistance,
    targetQueenCount: data.targetQueenCount,
    minimumGroupSize: data.minimumGroupSize,
    difficulty: data.difficulty,
    board: toLocalBoardState(data.boardState)!,
  };
}

function toBuiltInSolverStep(data: BuiltInSolverStepDto): QueensAdminBuiltInSolverStep {
  return {
    id: data.id,
    label: data.label,
    description: data.description,
    difficulty: data.difficultyTier,
    enabled: data.enabled,
    sortOrder: data.sortOrder,
  };
}

function toSolverPattern(data: SolverPatternDto): QueensAdminSolverPattern {
  return {
    id: data.id,
    name: data.name,
    size: data.size,
    cells: data.cells,
    outputFlags: data.outputFlags,
    difficulty: data.difficultyTier,
    enabled: data.enabled,
    sortOrder: data.sortOrder,
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
  };
}

function toSolverConfig(data: SolverConfigDto): QueensAdminSolverConfig {
  return {
    builtInSteps: data.builtInSteps.map(toBuiltInSolverStep),
    patterns: data.patterns.map(toSolverPattern),
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

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;

    try {
      const errorBody = (await response.json()) as
        | { message?: string; error?: string; errors?: string[]; detail?: string }
        | undefined;
      errorMessage =
        errorBody?.message ??
        errorBody?.error ??
        errorBody?.detail ??
        errorBody?.errors?.[0] ??
        errorMessage;
    } catch {
      try {
        const errorText = await response.text();
        if (errorText.trim().length > 0) {
          errorMessage = errorText;
        }
      } catch {
        // Ignore fallback parsing failures and keep the status-based message.
      }
    }

    throw new Error(errorMessage);
  }

  const data = (await response.json()) as OperationResultDto;
  return toOperationResult(data);
}

export const queensAdminApi = {
  async getSolverConfig(): Promise<QueensAdminSolverConfig> {
    const response = await fetch('/api/queens/admin/solver/config');
    if (!response.ok) {
      throw new Error('Failed to load solver configuration');
    }
    return toSolverConfig((await response.json()) as SolverConfigDto);
  },

  async createSolverPattern(pattern: QueensAdminSolverPattern): Promise<QueensAdminSolverPattern> {
    const response = await fetch('/api/queens/admin/solver/patterns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: pattern.id,
        name: pattern.name,
        size: pattern.size,
        cells: pattern.cells,
        outputFlags: pattern.outputFlags,
        difficultyTier: pattern.difficulty,
        enabled: pattern.enabled,
        sortOrder: pattern.sortOrder,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to create solver pattern');
    }
    return toSolverPattern((await response.json()) as SolverPatternDto);
  },

  async updateSolverPattern(pattern: QueensAdminSolverPattern): Promise<QueensAdminSolverPattern> {
    const response = await fetch(`/api/queens/admin/solver/patterns/${pattern.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: pattern.id,
        name: pattern.name,
        size: pattern.size,
        cells: pattern.cells,
        outputFlags: pattern.outputFlags,
        difficultyTier: pattern.difficulty,
        enabled: pattern.enabled,
        sortOrder: pattern.sortOrder,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to update solver pattern');
    }
    return toSolverPattern((await response.json()) as SolverPatternDto);
  },

  async getPuzzleCatalogStats(): Promise<QueensAdminPuzzleCatalogStats> {
    const response = await fetch('/api/queens/admin/generation/catalog-stats');
    return toPuzzleCatalogStats((await response.json()) as PuzzleCatalogStatsDto);
  },

  async getRandomCatalogPuzzle(filters?: {
    size?: number;
    orthogonalMinDistance?: number;
    targetQueenCount?: number;
    minimumGroupSize?: number;
    difficulty?: QueensAdminPuzzleDifficulty;
  }): Promise<QueensAdminCatalogPuzzleSelection | null> {
    const query = new URLSearchParams();
    if (filters?.size != null) query.set('size', String(filters.size));
    if (filters?.orthogonalMinDistance != null) {
      query.set('orthogonalMinDistance', String(filters.orthogonalMinDistance));
    }
    if (filters?.targetQueenCount != null) {
      query.set('targetQueenCount', String(filters.targetQueenCount));
    }
    if (filters?.minimumGroupSize != null) {
      query.set('minimumGroupSize', String(filters.minimumGroupSize));
    }
    if (filters?.difficulty) {
      query.set('difficulty', filters.difficulty);
    }

    const response = await fetch(
      `/api/queens/admin/generation/catalog-random-puzzle${query.size > 0 ? `?${query.toString()}` : ''}`
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error('Failed to load a random catalog puzzle');
    }
    return toCatalogPuzzleSelection((await response.json()) as CatalogPuzzleSelectionDto);
  },

  async getCatalogPuzzleById(puzzleId: string): Promise<QueensAdminCatalogPuzzleSelection | null> {
    const response = await fetch(`/api/queens/admin/generation/catalog-puzzle/${puzzleId}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error('Failed to load the requested catalog puzzle');
    }
    return toCatalogPuzzleSelection((await response.json()) as CatalogPuzzleSelectionDto);
  },

  async deletePuzzleCatalogGroup(group: {
    size: number;
    orthogonalMinDistance: number;
    targetQueenCount: number;
    minimumGroupSize: number;
    difficulty?: QueensAdminPuzzleDifficulty;
  }): Promise<number> {
    const response = await fetch('/api/queens/admin/generation/catalog-groups/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(group),
    });

    if (!response.ok) {
      throw new Error('Failed to delete puzzle catalog group');
    }

    const data = (await response.json()) as DeletePuzzleCatalogGroupResultDto;
    return data.deletedCount;
  },

  runSingleColorGroupSolverRule(
    boardState: QueensAdminBoardState,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/solver/single-color-group', { boardState }, signal);
  },

  runSpecificSolverRule(
    boardState: QueensAdminBoardState,
    ruleName: string,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/solver/run-rule', { boardState, ruleName }, signal);
  },

  runSolverPattern(
    boardState: QueensAdminBoardState,
    pattern: QueensAdminSolverPattern,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/solver/pattern',
      {
        boardState,
        pattern: {
          id: pattern.id,
          size: pattern.size,
          cells: pattern.cells,
          outputFlags: pattern.outputFlags,
        } satisfies SolverPatternExecutionDto,
      },
      signal
    );
  },

  async getSystemLoad(): Promise<QueensAdminSystemLoad> {
    const response = await fetch('/api/queens/admin/generation/system-load');
    const data = (await response.json()) as SystemLoadDto;
    return toSystemLoad(data);
  },

  async getStitchingPreview(signal?: AbortSignal): Promise<QueensAdminStitchingPreview> {
    const response = await fetch('/api/queens/admin/generation/stitching-preview', {
      signal,
    });
    if (!response.ok) {
      let message = 'Failed to load the stitching preview';
      try {
        const errorBody = (await response.json()) as { message?: string };
        if (errorBody.message) message = errorBody.message;
      } catch (_) {
        // ignore parse failure, keep default message
      }
      throw new Error(message);
    }
    return toStitchingPreview((await response.json()) as StitchingPreviewDto);
  },

  async startStitchingBatch(request: StitchingBatchRequestDto): Promise<string> {
    const response = await fetch('/api/stitching/batch/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = (await response.json()) as StitchingBatchStartedDto;
    return data.batchId;
  },

  async getStitchingBatchStatus(batchId: string): Promise<QueensAdminStitchingBatchStatus> {
    const response = await fetch(`/api/stitching/batch/${batchId}`);
    if (!response.ok) {
      throw new Error('Failed to load stitching batch status');
    }
    return toStitchingBatchStatus((await response.json()) as StitchingBatchStatusDto);
  },

  async cancelStitchingBatch(batchId: string): Promise<QueensAdminStitchingBatchStatus> {
    const response = await fetch(`/api/stitching/batch/${batchId}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to cancel stitching batch');
    }
    return toStitchingBatchStatus((await response.json()) as StitchingBatchStatusDto);
  },

  async getStitchingCatalogStats(): Promise<QueensAdminStitchingCatalogStats> {
    const response = await fetch('/api/stitching/catalog/stats');
    if (!response.ok) {
      throw new Error('Failed to load stitching catalog stats');
    }
    return toStitchingCatalogStats((await response.json()) as StitchingCatalogStatsDto);
  },

  async getStitchingFingerprintSpace(): Promise<QueensAdminStitchingFingerprintSpace> {
    const response = await fetch('/api/stitching/fingerprint-space');
    if (!response.ok) {
      throw new Error('Failed to load stitching fingerprint space');
    }
    return toStitchingFingerprintSpace((await response.json()) as StitchingFingerprintSpaceDto);
  },

  async startStitchingDiscovery(request: {
    generationLimit: number;
    skipSatisfiedBuckets: boolean;
    maxConcurrentJobs: number;
  }): Promise<QueensAdminStitchingDiscoveryStatus> {
    const response = await fetch('/api/stitching/discovery/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return toStitchingDiscoveryStatus((await response.json()) as StitchingDiscoveryStatusDto);
  },

  async getStitchingDiscoveryStatus(): Promise<QueensAdminStitchingDiscoveryStatus | null> {
    const response = await fetch('/api/stitching/discovery');
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error('Failed to load stitching discovery status');
    }
    return toStitchingDiscoveryStatus((await response.json()) as StitchingDiscoveryStatusDto);
  },

  async stopStitchingDiscovery(): Promise<QueensAdminStitchingDiscoveryStatus | null> {
    const response = await fetch('/api/stitching/discovery/stop', {
      method: 'POST',
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error('Failed to stop stitching discovery');
    }
    return toStitchingDiscoveryStatus((await response.json()) as StitchingDiscoveryStatusDto);
  },

  async exportStitchingCatalog(): Promise<StitchingCatalogExportDto> {
    const response = await fetch('/api/stitching/catalog/export', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to export stitching catalog');
    }
    return (await response.json()) as StitchingCatalogExportDto;
  },

  async resolveMaxQueenCount(
    request: { size: number; orthogonalMinDistance?: number },
    signal?: AbortSignal
  ): Promise<QueensAdminMaxQueenResolution> {
    const response = await fetch('/api/queens/admin/generation/resolve-max-queens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = (await response.json()) as ResolveMaxQueensResultDto;
    return toMaxQueenResolution(data);
  },

  async startBatchGeneration(request: {
    sizes: number[];
    orthogonalMinDistances: number[];
    strategies: QueensAdminGenerationStrategy[];
    runsPerCombination: number;
    runMode: QueensAdminBatchRunMode;
    queenCountMode: QueensAdminQueenCountMode;
    targetQueenCount?: number | null;
    orthogonalMinDistance?: number | null;
    minimumGroupSize: number;
    maxConcurrentJobs: number;
    saveSuccessfulPuzzles: boolean;
  }): Promise<string> {
    const response = await fetch('/api/queens/admin/generation/batches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const data = (await response.json()) as BatchGenerationStartedDto;
    return data.batchId;
  },

  async getBatchGenerationStatus(batchId: string): Promise<QueensAdminBatchStatus> {
    const response = await fetch(`/api/queens/admin/generation/batches/${batchId}`);
    const data = (await response.json()) as BatchGenerationStatusDto;
    return toBatchStatus(data);
  },

  async cancelBatchGeneration(batchId: string): Promise<QueensAdminBatchStatus> {
    const response = await fetch(`/api/queens/admin/generation/batches/${batchId}/cancel`, {
      method: 'POST',
    });
    const data = (await response.json()) as BatchGenerationStatusDto;
    return toBatchStatus(data);
  },

  createEmptyBoard(
    size: number,
    options?: {
      queenCountMode?: QueensAdminQueenCountMode;
      targetQueenCount?: number;
      orthogonalMinDistance?: number;
    },
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/board/create',
      {
        size,
        queenCountMode: options?.queenCountMode ?? 'exact',
        targetQueenCount: options?.targetQueenCount ?? size,
        orthogonalMinDistance: options?.orthogonalMinDistance ?? size,
      },
      signal
    );
  },

  generateValidBoard(
    size: number,
    minimumGroupSize: number,
    options?: {
      queenCountMode?: QueensAdminQueenCountMode;
      targetQueenCount?: number;
      orthogonalMinDistance?: number;
    },
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation(
      '/api/queens/admin/generation/generate-valid-board',
      {
        size,
        minimumGroupSize,
        queenCountMode: options?.queenCountMode ?? 'exact',
        targetQueenCount: options?.targetQueenCount ?? size,
        orthogonalMinDistance: options?.orthogonalMinDistance ?? size,
      },
      signal
    );
  },

  async startGenerateValidBoardJob(
    size: number,
    options?: {
      includeProgressUpdates?: boolean;
      minimumGroupSize?: number;
      queenCountMode?: QueensAdminQueenCountMode;
      targetQueenCount?: number;
      orthogonalMinDistance?: number;
      generationStrategy?: QueensAdminGenerationStrategy;
      seedTemplateOffsets?: TemplateOffsetDto[];
    }
  ): Promise<string> {
    const response = await fetch('/api/queens/admin/generation/generate-valid-board/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        size,
        minimumGroupSize: options?.minimumGroupSize ?? 3,
        queenCountMode: options?.queenCountMode ?? 'exact',
        targetQueenCount: options?.targetQueenCount ?? size,
        orthogonalMinDistance: options?.orthogonalMinDistance ?? size,
        includeProgressUpdates: options?.includeProgressUpdates ?? false,
        generationStrategy: options?.generationStrategy ?? 'baseline',
        seedTemplateOffsets: options?.seedTemplateOffsets ?? null,
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

  runAllSolverSteps(
    boardState: QueensAdminBoardState | null,
    signal?: AbortSignal
  ): Promise<QueensAdminOperationResult> {
    return postOperation('/api/queens/admin/solver/run-all', { boardState }, signal);
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
