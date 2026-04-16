import type { ColorName } from '../types/types';
import { COLOR_PALETTE } from '../utils/colorPalette';
import type {
  QueensAdminBoardState,
  QueensAdminBatchRunMode,
  QueensAdminCatalogPuzzleSelection,
  QueensAdminDifficulty,
  QueensAdminGenerationStrategy,
  QueensAdminQueenCountMode,
  QueensAdminTool,
} from './types';
import { isSolverDifficulty } from './solverDifficulty';

const WORKSHOP_INPUTS_KEY = 'queens-admin-workshop-inputs-v2';
const BATCH_INPUTS_KEY = 'queens-admin-batch-inputs-v2';
const MAX_QUEENS_INPUTS_KEY = 'queens-admin-max-queens-inputs-v1';
const SOLVER_INPUTS_KEY = 'queens-admin-solver-inputs-v1';
const SOLVER_SESSION_KEY = 'queens-admin-solver-session-v1';
const STITCHING_INPUTS_KEY = 'queens-admin-stitching-inputs-v1';
const VALID_STRATEGIES: QueensAdminGenerationStrategy[] = [
  'baseline',
  'marker-guided',
  'template-seeded',
];
const VALID_TOOLS: QueensAdminTool[] = [
  'paint-color',
  'erase-color',
  'place-flag',
  'remove-flag',
  'place-queen',
  'remove-queen',
  'inspect-cell',
];
const VALID_QUEEN_COUNT_MODES: QueensAdminQueenCountMode[] = ['exact', 'max'];
const VALID_BATCH_RUN_MODES: QueensAdminBatchRunMode[] = ['cartesian', 'lowest-count'];
type PersistedTemplateSeedCell = {
  row: number;
  col: number;
  filled: boolean;
};

export type QueensAdminWorkshopInputs = {
  selectedBoardSize: number;
  queenCountMode: QueensAdminQueenCountMode;
  targetQueenCount: number;
  orthogonalMinDistance: number;
  minimumGroupSize: number;
  showSolutionQueens: boolean;
  generationPreviewIntervalMs: number;
  generationStrategy: QueensAdminGenerationStrategy;
  selectedTool: QueensAdminTool;
  selectedColor: ColorName;
  templateSeedCells: PersistedTemplateSeedCell[];
};

export type QueensAdminBatchInputs = {
  selectedSizes: number[];
  selectedDistances: number[];
  runsPerCombination: number;
  maxConcurrentJobs: number;
  runMode: QueensAdminBatchRunMode;
  queenCountMode: QueensAdminQueenCountMode;
  targetQueenCount: number;
  orthogonalMinDistance: number;
  minimumGroupSize: number;
  saveSuccessfulPuzzles: boolean;
  selectedStrategies: QueensAdminGenerationStrategy[];
};

export type QueensAdminSolverInputs = {
  selectedSize: 'any' | number;
  selectedDistance: 'any' | number;
  selectedMinimumGroupSize: 'any' | number;
  selectedQueenCount: 'any' | number;
  autoRunSingleColorAfterSolverAction: boolean;
  stepDifficulties: Record<string, QueensAdminDifficulty>;
  runAllDifficultyThreshold: QueensAdminDifficulty;
};

export type QueensAdminStitchingInputs = {
  showQueens: boolean;
  selectedBatchPreset:
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'all-preview'
    | 'all-left-only'
    | 'all-top-only'
    | 'all-both'
    | 'all-reachable';
  runsPerFingerprint: number;
  stitchingConcurrency: number;
  discoveryGenerationLimit: number;
  discoverySkipSatisfiedBuckets: boolean;
  discoveryMaxConcurrentJobs: number;
};

export type QueensAdminMaxQueensInputs = {
  sizesInput: string;
  distancesInput: string;
  maxConcurrentJobs: number;
};

export type QueensAdminMaxQueensRowState =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type QueensAdminMaxQueensRow = {
  size: number;
  orthogonalMinDistance: number;
  state: QueensAdminMaxQueensRowState;
  maxQueenCount: number | null;
  elapsedMs: number | null;
  error: string | null;
};

