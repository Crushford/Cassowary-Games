import type { ColorName } from '../types/types';
import { COLOR_PALETTE } from '../utils/colorPalette';
import type { QueensAdminGenerationStrategy, QueensAdminTool } from './types';

const WORKSHOP_INPUTS_KEY = 'queens-admin-workshop-inputs-v2';
const BATCH_INPUTS_KEY = 'queens-admin-batch-inputs-v1';
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
type PersistedTemplateSeedCell = {
  row: number;
  col: number;
  filled: boolean;
};

export type QueensAdminWorkshopInputs = {
  selectedBoardSize: number;
  minimumGroupSize: number;
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
  minimumGroupSize: number;
  saveSuccessfulPuzzles: boolean;
  selectedStrategies: QueensAdminGenerationStrategy[];
};

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
  const minimumGroupSize = clampInteger(
    (parsed as { minimumGroupSize?: unknown }).minimumGroupSize,
    1,
    20
  );
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
    ...(minimumGroupSize != null ? { minimumGroupSize } : {}),
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
    ...(minimumGroupSize != null ? { minimumGroupSize } : {}),
    ...(saveSuccessfulPuzzles != null ? { saveSuccessfulPuzzles } : {}),
    ...(selectedStrategies && selectedStrategies.length ? { selectedStrategies } : {}),
  };
}

export function saveQueensAdminBatchInputs(value: QueensAdminBatchInputs): void {
  writeJson(BATCH_INPUTS_KEY, value);
}
