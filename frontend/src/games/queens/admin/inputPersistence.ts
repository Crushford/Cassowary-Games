import type { ColorName } from '../types/types';
import { COLOR_PALETTE } from '../utils/colorPalette';
import type {
  QueensAdminBoardState,
  QueensAdminCatalogPuzzleSelection,
  QueensAdminSolverDifficulty,
  QueensAdminGenerationStrategy,
  QueensAdminQueenCountMode,
  QueensAdminTool,
} from './types';
import { isSolverDifficulty } from './solverDifficulty';

const WORKSHOP_INPUTS_KEY = 'queens-admin-workshop-inputs-v2';
const BATCH_INPUTS_KEY = 'queens-admin-batch-inputs-v2';
const SOLVER_INPUTS_KEY = 'queens-admin-solver-inputs-v1';
const SOLVER_SESSION_KEY = 'queens-admin-solver-session-v1';
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
  sizesInput: string;
  runsPerCombination: number;
  maxConcurrentJobs: number;
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
  stepDifficulties: Record<string, QueensAdminSolverDifficulty>;
  runAllDifficultyThreshold: QueensAdminSolverDifficulty;
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

  const sizesInput =
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
    ...(sizesInput != null ? { sizesInput } : {}),
    ...(runsPerCombination != null ? { runsPerCombination } : {}),
    ...(maxConcurrentJobs != null ? { maxConcurrentJobs } : {}),
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
    ? (parsed as { runAllDifficultyThreshold: QueensAdminSolverDifficulty })
        .runAllDifficultyThreshold
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

function normalizeStepDifficulties(
  value: unknown
): Record<string, QueensAdminSolverDifficulty> | null {
  if (!value || typeof value !== 'object') return null;

  const normalized = Object.entries(value as Record<string, unknown>).reduce<
    Record<string, QueensAdminSolverDifficulty>
  >((acc, [key, entry]) => {
    if (isSolverDifficulty(entry)) {
      acc[key] = entry;
    }
    return acc;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : null;
}