export type QueensAdminSolverSession = {
  selection: QueensAdminCatalogPuzzleSelection;
  currentBoard: QueensAdminBoardState;
};

function normalizeAnyOrInteger(
  value: unknown,
  minimum: number,
  maximum: number
): 'any' | number | null {
  if (value === 'any') return 'any';
  return clampInteger(value, minimum, maximum);
}

function readJson(key: string): unknown {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function clampInteger(value: unknown, minimum: number, maximum: number): number | null {
  if (!Number.isInteger(value)) return null;
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function isValidStrategy(value: unknown): value is QueensAdminGenerationStrategy {
  return (
    typeof value === 'string' && VALID_STRATEGIES.includes(value as QueensAdminGenerationStrategy)
  );
}

function isValidTool(value: unknown): value is QueensAdminTool {
  return typeof value === 'string' && VALID_TOOLS.includes(value as QueensAdminTool);
}

function isValidQueenCountMode(value: unknown): value is QueensAdminQueenCountMode {
  return (
    typeof value === 'string' &&
    VALID_QUEEN_COUNT_MODES.includes(value as QueensAdminQueenCountMode)
  );
}

function isValidBatchRunMode(value: unknown): value is QueensAdminBatchRunMode {
  return (
    typeof value === 'string' && VALID_BATCH_RUN_MODES.includes(value as QueensAdminBatchRunMode)
  );
}

function isValidColor(value: unknown): value is ColorName {
  return typeof value === 'string' && COLOR_PALETTE.includes(value as ColorName);
}

function normalizeTemplateSeedCells(value: unknown): PersistedTemplateSeedCell[] | null {
  if (!Array.isArray(value)) return null;

  const cells = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = clampInteger((entry as { row?: unknown }).row, 0, 6);
      const col = clampInteger((entry as { col?: unknown }).col, 0, 6);
      const filled = (entry as { filled?: unknown }).filled;
      if (row == null || col == null || typeof filled !== 'boolean') return null;
      return { row, col, filled };
    })
    .filter((entry): entry is PersistedTemplateSeedCell => entry !== null);

  return cells.length === 49 ? cells : null;
}

export function loadQueensAdminWorkshopInputs(): Partial<QueensAdminWorkshopInputs> | null {
  const parsed = readJson(WORKSHOP_INPUTS_KEY);
  if (!parsed || typeof parsed !== 'object') return null;

  const selectedBoardSize = clampInteger(
    (parsed as { selectedBoardSize?: unknown }).selectedBoardSize,
    4,
    20
  );
  const queenCountMode = isValidQueenCountMode(
    (parsed as { queenCountMode?: unknown }).queenCountMode
  )
    ? (parsed as { queenCountMode: QueensAdminQueenCountMode }).queenCountMode
    : null;
  const targetQueenCount = clampInteger(
    (parsed as { targetQueenCount?: unknown }).targetQueenCount,
    1,
    400
  );
  const orthogonalMinDistance = clampInteger(
    (parsed as { orthogonalMinDistance?: unknown }).orthogonalMinDistance,
    1,
    400
  );
  const minimumGroupSize = clampInteger(
    (parsed as { minimumGroupSize?: unknown }).minimumGroupSize,
    1,
    20
  );
  const showSolutionQueens =
    typeof (parsed as { showSolutionQueens?: unknown }).showSolutionQueens === 'boolean'
      ? (parsed as { showSolutionQueens: boolean }).showSolutionQueens
      : null;
  const generationPreviewIntervalMs = clampInteger(
    (parsed as { generationPreviewIntervalMs?: unknown }).generationPreviewIntervalMs,
    50,
    10000
  );
  const generationStrategy = isValidStrategy(
    (parsed as { generationStrategy?: unknown }).generationStrategy
  )
    ? (parsed as { generationStrategy: QueensAdminGenerationStrategy }).generationStrategy
    : null;
  const selectedTool = isValidTool((parsed as { selectedTool?: unknown }).selectedTool)
    ? (parsed as { selectedTool: QueensAdminTool }).selectedTool
    : null;
  const selectedColor = isValidColor((parsed as { selectedColor?: unknown }).selectedColor)
    ? (parsed as { selectedColor: ColorName }).selectedColor
    : null;
  const templateSeedCells = normalizeTemplateSeedCells(
    (parsed as { templateSeedCells?: unknown }).templateSeedCells
  );

  return {
    ...(selectedBoardSize != null ? { selectedBoardSize } : {}),
    ...(queenCountMode ? { queenCountMode } : {}),
    ...(targetQueenCount != null ? { targetQueenCount } : {}),
    ...(orthogonalMinDistance != null ? { orthogonalMinDistance } : {}),
    ...(minimumGroupSize != null ? { minimumGroupSize } : {}),
    ...(showSolutionQueens != null ? { showSolutionQueens } : {}),
    ...(generationPreviewIntervalMs != null ? { generationPreviewIntervalMs } : {}),
    ...(generationStrategy ? { generationStrategy } : {}),
    ...(selectedTool ? { selectedTool } : {}),
    ...(selectedColor ? { selectedColor } : {}),
    ...(templateSeedCells ? { templateSeedCells } : {}),
  };
}

export function saveQueensAdminWorkshopInputs(value: QueensAdminWorkshopInputs): void {
  writeJson(WORKSHOP_INPUTS_KEY, value);
}

export function loadQueensAdminBatchInputs(): Partial<QueensAdminBatchInputs> | null {
  const parsed = readJson(BATCH_INPUTS_KEY);
  if (!parsed || typeof parsed !== 'object') return null;

  const selectedSizes = Array.isArray((parsed as { selectedSizes?: unknown }).selectedSizes)
    ? Array.from(
        new Set(
          (parsed as { selectedSizes: unknown[] }).selectedSizes
            .map((value) => clampInteger(value, 4, 20))
            .filter((value): value is number => value != null)
        )
      ).sort((left, right) => left - right)
    : null;
  const selectedDistances = Array.isArray(
    (parsed as { selectedDistances?: unknown }).selectedDistances
  )
    ? Array.from(
        new Set(
          (parsed as { selectedDistances: unknown[] }).selectedDistances
            .map((value) => clampInteger(value, 1, 400))
            .filter((value): value is number => value != null)
        )
      ).sort((left, right) => left - right)
    : null;
  const legacySizesInput =
    typeof (parsed as { sizesInput?: unknown }).sizesInput === 'string'
      ? (parsed as { sizesInput: string }).sizesInput
      : null;
  const runsPerCombination = clampInteger(
    (parsed as { runsPerCombination?: unknown }).runsPerCombination,
    1,
    100
  );
  const maxConcurrentJobs = clampInteger(
    (parsed as { maxConcurrentJobs?: unknown }).maxConcurrentJobs,
    1,
    12
  );
  const runMode = isValidBatchRunMode((parsed as { runMode?: unknown }).runMode)
    ? (parsed as { runMode: QueensAdminBatchRunMode }).runMode
    : null;
  const queenCountMode = isValidQueenCountMode(
    (parsed as { queenCountMode?: unknown }).queenCountMode
  )
    ? (parsed as { queenCountMode: QueensAdminQueenCountMode }).queenCountMode
    : null;
  const targetQueenCount = clampInteger(
    (parsed as { targetQueenCount?: unknown }).targetQueenCount,
    1,
    400
  );
  const orthogonalMinDistance = clampInteger(
    (parsed as { orthogonalMinDistance?: unknown }).orthogonalMinDistance,
    1,
    400
  );
  const minimumGroupSize = clampInteger(
    (parsed as { minimumGroupSize?: unknown }).minimumGroupSize,
    1,
    20
  );
  const saveSuccessfulPuzzles =
    typeof (parsed as { saveSuccessfulPuzzles?: unknown }).saveSuccessfulPuzzles === 'boolean'
      ? (parsed as { saveSuccessfulPuzzles: boolean }).saveSuccessfulPuzzles
      : null;
  const selectedStrategies = Array.isArray(
    (parsed as { selectedStrategies?: unknown }).selectedStrategies
  )
    ? Array.from(
        new Set(
          (parsed as { selectedStrategies: unknown[] }).selectedStrategies.filter(isValidStrategy)
        )
      )
    : null;

  return {
    ...(selectedSizes && selectedSizes.length
      ? { selectedSizes }
      : legacySizesInput != null
        ? {
            selectedSizes: Array.from(
              new Set(
                legacySizesInput
                  .split(',')
                  .map((chunk) => Number.parseInt(chunk.trim(), 10))
                  .filter((size) => Number.isInteger(size) && size >= 4 && size <= 20)
              )
            ).sort((left, right) => left - right),
          }
        : {}),
    ...(selectedDistances && selectedDistances.length ? { selectedDistances } : {}),
    ...(runsPerCombination != null ? { runsPerCombination } : {}),
    ...(maxConcurrentJobs != null ? { maxConcurrentJobs } : {}),
    ...(runMode ? { runMode } : {}),
    ...(queenCountMode ? { queenCountMode } : {}),
    ...(targetQueenCount != null ? { targetQueenCount } : {}),
    ...(orthogonalMinDistance != null ? { orthogonalMinDistance } : {}),
    ...(minimumGroupSize != null ? { minimumGroupSize } : {}),
    ...(saveSuccessfulPuzzles != null ? { saveSuccessfulPuzzles } : {}),
    ...(selectedStrategies && selectedStrategies.length ? { selectedStrategies } : {}),
  };
}

export function saveQueensAdminBatchInputs(value: QueensAdminBatchInputs): void {
  writeJson(BATCH_INPUTS_KEY, value);
}

export function loadQueensAdminStitchingInputs(): Partial<QueensAdminStitchingInputs> | null {
  const parsed = readJson(STITCHING_INPUTS_KEY);
  if (!parsed || typeof parsed !== 'object') return null;

  const showQueens =
    typeof (parsed as { showQueens?: unknown }).showQueens === 'boolean'
      ? (parsed as { showQueens: boolean }).showQueens
      : null;
  const selectedBatchPresetRaw = (parsed as { selectedBatchPreset?: unknown }).selectedBatchPreset;
  const selectedBatchPreset =
    selectedBatchPresetRaw === 'top-right' ||
    selectedBatchPresetRaw === 'bottom-left' ||
    selectedBatchPresetRaw === 'bottom-right' ||
    selectedBatchPresetRaw === 'all-preview' ||
    selectedBatchPresetRaw === 'all-left-only' ||
    selectedBatchPresetRaw === 'all-top-only' ||
    selectedBatchPresetRaw === 'all-both' ||
    selectedBatchPresetRaw === 'all-reachable'
      ? selectedBatchPresetRaw
      : null;
  const runsPerFingerprint = clampInteger(
    (parsed as { runsPerFingerprint?: unknown }).runsPerFingerprint,
    1,
    100
  );
  const stitchingConcurrency = clampInteger(
    (parsed as { stitchingConcurrency?: unknown }).stitchingConcurrency,
    1,
    8
  );
  const discoveryGenerationLimit = clampInteger(
    (parsed as { discoveryGenerationLimit?: unknown }).discoveryGenerationLimit,
    1,
    10000
  );
  const discoverySkipSatisfiedBuckets =
    typeof (parsed as { discoverySkipSatisfiedBuckets?: unknown }).discoverySkipSatisfiedBuckets ===
    'boolean'
      ? (parsed as { discoverySkipSatisfiedBuckets: boolean }).discoverySkipSatisfiedBuckets
      : null;
  const discoveryMaxConcurrentJobs = clampInteger(
    (parsed as { discoveryMaxConcurrentJobs?: unknown }).discoveryMaxConcurrentJobs,
    1,
    8
  );

  return {
    ...(showQueens != null ? { showQueens } : {}),
    ...(selectedBatchPreset ? { selectedBatchPreset } : {}),
    ...(runsPerFingerprint != null ? { runsPerFingerprint } : {}),
    ...(stitchingConcurrency != null ? { stitchingConcurrency } : {}),
    ...(discoveryGenerationLimit != null ? { discoveryGenerationLimit } : {}),
    ...(discoverySkipSatisfiedBuckets != null ? { discoverySkipSatisfiedBuckets } : {}),
    ...(discoveryMaxConcurrentJobs != null ? { discoveryMaxConcurrentJobs } : {}),
  };
}

export function saveQueensAdminStitchingInputs(value: QueensAdminStitchingInputs): void {
  writeJson(STITCHING_INPUTS_KEY, value);
}

export function loadQueensAdminMaxQueensInputs(): Partial<QueensAdminMaxQueensInputs> | null {
  const parsed = readJson(MAX_QUEENS_INPUTS_KEY);
  if (!parsed || typeof parsed !== 'object') return null;

  const sizesInput =
    typeof (parsed as { sizesInput?: unknown }).sizesInput === 'string'
      ? (parsed as { sizesInput: string }).sizesInput
      : null;
  const distancesInput =
    typeof (parsed as { distancesInput?: unknown }).distancesInput === 'string'
      ? (parsed as { distancesInput: string }).distancesInput
      : null;
  const maxConcurrentJobs = clampInteger(
    (parsed as { maxConcurrentJobs?: unknown }).maxConcurrentJobs,
    1,
    32
  );

  return {
    ...(sizesInput != null ? { sizesInput } : {}),
    ...(distancesInput != null ? { distancesInput } : {}),
    ...(maxConcurrentJobs != null ? { maxConcurrentJobs } : {}),
  };
}

export function saveQueensAdminMaxQueensInputs(value: QueensAdminMaxQueensInputs): void {
  writeJson(MAX_QUEENS_INPUTS_KEY, value);
}

const MAX_QUEENS_RESULTS_KEY = 'queens-admin-max-queens-results-v1';

export function loadQueensAdminMaxQueensResults(): QueensAdminMaxQueensRow[] | null {
  const parsed = readJson(MAX_QUEENS_RESULTS_KEY);
  if (!Array.isArray(parsed)) return null;

  const rows = parsed
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const size = clampInteger((entry as { size?: unknown }).size, 4, 20);
      const orthogonalMinDistance = clampInteger(
        (entry as { orthogonalMinDistance?: unknown }).orthogonalMinDistance,
        1,
        400
      );
      const state = (entry as { state?: unknown }).state;
      const maxQueenCountRaw = (entry as { maxQueenCount?: unknown }).maxQueenCount;
      const elapsedMsRaw = (entry as { elapsedMs?: unknown }).elapsedMs;
      const errorRaw = (entry as { error?: unknown }).error;
      if (
        size == null ||
        orthogonalMinDistance == null ||
        (state !== 'QUEUED' &&
          state !== 'RUNNING' &&
          state !== 'COMPLETED' &&
          state !== 'FAILED' &&
          state !== 'CANCELLED')
      ) {
        return null;
      }
      const maxQueenCount =
        maxQueenCountRaw == null ? null : clampInteger(maxQueenCountRaw, 1, 400);
      const elapsedMs = elapsedMsRaw == null ? null : clampInteger(elapsedMsRaw, 0, 86_400_000);
      const error = typeof errorRaw === 'string' ? errorRaw : null;
      return {
        size,
        orthogonalMinDistance,
        state,
        maxQueenCount,
        elapsedMs,
        error,
      } satisfies QueensAdminMaxQueensRow;
    })
    .filter((entry): entry is QueensAdminMaxQueensRow => entry !== null);

  return rows;
}

export function saveQueensAdminMaxQueensResults(value: QueensAdminMaxQueensRow[]): void {
  writeJson(MAX_QUEENS_RESULTS_KEY, value);
}

export function loadQueensAdminSolverInputs(): Partial<QueensAdminSolverInputs> | null {
  const parsed = readJson(SOLVER_INPUTS_KEY);
  if (!parsed || typeof parsed !== 'object') return null;

  const selectedSize = normalizeAnyOrInteger(
    (parsed as { selectedSize?: unknown }).selectedSize,
    4,
    20
  );
  const selectedDistance = normalizeAnyOrInteger(
    (parsed as { selectedDistance?: unknown }).selectedDistance,
    1,
    400
  );
  const selectedMinimumGroupSize = normalizeAnyOrInteger(
    (parsed as { selectedMinimumGroupSize?: unknown }).selectedMinimumGroupSize,
    1,
    20
  );
  const selectedQueenCount = normalizeAnyOrInteger(
    (parsed as { selectedQueenCount?: unknown }).selectedQueenCount,
    1,
    400
  );
  const autoRunSingleColorAfterSolverAction =
    typeof (parsed as { autoRunSingleColorAfterSolverAction?: unknown })
      .autoRunSingleColorAfterSolverAction === 'boolean'
      ? (parsed as { autoRunSingleColorAfterSolverAction: boolean })
          .autoRunSingleColorAfterSolverAction
      : null;
  const stepDifficulties = normalizeStepDifficulties(
    (parsed as { stepDifficulties?: unknown }).stepDifficulties
  );
  const runAllDifficultyThreshold = isSolverDifficulty(
    (parsed as { runAllDifficultyThreshold?: unknown }).runAllDifficultyThreshold
  )
    ? (parsed as { runAllDifficultyThreshold: QueensAdminDifficulty }).runAllDifficultyThreshold
    : null;

  return {
    ...(selectedSize != null ? { selectedSize } : {}),
    ...(selectedDistance != null ? { selectedDistance } : {}),
    ...(selectedMinimumGroupSize != null ? { selectedMinimumGroupSize } : {}),
    ...(selectedQueenCount != null ? { selectedQueenCount } : {}),
    ...(autoRunSingleColorAfterSolverAction != null ? { autoRunSingleColorAfterSolverAction } : {}),
    ...(stepDifficulties ? { stepDifficulties } : {}),
    ...(runAllDifficultyThreshold ? { runAllDifficultyThreshold } : {}),
  };
}

export function saveQueensAdminSolverInputs(value: QueensAdminSolverInputs): void {
  writeJson(SOLVER_INPUTS_KEY, value);
}

export function loadQueensAdminSolverSession(): QueensAdminSolverSession | null {
  const parsed = readJson(SOLVER_SESSION_KEY);
  if (!parsed || typeof parsed !== 'object') return null;

  const selection = (parsed as { selection?: unknown }).selection;
  const currentBoard = (parsed as { currentBoard?: unknown }).currentBoard;

  if (!selection || typeof selection !== 'object') return null;
  if (!currentBoard || typeof currentBoard !== 'object') return null;

  return {
    selection: selection as QueensAdminCatalogPuzzleSelection,
    currentBoard: currentBoard as QueensAdminBoardState,
  };
}

export function saveQueensAdminSolverSession(value: QueensAdminSolverSession | null): void {
  if (typeof window === 'undefined') return;
  if (value == null) {
    window.localStorage.removeItem(SOLVER_SESSION_KEY);
    return;
  }
  writeJson(SOLVER_SESSION_KEY, value);
}

function normalizeStepDifficulties(value: unknown): Record<string, QueensAdminDifficulty> | null {
  if (!value || typeof value !== 'object') return null;

  const normalized = Object.entries(value as Record<string, unknown>).reduce<
    Record<string, QueensAdminDifficulty>
  >((acc, [key, entry]) => {
    if (isSolverDifficulty(entry)) {
      acc[key] = entry;
    }
    return acc;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : null;
}
