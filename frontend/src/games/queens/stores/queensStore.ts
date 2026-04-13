import { defineStore } from 'pinia';
import type { GridSquare, MarkType, Pos, QueensRegionColorMode } from '../types/types';
import { createEmptyGrid, clonePlayerMarks } from './gridUtils';
import { removeQueenPlacement, replayHistoryFromEntries } from '../utils/queenRemoval';
import {
  buildEncodedQueensPuzzleLayout,
  decodeQueensPuzzleLayout,
  QUEENS_PUZZLE_SHARE_BASE_URL,
} from '../utils/urlPuzzleEncoding';
import { assignRegionPaletteColors } from '../utils/regionDisplay';
import router from '@/router';
import { useSpeedModeStore } from './speedModeStore';
import {
  chooseRandomPuzzleThatIsMeaningfullyDifferent,
  convertAverageIntoRequiredDifference,
  estimateAverageDifferenceBetweenPuzzles,
  keepOnlyOriginalPuzzleVariants,
  type PuzzleForDiversity,
} from '../utils/puzzleDiversitySelector';
import {
  buildQueensSelectionRoute,
  type QueensSelectionDifficulty,
  QUEENS_SELECTION_DIFFICULTY_ORDER,
} from '../utils/puzzleSelectionRoute';
import { loadMergedQueensPuzzleCatalog } from '../utils/puzzleCatalog';
import type { QueensAdminBoardState, QueensAdminMarkType } from '../admin/types';
import {
  applyQueensSolverStep,
  isQueensSolverStateSolved,
  type QueensSolverStep,
  type QueensSolverState,
  runQueensSolverUntilStuck,
} from '../solver/stagedSolver';

export type GameMode = 'standard' | 'speed' | 'rotate';
export type { MarkType };

interface PuzzleRecord {
  id: string | number;
  name?: string;
  layout: string;
  queens: string;
  targetQueenCount?: number;
  orthogonalMinDistance?: number;
  minimumGroupSize?: number;
  difficulty?: QueensSelectionDifficulty;
}

interface QueensCampaignBucket {
  levelIndex: number;
  sizeKey: string;
  difficulty: QueensSelectionDifficulty;
  orthogonalMinDistance: number;
}

export interface QueensCampaignLevelEntry {
  levelNumber: number;
  boardSize: string;
  difficulty: QueensSelectionDifficulty;
  isLocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  bestTime: number | null;
  route: string;
  bucket: QueensCampaignBucket;
}

function buildSolverStateFromPuzzleRecord(puzzleData: PuzzleRecord): QueensSolverState {
  const gridSize = Math.sqrt(puzzleData.layout.length);
  const targetQueenCount =
    puzzleData.targetQueenCount ?? deriveTargetQueenCountFromQueensString(puzzleData.queens);
  const orthogonalMinDistance = puzzleData.orthogonalMinDistance ?? gridSize;
  const grid: GridSquare[][] = Array.from({ length: gridSize }, (_, row) =>
    Array.from({ length: gridSize }, (_, col) => {
      const index = row * gridSize + col;
      const symbol = puzzleData.layout[index];
      return {
        position: { row, col },
        groupColor: symbol === '.' ? undefined : symbol,
        isSolutionQueen: puzzleData.queens[index] === 'Q',
      };
    })
  );

  return {
    grid,
    gridSize,
    targetQueenCount,
    orthogonalMinDistance,
    playerMarks: Array.from({ length: gridSize }, () => Array<MarkType>(gridSize).fill(null)),
  };
}

function isPuzzleSolvableWithinDifficulty(
  puzzleData: PuzzleRecord,
  difficulty: QueensSelectionDifficulty
): boolean {
  const initialState = buildSolverStateFromPuzzleRecord(puzzleData);
  const maxSteps = Math.max(256, initialState.gridSize * initialState.gridSize * 4);
  const steps = runQueensSolverUntilStuck(initialState, maxSteps, difficulty);
  let playerMarks = initialState.playerMarks;

  for (const step of steps) {
    playerMarks = applyQueensSolverStep(
      {
        ...initialState,
        playerMarks,
      },
      step
    );
  }

  return isQueensSolverStateSolved({
    ...initialState,
    playerMarks,
  });
}

function isPerfectSquareLength(length: number): boolean {
  const root = Math.sqrt(length);
  return Number.isInteger(root);
}

function isDiagonalTouch(left: Pos, right: Pos): boolean {
  return Math.abs(left.row - right.row) === 1 && Math.abs(left.col - right.col) === 1;
}

function isOrthogonalConflict(left: Pos, right: Pos, orthogonalMinDistance: number): boolean {
  if (left.row === right.row) {
    return Math.abs(left.col - right.col) < orthogonalMinDistance;
  }
  if (left.col === right.col) {
    return Math.abs(left.row - right.row) < orthogonalMinDistance;
  }
  return false;
}

function deriveOrthogonalMinDistanceFromQueens(queens: Pos[], boardSize: number): number {
  let minimumSharedLineDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < queens.length; index++) {
    const left = queens[index];
    for (let nextIndex = index + 1; nextIndex < queens.length; nextIndex++) {
      const right = queens[nextIndex];
      if (left.row === right.row) {
        minimumSharedLineDistance = Math.min(
          minimumSharedLineDistance,
          Math.abs(left.col - right.col)
        );
      } else if (left.col === right.col) {
        minimumSharedLineDistance = Math.min(
          minimumSharedLineDistance,
          Math.abs(left.row - right.row)
        );
      }
    }
  }

  return Number.isFinite(minimumSharedLineDistance) ? minimumSharedLineDistance : boardSize;
}

function deriveTargetQueenCountFromQueensString(queens: string): number {
  let count = 0;
  for (const symbol of queens) {
    if (symbol === 'Q') count += 1;
  }
  return count;
}

function requiresLineCoverage(
  targetQueenCount: number,
  orthogonalMinDistance: number,
  boardSize: number
): boolean {
  return targetQueenCount === boardSize && orthogonalMinDistance >= boardSize;
}

type PuzzleDatabase = Record<string, PuzzleRecord[]>;
type PuzzleSelectionIndex = Record<string, PuzzleRecord[]>;
interface QueensCampaignCatalogEntry {
  sizeKey: string;
  difficulty: QueensSelectionDifficulty;
  orthogonalMinDistances: number[];
  count: number;
  path: string;
}

interface QueensCampaignCatalogGroup {
  sizeKey: string;
  difficulty: QueensSelectionDifficulty;
  orthogonalMinDistances: number[];
  paths: string[];
  count: number;
}

interface QueensStoryIndexEntry {
  levelIndex: number;
  sizeKey: string;
  difficulty: QueensSelectionDifficulty;
  orthogonalMinDistance: number;
  targetTimeSeconds?: number;
}

function normalizePuzzleDatabase(data: unknown): PuzzleDatabase {
  if (!data || typeof data !== 'object') return {};
  const normalized: PuzzleDatabase = {};

  for (const [sizeKey, value] of Object.entries(data as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    normalized[sizeKey] = value.filter(
      (puzzle): puzzle is PuzzleRecord =>
        !!puzzle && typeof puzzle === 'object' && 'layout' in puzzle && 'queens' in puzzle
    );
  }

  return normalized;
}

function mergePuzzleDatabases(...databases: PuzzleDatabase[]): PuzzleDatabase {
  const merged: PuzzleDatabase = {};

  for (const database of databases) {
    for (const [sizeKey, puzzles] of Object.entries(database)) {
      if (!merged[sizeKey]) {
        merged[sizeKey] = [];
      }
      merged[sizeKey].push(...puzzles);
    }
  }

  return merged;
}

function mergeCampaignCatalogEntries(
  ...catalogs: QueensCampaignCatalogEntry[][]
): Record<string, QueensCampaignCatalogGroup> {
  const merged: Record<string, QueensCampaignCatalogGroup> = {};

  for (const catalog of catalogs) {
    for (const entry of catalog) {
      const key = `${entry.sizeKey}|${entry.difficulty}`;
      const existing = merged[key];
      if (!existing) {
        merged[key] = {
          sizeKey: entry.sizeKey,
          difficulty: entry.difficulty,
          orthogonalMinDistances: [...entry.orthogonalMinDistances].sort((a, b) => a - b),
          paths: [entry.path],
          count: entry.count,
        };
        continue;
      }

      existing.orthogonalMinDistances = Array.from(
        new Set([...existing.orthogonalMinDistances, ...entry.orthogonalMinDistances])
      ).sort((a, b) => a - b);
      existing.paths = Array.from(new Set([...existing.paths, entry.path]));
      existing.count += entry.count;
    }
  }

  return merged;
}

function bucketKey(sizeKey: string, difficulty: QueensSelectionDifficulty): string {
  return `${sizeKey}|${difficulty}`;
}

export interface TutorialStep {
  id: string;
  instruction: string;
  targetSquare?: Pos | null; // Square to click (null means any square)
  action?: 'click' | 'place-flag' | 'place-queen' | 'complete' | 'mode-selected';
  validate?: (store: unknown) => boolean; // Custom validation function
}

type AutoFlagAnimationSource = 'blocked' | 'pattern';
type PlacementSource = 'player' | 'automation';

interface QueensState {
  grid: GridSquare[][];
  gridSize: number;
  targetQueenCount: number;
  orthogonalMinDistance: number;
  regionColorMode: QueensRegionColorMode;
  moveHistory: MarkType[][][];
  playerMarks: MarkType[][];
  puzzleDatabase: PuzzleDatabase | null;
  puzzleSelectionIndex: PuzzleSelectionIndex;
  campaignCatalogIndex: Record<string, QueensCampaignCatalogGroup>;
  campaignTargetTimeIndex: Record<string, number>;
  campaignBucketPuzzleCache: Record<string, PuzzleRecord[]>;
  allPuzzles: PuzzleRecord[]; // Flat array of all puzzles ending in -0
  puzzleIdMap: Map<string, PuzzleRecord>; // Map from string ID to puzzle
  tutorialPuzzles: PuzzleRecord[]; // Tutorial puzzles (level-1 through level-10)
  currentPuzzleIndex: number;
  isComplete: boolean;
  showSolution: boolean; // Whether to reveal the solution
  currentPuzzle: PuzzleRecord | null;
  currentPuzzleId: string | number | null; // Track current puzzle ID for completion tracking
  // Tutorial state
  isTutorialMode: boolean;
  tutorialSteps: TutorialStep[];
  currentTutorialStep: number;
  tutorialInstruction: string | null;
  lastClickedSquare: Pos | null;
  tutorialValidSquares: Pos[]; // Valid squares for current tutorial step
  shouldShakeToast: boolean; // Flag to trigger toast shake animation
  showErrorFeedback: boolean; // Flag to show error feedback (red X)
  errorFeedbackSquare: Pos | null; // Square to show error feedback on
  highlightToolSelector: boolean; // Flag to highlight tool selector in overlay
  // Current game mode
  currentMode: GameMode;
  // Loading state
  isLoadingPuzzles: boolean; // Whether puzzles are currently being loaded
  loadingProgress: number; // Progress percentage (0-100)
  loadingMessage: string; // Current loading message
  // UI state
  uiState: {
    placementMode: 'auto' | 'flag' | 'queen'; // 'auto', 'flag', or 'queen'
    autoFlagging: boolean; // Automatically flag blocked squares
  };
  // Error tracking for fully flagged groups/rows/columns
  errorSquares: Set<string>; // Set of "row,col" strings for squares that should be red
  flaggedGroupTimestamps: Map<string, number>; // Map of group key -> timestamp when it became fully flagged
  errorCheckInterval: number | null; // Interval ID for periodic error checking
  progressSaveInterval: number | null; // Interval ID for periodic progress saving
  // Error message toast
  errorMessage: string | null; // Current error message to display in toast
  errorMessageTimeout: number | null; // Timeout ID for auto-hiding error message
  // Puzzle timing (for individual puzzles, not speed mode)
  puzzleStartTime: number | null; // Timestamp when current puzzle started
  puzzleCompletionTime: number | null; // Completion time in seconds when puzzle was completed
  puzzleBestTime: number | null; // Best time for current puzzle size
  puzzleIsNewRecord: boolean; // Whether completion time is a new record
  recordsRefreshTrigger: number; // Timestamp to trigger reactivity when records are reset
  persistProgressEnabled: boolean; // Whether puzzle progress/history should persist to localStorage
  // Modal visibility state
  showSinglePuzzleModeModal: boolean;
  showRecordsModal: boolean;
  autoFlagAnimationCells: Set<string>;
  autoFlagAnimationSources: Map<string, AutoFlagAnimationSource>;
  autoFlagAnimationTimeouts: Map<string, number>;
  autoFlagComboCount: number;
  autoFlagComboTick: number;
  autoFlagComboTimeout: number | null;
  // Rotate mode state
  boardRotationCount: number; // 0-3, how many 90° CW rotations have been applied
  rotationHistory: number[]; // parallel to moveHistory, rotation count at each history save
  isSwipeActive: boolean; // whether a touch swipe is currently in progress
  swipePlacedFlags: boolean; // whether any flags were placed during the current swipe
  pendingRotateTimeout: number | null; // delayed rotate to avoid rotating mid-double-tap
  lastManualInteractionAt: number;
  diversityAverageBySize: Record<string, number>; // Average difference between any 2 originals by size
  recentPuzzleIdsBySize: Record<string, string[]>; // Recent puzzle history per size to avoid immediate repeats
  lastDiversitySelectionSummary: {
    sizeKey: string;
    averageDifference: number;
    requiredDifference: number;
    selectedDifference: number;
    usedFallbackPool: boolean;
    candidatesAboveThreshold: number;
  } | null;
  adminBoardMetadata: Record<string, string> | undefined;
  adminGenerationPhase: string | null;
  adminShowSolutionPreview: boolean;
  hintMessage: string | null;
  hintStep: QueensSolverStep | null;
  hintEvidenceCellKeys: Set<string>;
  hintOutputCellKeys: Set<string>;
  hintDisplayTimeout: number | null;
  isCampaignMode: boolean;
  currentCampaignBucket: QueensCampaignBucket | null;
  showCampaignIntroModal: boolean;
  isCampaignFullyComplete: boolean;
  campaignBucketCache: QueensCampaignBucket[] | null;
  campaignSolvabilityCache: Record<string, boolean>;
  campaignDifficultyCache: Record<string, QueensSelectionDifficulty | null>;
  storyUnlockedLevelIndex: number;
  storyPassedLevelBestTimes: Record<string, number>;
  storyLevelBestTimes: Record<string, number>;
  hasUsedCampaignHintThisAttempt: boolean;
  allowCampaignHintPassForTesting: boolean;
}

// LocalStorage key for completed puzzles
const COMPLETED_PUZZLES_KEY = 'queens-completed-puzzles';
// LocalStorage keys for speed mode records
const SPEED_MODE_2MIN_SEQUENTIAL_RECORD_KEY = 'queens-speed-mode-2min-sequential-record';
const SPEED_MODE_5MIN_SEQUENTIAL_RECORD_KEY = 'queens-speed-mode-5min-sequential-record';
const SPEED_MODE_2MIN_SIZE_RECORDS_KEY = 'queens-speed-mode-2min-size-records';
const SPEED_MODE_5MIN_SIZE_RECORDS_KEY = 'queens-speed-mode-5min-size-records';
// LocalStorage key for best times per size (individual puzzle completion)
const BEST_TIMES_PER_SIZE_KEY = 'queens-best-times-per-size';
// LocalStorage key prefix for puzzle progress
const PUZZLE_PROGRESS_KEY_PREFIX = 'queens-puzzle-progress-';
// LocalStorage key prefix for puzzle move history
const PUZZLE_HISTORY_KEY_PREFIX = 'queens-puzzle-history-';
const REGION_COLOR_MODE_KEY = 'queens-region-color-mode';
const ROTATE_DELAY_MS = 500;
const STORY_PROGRESS_KEY = 'queens-story-progress-v1';

interface QueensStoryProgress {
  unlockedLevelIndex: number;
  passedLevelBestTimes: Record<string, number>;
  levelBestTimes: Record<string, number>;
}

function calculateCampaignTargetTime(bucket: QueensCampaignBucket): number {
  const boardSize = Number.parseInt(bucket.sizeKey, 10);
  const baseSecondsBySize: Record<number, number> = {
    4: 30,
    5: 45,
    6: 60,
    7: 90,
    8: 120,
    9: 180,
    10: 240,
    11: 300,
  };
  const difficultyMultiplier: Record<QueensSelectionDifficulty, number> = {
    tutorial: 1,
    'extra-easy': 1.15,
    easy: 1.35,
    medium: 1.6,
    hard: 2,
    'extra-hard': 2.5,
  };
  const base = baseSecondsBySize[boardSize] ?? Math.max(30, boardSize * 30);
  return Math.round(base * difficultyMultiplier[bucket.difficulty]);
}

function buildCampaignBucketStorageKey(bucket: QueensCampaignBucket): string {
  return `${bucket.sizeKey}|${bucket.difficulty}`;
}

function buildSizeDifficultyRecordKey(
  sizeKey: string,
  difficulty: QueensSelectionDifficulty
): string {
  return `${sizeKey}|${difficulty}`;
}

function buildPuzzleSelectionIndex(database: PuzzleDatabase): PuzzleSelectionIndex {
  const index: PuzzleSelectionIndex = {};

  for (const [sizeKey, puzzles] of Object.entries(database)) {
    const boardSize = parseInt(sizeKey.split('x')[0], 10);
    for (const puzzle of puzzles) {
      const distance = puzzle.orthogonalMinDistance ?? boardSize;
      const difficulty = (puzzle.difficulty?.replace(/_/g, '-') ??
        'easy') as QueensSelectionDifficulty;
      const key = `${sizeKey}|${distance}|${difficulty}`;
      if (!index[key]) {
        index[key] = [];
      }
      index[key].push(puzzle);
    }
  }

  return index;
}

function getDefaultStoryProgress(): QueensStoryProgress {
  return {
    unlockedLevelIndex: 1,
    passedLevelBestTimes: {},
    levelBestTimes: {},
  };
}

function loadStoryProgress(): QueensStoryProgress {
  try {
    const stored = localStorage.getItem(STORY_PROGRESS_KEY);
    if (!stored) {
      return getDefaultStoryProgress();
    }

    const parsed = JSON.parse(stored) as Partial<QueensStoryProgress>;
    return {
      unlockedLevelIndex:
        typeof parsed.unlockedLevelIndex === 'number' && parsed.unlockedLevelIndex > 0
          ? parsed.unlockedLevelIndex
          : 1,
      passedLevelBestTimes:
        parsed.passedLevelBestTimes && typeof parsed.passedLevelBestTimes === 'object'
          ? parsed.passedLevelBestTimes
          : {},
      levelBestTimes:
        parsed.levelBestTimes && typeof parsed.levelBestTimes === 'object'
          ? parsed.levelBestTimes
          : {},
    };
  } catch (e) {
    console.error('Error reading story progress from localStorage:', e);
    return getDefaultStoryProgress();
  }
}

function saveStoryProgress(progress: QueensStoryProgress) {
  try {
    localStorage.setItem(STORY_PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Error saving story progress to localStorage:', e);
  }
}

function isQueensRegionColorMode(value: unknown): value is QueensRegionColorMode {
  return (
    value === 'repeat-base-colors' || value === 'shade-variants' || value === 'pattern-variants'
  );
}

function getStoredRegionColorMode(): QueensRegionColorMode {
  try {
    const stored = localStorage.getItem(REGION_COLOR_MODE_KEY);
    return isQueensRegionColorMode(stored) ? stored : 'pattern-variants';
  } catch (e) {
    console.error('Error reading region color mode from localStorage:', e);
    return 'pattern-variants';
  }
}

function saveRegionColorMode(mode: QueensRegionColorMode) {
  try {
    localStorage.setItem(REGION_COLOR_MODE_KEY, mode);
  } catch (e) {
    console.error('Error saving region color mode to localStorage:', e);
  }
}

function toAdminMarkType(mark: MarkType): QueensAdminMarkType {
  if (mark === 'queen') return 'QUEEN';
  if (mark === 'flag') return 'FLAG';
  if (mark === 'invalid') return 'INVALID';
  return 'NONE';
}

// Helper functions for localStorage
function getCompletedPuzzles(): Set<string> {
  try {
    const stored = localStorage.getItem(COMPLETED_PUZZLES_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (e) {
    console.error('Error reading completed puzzles from localStorage:', e);
  }
  return new Set();
}

function saveCompletedPuzzle(puzzleId: string) {
  try {
    const completed = getCompletedPuzzles();
    completed.add(puzzleId);
    localStorage.setItem(COMPLETED_PUZZLES_KEY, JSON.stringify(Array.from(completed)));
  } catch (e) {
    console.error('Error saving completed puzzle to localStorage:', e);
  }
}

function isPuzzleCompleted(puzzleId: string): boolean {
  return getCompletedPuzzles().has(puzzleId);
}

// Helper functions for speed mode records
function getSpeedModeRecord(
  timerDuration: number,
  isSequential: boolean,
  sizeKey?: string
): number {
  try {
    let key: string;
    if (isSequential) {
      key =
        timerDuration === 120
          ? SPEED_MODE_2MIN_SEQUENTIAL_RECORD_KEY
          : SPEED_MODE_5MIN_SEQUENTIAL_RECORD_KEY;
    } else {
      // Per-size record
      const recordsKey =
        timerDuration === 120 ? SPEED_MODE_2MIN_SIZE_RECORDS_KEY : SPEED_MODE_5MIN_SIZE_RECORDS_KEY;
      const stored = localStorage.getItem(recordsKey);
      if (stored && sizeKey) {
        const records = JSON.parse(stored);
        return records[sizeKey] || 0;
      }
      return 0;
    }

    const stored = localStorage.getItem(key);
    if (stored) {
      return parseInt(stored, 10);
    }
  } catch (e) {
    console.error('Error reading speed mode record from localStorage:', e);
  }
  return 0;
}

function getAllSpeedModeSizeRecords(timerDuration: number): Record<string, number> {
  try {
    const recordsKey =
      timerDuration === 120 ? SPEED_MODE_2MIN_SIZE_RECORDS_KEY : SPEED_MODE_5MIN_SIZE_RECORDS_KEY;
    const stored = localStorage.getItem(recordsKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading speed mode size records from localStorage:', e);
  }
  return {};
}

function getBestTimesPerSize(): Record<string, number> {
  try {
    const stored = localStorage.getItem(BEST_TIMES_PER_SIZE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading best times per size from localStorage:', e);
  }
  return {};
}

function saveBestTimesPerSize(times: Record<string, number>) {
  try {
    localStorage.setItem(BEST_TIMES_PER_SIZE_KEY, JSON.stringify(times));
  } catch (e) {
    console.error('Error saving best times per size to localStorage:', e);
  }
}

function updateBestTimeForSize(sizeKey: string, timeSeconds: number) {
  const bestTimes = getBestTimesPerSize();
  const currentBest = bestTimes[sizeKey];
  if (currentBest === undefined || timeSeconds < currentBest) {
    bestTimes[sizeKey] = timeSeconds;
    saveBestTimesPerSize(bestTimes);
    return true; // New record
  }
  return false; // Not a record
}

// Helper functions for puzzle progress
function getPuzzleProgressKey(puzzleId: string | number | null): string {
  if (puzzleId === null) return '';
  return `${PUZZLE_PROGRESS_KEY_PREFIX}${puzzleId}`;
}

function getPuzzleHistoryKey(puzzleId: string | number | null): string {
  if (puzzleId === null) return '';
  return `${PUZZLE_HISTORY_KEY_PREFIX}${puzzleId}`;
}

interface PuzzleProgress {
  playerMarks: MarkType[][];
  elapsedTimeSeconds?: number; // Time spent on puzzle so far
  startTimestamp?: number; // When puzzle was first started
}

function savePuzzleProgress(
  puzzleId: string | number | null,
  playerMarks: MarkType[][],
  puzzleStartTime: number | null
) {
  if (puzzleId === null) return;
  try {
    const key = getPuzzleProgressKey(puzzleId);
    const progress: PuzzleProgress = {
      playerMarks,
    };

    // Calculate and save elapsed time if puzzle has been started
    if (puzzleStartTime !== null) {
      const elapsedTimeSeconds = (Date.now() - puzzleStartTime) / 1000;
      progress.elapsedTimeSeconds = elapsedTimeSeconds;
      progress.startTimestamp = puzzleStartTime;
    }

    localStorage.setItem(key, JSON.stringify(progress));
  } catch (e) {
    console.error('Error saving puzzle progress to localStorage:', e);
  }
}

function savePuzzleHistory(puzzleId: string | number | null, moveHistory: MarkType[][][]) {
  if (puzzleId === null) return;
  try {
    const key = getPuzzleHistoryKey(puzzleId);
    localStorage.setItem(key, JSON.stringify(moveHistory));
  } catch (e) {
    console.error('Error saving puzzle history to localStorage:', e);
  }
}

function loadPuzzleProgress(puzzleId: string | number | null): PuzzleProgress | null {
  if (puzzleId === null) return null;
  try {
    const key = getPuzzleProgressKey(puzzleId);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle legacy format (just playerMarks array)
      if (Array.isArray(parsed)) {
        return { playerMarks: parsed };
      }
      // New format with timing data
      return parsed as PuzzleProgress;
    }
  } catch (e) {
    console.error('Error loading puzzle progress from localStorage:', e);
  }
  return null;
}

function loadPuzzleHistory(puzzleId: string | number | null): MarkType[][][] | null {
  if (puzzleId === null) return null;
  try {
    const key = getPuzzleHistoryKey(puzzleId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as MarkType[][][];
    }
  } catch (e) {
    console.error('Error loading puzzle history from localStorage:', e);
  }
  return null;
}

function clearPuzzleProgress(puzzleId: string | number | null) {
  if (puzzleId === null) return;
  try {
    const key = getPuzzleProgressKey(puzzleId);
    localStorage.removeItem(key);
    // Also clear history when clearing progress
    const historyKey = getPuzzleHistoryKey(puzzleId);
    localStorage.removeItem(historyKey);
  } catch (e) {
    console.error('Error clearing puzzle progress from localStorage:', e);
  }
}

export const useQueensStore = defineStore('queens', {
  state: (): QueensState => ({
    ...(() => {
      const storyProgress = loadStoryProgress();
      return {
        storyUnlockedLevelIndex: storyProgress.unlockedLevelIndex,
        storyPassedLevelBestTimes: storyProgress.passedLevelBestTimes,
        storyLevelBestTimes: storyProgress.levelBestTimes,
      };
    })(),
    grid: createEmptyGrid(4),
    gridSize: 4,
    targetQueenCount: 4,
    orthogonalMinDistance: 4,
    regionColorMode: getStoredRegionColorMode(),
    moveHistory: [],
    playerMarks: Array.from({ length: 4 }, () => Array(4).fill(null as MarkType)),
    puzzleDatabase: null,
    puzzleSelectionIndex: {},
    campaignCatalogIndex: {},
    campaignTargetTimeIndex: {},
    campaignBucketPuzzleCache: {},
    allPuzzles: [],
    puzzleIdMap: new Map<string, PuzzleRecord>(),
    tutorialPuzzles: [],
    currentPuzzleIndex: 0,
    isComplete: false,
    showSolution: false,
    currentPuzzle: null,
    currentPuzzleId: null,
    // Tutorial state
    isTutorialMode: false,
    tutorialSteps: [],
    currentTutorialStep: 0,
    tutorialInstruction: null,
    lastClickedSquare: null,
    tutorialValidSquares: [],
    shouldShakeToast: false,
    showErrorFeedback: false,
    errorFeedbackSquare: null,
    highlightToolSelector: false,
    // Current game mode
    currentMode: 'standard' as GameMode,
    // Loading state
    isLoadingPuzzles: false,
    loadingProgress: 0,
    loadingMessage: '',
    // UI state
    uiState: {
      placementMode: 'auto', // 'auto', 'flag', or 'queen'
      autoFlagging: true, // Automatically flag blocked squares
    },
    // Modal visibility state
    showSinglePuzzleModeModal: false,
    showRecordsModal: false,
    // Rotate mode state
    autoFlagAnimationCells: new Set<string>(),
    autoFlagAnimationSources: new Map<string, AutoFlagAnimationSource>(),
    autoFlagAnimationTimeouts: new Map<string, number>(),
    autoFlagComboCount: 0,
    autoFlagComboTick: 0,
    autoFlagComboTimeout: null,
    boardRotationCount: 0,
    rotationHistory: [],
    isSwipeActive: false,
    swipePlacedFlags: false,
    pendingRotateTimeout: null,
    lastManualInteractionAt: 0,
    // Error tracking
    errorSquares: new Set<string>(),
    flaggedGroupTimestamps: new Map<string, number>(),
    errorCheckInterval: null,
    progressSaveInterval: null,
    // Error message toast
    errorMessage: null,
    errorMessageTimeout: null,
    // Puzzle timing
    puzzleStartTime: null,
    puzzleCompletionTime: null,
    puzzleBestTime: null,
    puzzleIsNewRecord: false,
    recordsRefreshTrigger: 0,
    persistProgressEnabled: true,
    diversityAverageBySize: {},
    recentPuzzleIdsBySize: {},
    lastDiversitySelectionSummary: null,
    adminBoardMetadata: undefined,
    adminGenerationPhase: null,
    adminShowSolutionPreview: false,
    hintMessage: null,
    hintStep: null,
    hintEvidenceCellKeys: new Set<string>(),
    hintOutputCellKeys: new Set<string>(),
    hintDisplayTimeout: null,
    isCampaignMode: false,
    currentCampaignBucket: null,
    showCampaignIntroModal: false,
    isCampaignFullyComplete: false,
    campaignBucketCache: null,
    campaignSolvabilityCache: {},
    campaignDifficultyCache: {},
    hasUsedCampaignHintThisAttempt: false,
    allowCampaignHintPassForTesting: false,
  }),

  getters: {
    isSpeedMode: (state): boolean => state.currentMode === 'speed',
    isRotateMode: (state): boolean => state.currentMode === 'rotate',

    queenPositions: (state): Pos[] => {
      const positions: Pos[] = [];
      for (let row = 0; row < state.gridSize; row++) {
        for (let col = 0; col < state.gridSize; col++) {
          if (state.playerMarks[row][col] === 'queen') {
            positions.push({ row, col });
          }
        }
      }
      return positions;
    },

    solutionQueenPositions: (state): Pos[] => {
      const sol: Pos[] = [];
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          if (state.grid[r][c].isSolutionQueen) {
            sol.push({ row: r, col: c });
          }
        }
      }
      return sol;
    },

    isValidMove: (state) => (row: number, col: number) => {
      const square = state.grid[row][col];

      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          if (state.playerMarks[r][c] !== 'queen') continue;
          const queen = { row: r, col: c };
          const candidate = { row, col };
          if (isOrthogonalConflict(candidate, queen, state.orthogonalMinDistance)) {
            return false;
          }
          if (isDiagonalTouch(candidate, queen)) {
            return false;
          }
        }
      }

      // Check color group (if the square has a group color)
      if (square.groupColor) {
        for (let r = 0; r < state.gridSize; r++) {
          for (let c = 0; c < state.gridSize; c++) {
            if (
              state.playerMarks[r][c] === 'queen' &&
              state.grid[r][c].groupColor === square.groupColor
            ) {
              return false;
            }
          }
        }
      }

      return true;
    },

    // Format time in seconds to a readable string (with milliseconds)
    formatTime() {
      return (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const wholeSecs = Math.floor(secs);
        const milliseconds = Math.floor((secs - wholeSecs) * 100);

        if (minutes > 0) {
          return `${minutes}:${wholeSecs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        }
        return `${wholeSecs}.${milliseconds.toString().padStart(2, '0')}s`;
      };
    },

    // Get formatted puzzle completion time
    getFormattedPuzzleTime: (state): string | null => {
      if (state.puzzleCompletionTime === null) return null;
      const minutes = Math.floor(state.puzzleCompletionTime / 60);
      const secs = state.puzzleCompletionTime % 60;
      const wholeSecs = Math.floor(secs);
      const milliseconds = Math.floor((secs - wholeSecs) * 100);

      if (minutes > 0) {
        return `${minutes}:${wholeSecs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
      }
      return `${wholeSecs}.${milliseconds.toString().padStart(2, '0')}s`;
    },

    hasErrors: (state): boolean => {
      // Get solution queens
      const solutionQueens: Pos[] = [];
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          if (state.grid[r][c].isSolutionQueen) {
            solutionQueens.push({ row: r, col: c });
          }
        }
      }

      // Get player queens
      const playerQueens: Pos[] = [];
      for (let row = 0; row < state.gridSize; row++) {
        for (let col = 0; col < state.gridSize; col++) {
          if (state.playerMarks[row][col] === 'queen') {
            playerQueens.push({ row, col });
          }
        }
      }

      // Must have exactly the right number of queens
      if (playerQueens.length !== solutionQueens.length) {
        return false; // Not complete yet, so no errors to show
      }

      // Check if all player queens match solution queens
      const solutionSet = new Set(solutionQueens.map((q: Pos) => `${q.row},${q.col}`));
      for (const queen of playerQueens) {
        if (!solutionSet.has(`${queen.row},${queen.col}`)) {
          return true; // Found a queen in wrong position
        }
      }

      return false; // All queens match solution
    },

    isValidPuzzleState: (state): { isValid: boolean; errorMessage: string | null } => {
      // Get player queens
      const playerQueens: Pos[] = [];
      for (let row = 0; row < state.gridSize; row++) {
        for (let col = 0; col < state.gridSize; col++) {
          if (state.playerMarks[row][col] === 'queen') {
            playerQueens.push({ row, col });
          }
        }
      }

      const queenCount = playerQueens.length;
      const requiredQueens = state.targetQueenCount;

      // Check if we have the correct number of queens
      if (queenCount !== requiredQueens) {
        return {
          isValid: false,
          errorMessage: `Need ${requiredQueens} queens, but only ${queenCount} placed`,
        };
      }

      // Get solution queens
      const solutionQueens: Pos[] = [];
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          if (state.grid[r][c].isSolutionQueen) {
            solutionQueens.push({ row: r, col: c });
          }
        }
      }

      const solutionSet = new Set(solutionQueens.map((q: Pos) => `${q.row},${q.col}`));

      for (const queen of playerQueens) {
        if (!solutionSet.has(`${queen.row},${queen.col}`)) {
          return {
            isValid: false,
            errorMessage: 'Some queens are placed in incorrect positions',
          };
        }
      }

      return { isValid: true, errorMessage: null };
    },

    currentTutorialTarget: (state): Pos | null => {
      if (!state.isTutorialMode || state.currentTutorialStep >= state.tutorialSteps.length) {
        return null;
      }
      const step = state.tutorialSteps[state.currentTutorialStep];
      return step.targetSquare || null;
    },

    isSquareInError:
      (state) =>
      (row: number, col: number): boolean => {
        return state.errorSquares.has(`${row},${col}`);
      },
    isAutoFlagAnimating:
      (state) =>
      (row: number, col: number): boolean => {
        return state.autoFlagAnimationCells.has(`${row},${col}`);
      },
    getAutoFlagAnimationSource:
      (state) =>
      (row: number, col: number): AutoFlagAnimationSource | null => {
        return state.autoFlagAnimationSources.get(`${row},${col}`) ?? null;
      },
    isHintEvidenceCell:
      (state) =>
      (row: number, col: number): boolean => {
        return state.hintEvidenceCellKeys.has(`${row},${col}`);
      },
    isHintOutputCell:
      (state) =>
      (row: number, col: number): boolean => {
        return state.hintOutputCellKeys.has(`${row},${col}`);
      },
    nextCampaignBucket(state): QueensCampaignBucket | null {
      if (!state.currentCampaignBucket) return null;
      const buckets = (
        this as unknown as { getCampaignBuckets: () => QueensCampaignBucket[] }
      ).getCampaignBuckets();
      const currentIndex = buckets.findIndex(
        (bucket: QueensCampaignBucket) =>
          bucket.sizeKey === state.currentCampaignBucket?.sizeKey &&
          bucket.difficulty === state.currentCampaignBucket?.difficulty
      );
      return currentIndex >= 0 ? (buckets[currentIndex + 1] ?? null) : null;
    },
    canAdvanceCampaign(state): boolean {
      return (
        state.isCampaignMode &&
        state.isComplete &&
        this.hasPassedCurrentCampaignLevel &&
        !!this.nextCampaignBucket
      );
    },
    currentCampaignTargetTime(): number | null {
      if (!this.currentCampaignBucket) {
        return null;
      }
      return calculateCampaignTargetTime(this.currentCampaignBucket);
    },
    hasPassedCurrentCampaignLevel(): boolean {
      if (!this.currentCampaignBucket || this.puzzleCompletionTime === null) {
        return false;
      }
      if (this.hasUsedCampaignHintThisAttempt && !this.allowCampaignHintPassForTesting) {
        return false;
      }
      return this.puzzleCompletionTime <= calculateCampaignTargetTime(this.currentCampaignBucket);
    },
    currentCampaignLevelBestTime(): number | null {
      if (!this.currentCampaignBucket) {
        return null;
      }
      return (
        this.storyLevelBestTimes[buildCampaignBucketStorageKey(this.currentCampaignBucket)] ?? null
      );
    },
    currentCampaignPassedBestTime(): number | null {
      if (!this.currentCampaignBucket) {
        return null;
      }
      return (
        this.storyPassedLevelBestTimes[buildCampaignBucketStorageKey(this.currentCampaignBucket)] ??
        null
      );
    },
    minimumFlagOrthogonalDistance: (state): number | null => {
      const flags: Pos[] = [];
      for (let row = 0; row < state.gridSize; row++) {
        for (let col = 0; col < state.gridSize; col++) {
          if (state.playerMarks[row][col] === 'flag') {
            flags.push({ row, col });
          }
        }
      }

      if (flags.length < 2) return null;

      let minimumDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < flags.length; index++) {
        for (let nextIndex = index + 1; nextIndex < flags.length; nextIndex++) {
          const left = flags[index];
          const right = flags[nextIndex];
          if (left.row === right.row) {
            minimumDistance = Math.min(minimumDistance, Math.abs(left.col - right.col));
          } else if (left.col === right.col) {
            minimumDistance = Math.min(minimumDistance, Math.abs(left.row - right.row));
          }
        }
      }

      return Number.isFinite(minimumDistance) ? minimumDistance : null;
    },
  },

  actions: {
    normalizePuzzleDifficulty(
      rawDifficulty: string | null | undefined
    ): QueensSelectionDifficulty | undefined {
      if (!rawDifficulty) return undefined;
      const normalized = rawDifficulty.replace(/_/g, '-');
      return QUEENS_SELECTION_DIFFICULTY_ORDER.includes(normalized as QueensSelectionDifficulty)
        ? (normalized as QueensSelectionDifficulty)
        : undefined;
    },

    clearHintState() {
      this.hintMessage = null;
      this.hintStep = null;
      this.hintEvidenceCellKeys = new Set<string>();
      this.hintOutputCellKeys = new Set<string>();
      if (this.hintDisplayTimeout !== null) {
        clearTimeout(this.hintDisplayTimeout);
        this.hintDisplayTimeout = null;
      }
    },

    showHint(step: QueensSolverStep | null, message: string, durationMs: number = 4200) {
      this.clearHintState();
      this.hintStep = step;
      this.hintMessage = message;
      if (step) {
        this.hintEvidenceCellKeys = new Set(
          step.evidenceCells.map((cell) => `${cell.row},${cell.col}`)
        );
        this.hintOutputCellKeys = new Set(
          step.outputCells.map((cell) => `${cell.row},${cell.col}`)
        );
      }
      this.hintDisplayTimeout = window.setTimeout(() => {
        this.clearHintState();
      }, durationMs);
    },

    applyResolvedSolverStep(
      step: QueensSolverStep,
      applyStep: typeof import('../solver/stagedSolver').applyQueensSolverStep
    ) {
      this.saveToHistory();
      this.playerMarks = applyStep(
        {
          grid: this.grid,
          playerMarks: this.playerMarks,
          gridSize: this.gridSize,
          targetQueenCount: this.targetQueenCount,
          orthogonalMinDistance: this.orthogonalMinDistance,
        },
        step
      );
      if (this.persistProgressEnabled) {
        savePuzzleProgress(this.currentPuzzleId, this.playerMarks, this.puzzleStartTime);
        savePuzzleHistory(this.currentPuzzleId, this.moveHistory);
      }
      this.checkBoardCompletion();
      this.checkFullyFlaggedGroups();
    },

    async requestHint() {
      const { applyQueensSolverStep, getNextQueensSolverStep } = await import(
        '../solver/stagedSolver'
      );
      const maxDifficultyTier = this.currentPuzzle?.difficulty ?? 'unsolvable';
      const step = getNextQueensSolverStep(
        {
          grid: this.grid,
          playerMarks: this.playerMarks,
          gridSize: this.gridSize,
          targetQueenCount: this.targetQueenCount,
          orthogonalMinDistance: this.orthogonalMinDistance,
        },
        maxDifficultyTier
      );

      if (!step) {
        this.showHint(null, 'Nothing stands out yet.\nTry checking another part of the board.');
        return null;
      }

      if (this.isCampaignMode) {
        this.hasUsedCampaignHintThisAttempt = true;
      }
      this.applyResolvedSolverStep(step, applyQueensSolverStep);
      this.showHint(step, step.explanation);
      return step;
    },

    async loadCampaignCatalog() {
      if (Object.keys(this.campaignCatalogIndex).length > 0 && this.campaignBucketCache) {
        return true;
      }

      this.isLoadingPuzzles = true;
      this.loadingProgress = 0;
      this.loadingMessage = 'Loading story campaign...';

      try {
        const storyResponse = await fetch('/queens/catalog/story-index.json', {
          cache: 'no-store',
        });
        if (storyResponse.ok) {
          const payload = (await storyResponse.json()) as QueensStoryIndexEntry[];
          const storyBuckets: QueensCampaignBucket[] = [];
          const targetTimeIndex: Record<string, number> = {};

          for (const entry of payload) {
            const difficulty = this.normalizePuzzleDifficulty(entry.difficulty) ?? 'easy';
            const bucket: QueensCampaignBucket = {
              levelIndex: entry.levelIndex,
              sizeKey: entry.sizeKey,
              difficulty,
              orthogonalMinDistance: entry.orthogonalMinDistance,
            };
            storyBuckets.push(bucket);
            if (typeof entry.targetTimeSeconds === 'number') {
              targetTimeIndex[buildCampaignBucketStorageKey(bucket)] = entry.targetTimeSeconds;
            }
          }

          if (storyBuckets.length > 0) {
            this.campaignBucketCache = storyBuckets;
            this.campaignTargetTimeIndex = targetTimeIndex;
            this.loadingProgress = 100;
            this.loadingMessage = 'Story campaign ready';
            return true;
          }
        }

        const loadIndex = async (path: string): Promise<QueensCampaignCatalogEntry[]> => {
          const response = await fetch(path, { cache: 'no-store' });
          if (!response.ok) {
            if (response.status === 404) {
              return [];
            }
            throw new Error(`Failed to load ${path}: ${response.status}`);
          }
          const payload = (await response.json()) as QueensCampaignCatalogEntry[];
          return payload.map((entry) => ({
            ...entry,
            difficulty: this.normalizePuzzleDifficulty(entry.difficulty) ?? 'easy',
          }));
        };

        const [classicIndex, extendedIndex] = await Promise.all([
          loadIndex('/queens/catalog/classic-index.json'),
          loadIndex('/queens/catalog/extended-index.json'),
        ]);

        this.campaignCatalogIndex = mergeCampaignCatalogEntries(classicIndex, extendedIndex);
        if (Object.keys(this.campaignCatalogIndex).length === 0) {
          return this.loadPuzzleDatabase();
        }
        this.campaignBucketCache = await this.buildCampaignBucketsFromCatalog();
        this.loadingProgress = 100;
        this.loadingMessage = 'Story campaign ready';
        return true;
      } catch (error) {
        console.error('[queensStore] Error loading campaign catalog:', error);
        return false;
      } finally {
        this.isLoadingPuzzles = false;
        this.loadingProgress = 0;
        this.loadingMessage = '';
      }
    },

    async loadCampaignBucketPuzzles(
      sizeKey: string,
      difficulty: QueensSelectionDifficulty
    ): Promise<PuzzleRecord[]> {
      const bucketKey = `${sizeKey}|${difficulty}`;
      const cached = this.campaignBucketPuzzleCache[bucketKey];
      if (cached) {
        return cached;
      }

      const group = this.campaignCatalogIndex[bucketKey];
      if (!group) {
        const loaded = await this.ensureSelectionCatalogLoaded();
        if (!loaded) {
          return [];
        }
      }

      const resolvedGroup = this.campaignCatalogIndex[bucketKey];
      if (!resolvedGroup) {
        return [];
      }

      const responses = await Promise.all(
        resolvedGroup.paths.map(async (path) => {
          const response = await fetch(path, { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(`Failed to load ${path}: ${response.status}`);
          }
          return normalizePuzzleDatabase(await response.json());
        })
      );

      const merged = mergePuzzleDatabases(...responses);
      const puzzles = merged[sizeKey] ?? [];
      this.campaignBucketPuzzleCache = {
        ...this.campaignBucketPuzzleCache,
        [bucketKey]: puzzles,
      };
      return puzzles;
    },

    async ensureSelectionCatalogLoaded() {
      if (Object.keys(this.campaignCatalogIndex).length > 0) {
        return true;
      }

      try {
        const loadIndex = async (path: string): Promise<QueensCampaignCatalogEntry[]> => {
          const response = await fetch(path, { cache: 'no-store' });
          if (!response.ok) {
            if (response.status === 404) {
              return [];
            }
            throw new Error(`Failed to load ${path}: ${response.status}`);
          }
          const payload = (await response.json()) as QueensCampaignCatalogEntry[];
          return payload.map((entry) => ({
            ...entry,
            difficulty: this.normalizePuzzleDifficulty(entry.difficulty) ?? 'easy',
          }));
        };

        const [classicIndex, extendedIndex] = await Promise.all([
          loadIndex('/queens/catalog/classic-index.json'),
          loadIndex('/queens/catalog/extended-index.json'),
        ]);

        this.campaignCatalogIndex = mergeCampaignCatalogEntries(classicIndex, extendedIndex);
        return Object.keys(this.campaignCatalogIndex).length > 0;
      } catch (error) {
        console.error('[queensStore] Error loading selection catalog:', error);
        return false;
      }
    },

    async buildCampaignBucketsFromCatalog(): Promise<QueensCampaignBucket[]> {
      const sizeKeys = Array.from(
        new Set(Object.values(this.campaignCatalogIndex).map((entry) => entry.sizeKey))
      ).sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10));

      const buckets: QueensCampaignBucket[] = [];
      let levelIndex = 0;
      for (const difficulty of QUEENS_SELECTION_DIFFICULTY_ORDER) {
        for (const sizeKey of sizeKeys) {
          const group = this.campaignCatalogIndex[`${sizeKey}|${difficulty}`];
          if (!group) continue;

          const boardSize = Number.parseInt(sizeKey, 10);
          const orthogonalMinDistance = group.orthogonalMinDistances.includes(boardSize)
            ? boardSize
            : (group.orthogonalMinDistances[0] ?? null);
          if (orthogonalMinDistance == null) continue;

          const puzzles = await this.loadCampaignBucketPuzzles(sizeKey, difficulty);
          const hasPlayablePuzzle = puzzles
            .filter(
              (puzzle) => (puzzle.orthogonalMinDistance ?? boardSize) === orthogonalMinDistance
            )
            .some((puzzle) => this.isCampaignPuzzleSolvable(puzzle, difficulty));
          if (!hasPlayablePuzzle) continue;

          levelIndex += 1;
          buckets.push({
            levelIndex,
            sizeKey,
            difficulty,
            orthogonalMinDistance,
          });
        }
      }

      return buckets;
    },

    getPreferredCampaignDistance(
      sizeKey: string,
      difficulty: QueensSelectionDifficulty
    ): number | null {
      const catalogGroup = this.campaignCatalogIndex[`${sizeKey}|${difficulty}`];
      if (!this.puzzleDatabase && catalogGroup) {
        const boardSize = Number.parseInt(sizeKey, 10);
        if (catalogGroup.orthogonalMinDistances.length === 0) {
          return null;
        }
        return catalogGroup.orthogonalMinDistances.includes(boardSize)
          ? boardSize
          : catalogGroup.orthogonalMinDistances[0];
      }

      const distances = this.getAvailableOrthogonalDistancesForSize(sizeKey);
      const boardSize = Number.parseInt(sizeKey, 10);
      const matching = distances.filter(
        (distance) => this.getPuzzlesForSelection(sizeKey, distance, difficulty).length > 0
      );
      if (matching.length === 0) return null;
      return matching.includes(boardSize) ? boardSize : matching[0];
    },

    isCampaignPuzzleSolvable(
      puzzleData: PuzzleRecord,
      difficulty: QueensSelectionDifficulty
    ): boolean {
      const key = `${String(puzzleData.id)}|${difficulty}`;
      const cached = this.campaignSolvabilityCache[key];
      if (cached !== undefined) {
        return cached;
      }

      const solvable = isPuzzleSolvableWithinDifficulty(puzzleData, difficulty);
      this.campaignSolvabilityCache = {
        ...this.campaignSolvabilityCache,
        [key]: solvable,
      };
      return solvable;
    },

    getCampaignDifficultyForPuzzle(puzzleData: PuzzleRecord): QueensSelectionDifficulty | null {
      const key = String(puzzleData.id);
      const cached = this.campaignDifficultyCache[key];
      if (cached !== undefined) {
        return cached;
      }

      const derivedDifficulty =
        QUEENS_SELECTION_DIFFICULTY_ORDER.find((difficulty) =>
          this.isCampaignPuzzleSolvable(puzzleData, difficulty)
        ) ?? null;

      this.campaignDifficultyCache = {
        ...this.campaignDifficultyCache,
        [key]: derivedDifficulty,
      };

      return derivedDifficulty;
    },

    getCampaignBuckets(): QueensCampaignBucket[] {
      if (this.campaignBucketCache) {
        return this.campaignBucketCache;
      }

      if (!this.puzzleDatabase && Object.keys(this.campaignCatalogIndex).length > 0) {
        return [];
      }

      const buckets: QueensCampaignBucket[] = [];
      let levelIndex = 0;
      for (const difficulty of QUEENS_SELECTION_DIFFICULTY_ORDER) {
        for (const sizeKey of this.getAvailableSizes()) {
          const orthogonalMinDistance = this.getPreferredCampaignDistance(sizeKey, difficulty);
          if (orthogonalMinDistance == null) continue;
          const hasPlayablePuzzle = this.getPuzzlesForSelection(
            sizeKey,
            orthogonalMinDistance,
            difficulty
          ).some((puzzle) => this.isCampaignPuzzleSolvable(puzzle, difficulty));
          if (!hasPlayablePuzzle) continue;
          levelIndex += 1;
          buckets.push({
            levelIndex,
            sizeKey,
            difficulty,
            orthogonalMinDistance,
          });
        }
      }
      this.campaignBucketCache = buckets;
      return buckets;
    },

    getCampaignBucketByRoute(
      sizeKey: string,
      difficulty: QueensSelectionDifficulty
    ): QueensCampaignBucket | null {
      return (
        this.getCampaignBuckets().find(
          (bucket) => bucket.sizeKey === sizeKey && bucket.difficulty === difficulty
        ) ?? null
      );
    },

    getCampaignBucketKey(bucket: QueensCampaignBucket): string {
      return buildCampaignBucketStorageKey(bucket);
    },

    getBestTimeRecordKey(
      sizeKey: string,
      difficulty: QueensSelectionDifficulty | null | undefined
    ): string | null {
      if (!difficulty) {
        return null;
      }
      return buildSizeDifficultyRecordKey(sizeKey, difficulty);
    },

    getCampaignTargetTime(bucket: QueensCampaignBucket): number {
      return (
        this.campaignTargetTimeIndex[buildCampaignBucketStorageKey(bucket)] ??
        calculateCampaignTargetTime(bucket)
      );
    },

    getCampaignBucketBestTime(bucket: QueensCampaignBucket): number | null {
      const key = this.getCampaignBucketKey(bucket);
      return this.storyLevelBestTimes[key] ?? null;
    },

    getCampaignBucketPassedBestTime(bucket: QueensCampaignBucket): number | null {
      const key = this.getCampaignBucketKey(bucket);
      return this.storyPassedLevelBestTimes[key] ?? null;
    },

    getBestTimeForSizeAndDifficulty(
      sizeKey: string,
      difficulty: QueensSelectionDifficulty | null | undefined
    ): number | null {
      const key = this.getBestTimeRecordKey(sizeKey, difficulty);
      if (!key) {
        return null;
      }
      return this.storyLevelBestTimes[key] ?? null;
    },

    isCampaignBucketPassed(bucket: QueensCampaignBucket): boolean {
      return this.getCampaignBucketPassedBestTime(bucket) !== null;
    },

    syncStoryProgressState() {
      const progress = loadStoryProgress();
      this.storyUnlockedLevelIndex = progress.unlockedLevelIndex;
      this.storyPassedLevelBestTimes = progress.passedLevelBestTimes;
      this.storyLevelBestTimes = progress.levelBestTimes;
    },

    persistStoryProgress() {
      saveStoryProgress({
        unlockedLevelIndex: this.storyUnlockedLevelIndex,
        passedLevelBestTimes: this.storyPassedLevelBestTimes,
        levelBestTimes: this.storyLevelBestTimes,
      });
    },

    recordCampaignLevelResult(bucket: QueensCampaignBucket, completionTimeSeconds: number) {
      const key = this.getCampaignBucketKey(bucket);
      const existingLevelBest = this.storyLevelBestTimes[key];
      const nextLevelBest =
        existingLevelBest == null
          ? completionTimeSeconds
          : Math.min(existingLevelBest, completionTimeSeconds);

      this.storyLevelBestTimes = {
        ...this.storyLevelBestTimes,
        [key]: nextLevelBest,
      };

      const targetTime = this.getCampaignTargetTime(bucket);
      const canPass =
        completionTimeSeconds <= targetTime &&
        (!this.hasUsedCampaignHintThisAttempt || this.allowCampaignHintPassForTesting);

      if (!canPass) {
        this.persistStoryProgress();
        return false;
      }

      const existingBest = this.storyPassedLevelBestTimes[key];
      const nextBest =
        existingBest == null
          ? completionTimeSeconds
          : Math.min(existingBest, completionTimeSeconds);

      this.storyPassedLevelBestTimes = {
        ...this.storyPassedLevelBestTimes,
        [key]: nextBest,
      };
      this.storyUnlockedLevelIndex = Math.max(
        this.storyUnlockedLevelIndex,
        Math.min(bucket.levelIndex + 1, this.getCampaignBuckets().length)
      );
      this.persistStoryProgress();
      return true;
    },

    isCampaignBucketCompleted(bucket: QueensCampaignBucket): boolean {
      return this.isCampaignBucketPassed(bucket);
    },

    getCurrentCampaignProgressBucket(): QueensCampaignBucket | null {
      const buckets = this.getCampaignBuckets();
      if (buckets.length === 0) {
        return null;
      }

      const firstIncompleteBucket = buckets.find((bucket) => !this.isCampaignBucketPassed(bucket));
      return firstIncompleteBucket ?? buckets[buckets.length - 1] ?? null;
    },

    isCampaignBucketUnlocked(bucket: QueensCampaignBucket): boolean {
      return bucket.levelIndex <= this.storyUnlockedLevelIndex;
    },

    getCampaignLevelEntries(): QueensCampaignLevelEntry[] {
      const buckets = this.getCampaignBuckets();
      const currentProgressBucket = this.getCurrentCampaignProgressBucket();

      return buckets.map((bucket) => ({
        levelNumber: bucket.levelIndex,
        boardSize: bucket.sizeKey,
        difficulty: bucket.difficulty,
        isLocked: !this.isCampaignBucketUnlocked(bucket),
        isCompleted: this.isCampaignBucketPassed(bucket),
        isCurrent:
          currentProgressBucket != null &&
          currentProgressBucket.levelIndex === bucket.levelIndex &&
          currentProgressBucket.sizeKey === bucket.sizeKey &&
          currentProgressBucket.difficulty === bucket.difficulty,
        bestTime: this.getCampaignBucketBestTime(bucket),
        route: `/queens/campaign/${bucket.sizeKey}/${bucket.difficulty}`,
        bucket,
      }));
    },

    async selectCampaignPuzzle(bucket: QueensCampaignBucket): Promise<PuzzleRecord> {
      const boardSize = Number.parseInt(bucket.sizeKey, 10);
      const candidates = this.puzzleDatabase
        ? this.getPuzzlesForSelection(
            bucket.sizeKey,
            bucket.orthogonalMinDistance,
            bucket.difficulty
          )
        : (await this.loadCampaignBucketPuzzles(bucket.sizeKey, bucket.difficulty)).filter(
            (puzzle) => (puzzle.orthogonalMinDistance ?? boardSize) === bucket.orthogonalMinDistance
          );
      const solvableCandidates = this.puzzleDatabase
        ? candidates.filter((candidate) =>
            this.isCampaignPuzzleSolvable(candidate, bucket.difficulty)
          )
        : candidates;

      const puzzle = this.chooseNextDiversePuzzleFromCandidates(
        `campaign|${bucket.sizeKey}|d${bucket.orthogonalMinDistance}|${bucket.difficulty}`,
        solvableCandidates,
        this.currentPuzzle
      );

      if (!puzzle) {
        throw new Error(`No campaign puzzle available for ${bucket.sizeKey} ${bucket.difficulty}`);
      }

      return puzzle;
    },

    async loadCampaignBucket(bucket: QueensCampaignBucket, options?: { showIntroModal?: boolean }) {
      const puzzle = await this.selectCampaignPuzzle(bucket);

      this.isCampaignMode = true;
      this.currentCampaignBucket = bucket;
      this.isCampaignFullyComplete = false;
      this.parsePuzzleData(puzzle);
      this.showCampaignIntroModal = options?.showIntroModal ?? true;
      return puzzle;
    },

    async loadCampaignPuzzle(sizeKey: string, difficulty: QueensSelectionDifficulty) {
      if (!this.puzzleDatabase && !this.campaignBucketCache) {
        const success = await this.loadCampaignCatalog();
        if (!success) {
          throw new Error('Failed to load campaign catalog');
        }
      }

      const bucket = this.getCampaignBucketByRoute(sizeKey, difficulty);
      if (!bucket) {
        throw new Error(`No campaign bucket found for ${sizeKey} ${difficulty}`);
      }
      this.syncStoryProgressState();
      if (!this.isCampaignBucketUnlocked(bucket)) {
        const fallbackBucket =
          this.getCurrentCampaignProgressBucket() ?? this.getCampaignBuckets()[0];
        if (!fallbackBucket) {
          throw new Error('No campaign buckets are available');
        }
        await router.replace(
          `/queens/campaign/${fallbackBucket.sizeKey}/${fallbackBucket.difficulty}`
        );
        return this.loadCampaignBucket(fallbackBucket, { showIntroModal: true });
      }
      return this.loadCampaignBucket(bucket, { showIntroModal: true });
    },

    closeCampaignIntroModal() {
      this.showCampaignIntroModal = false;
    },

    async beginCampaignRun(options?: { showIntroModal?: boolean }) {
      if (!this.puzzleDatabase && !this.campaignBucketCache) {
        const success = await this.loadCampaignCatalog();
        if (!success) {
          throw new Error('Failed to load campaign catalog');
        }
      }

      this.syncStoryProgressState();
      const currentBucket = this.getCurrentCampaignProgressBucket();
      if (!currentBucket) {
        throw new Error('No campaign buckets are available');
      }

      this.currentMode = 'standard';
      this.isTutorialMode = false;
      this.isCampaignFullyComplete = false;
      return this.loadCampaignBucket(currentBucket, {
        showIntroModal: options?.showIntroModal ?? true,
      });
    },

    async advanceCampaign(options?: { showIntroModal?: boolean }) {
      if (!this.isCampaignMode || !this.currentCampaignBucket) {
        throw new Error('Campaign mode is not active');
      }
      if (!this.isComplete) {
        throw new Error('Current campaign puzzle is not complete');
      }
      if (!this.hasPassedCurrentCampaignLevel) {
        throw new Error('Current campaign level has not been passed yet');
      }

      const nextBucket = this.nextCampaignBucket;
      if (!nextBucket) {
        this.isCampaignFullyComplete = true;
        this.showCampaignIntroModal = false;
        return null;
      }

      return this.loadCampaignBucket(nextBucket, {
        showIntroModal: options?.showIntroModal ?? true,
      });
    },

    async startCampaign() {
      this.syncStoryProgressState();
      const currentBucket = this.getCurrentCampaignProgressBucket();
      if (!currentBucket) {
        throw new Error('No campaign buckets are available');
      }
      await router.push(`/queens/campaign/${currentBucket.sizeKey}/${currentBucket.difficulty}`);
    },

    async applyHintsUntilSolved(maxHints: number = 512) {
      let appliedHints = 0;
      while (!this.isComplete && appliedHints < maxHints) {
        const step = await this.requestHint();
        if (!step) {
          break;
        }
        appliedHints += 1;
      }
      return {
        appliedHints,
        solved: this.isComplete,
        hintStep: this.hintStep,
      };
    },

    clearAutoFlagAnimations() {
      for (const timeoutId of this.autoFlagAnimationTimeouts.values()) {
        clearTimeout(timeoutId);
      }
      this.autoFlagAnimationCells = new Set<string>();
      this.autoFlagAnimationSources = new Map<string, AutoFlagAnimationSource>();
      this.autoFlagAnimationTimeouts = new Map<string, number>();

      if (this.autoFlagComboTimeout !== null) {
        clearTimeout(this.autoFlagComboTimeout);
        this.autoFlagComboTimeout = null;
      }
      this.autoFlagComboCount = 0;
    },

    triggerAutoFlagAnimation(
      row: number,
      col: number,
      source: AutoFlagAnimationSource = 'blocked',
      delayMs = 0
    ) {
      const key = `${row},${col}`;
      const existingTimeout = this.autoFlagAnimationTimeouts.get(key);
      if (existingTimeout !== undefined) {
        clearTimeout(existingTimeout);
        this.autoFlagAnimationTimeouts.delete(key);
      }

      const activate = () => {
        this.autoFlagAnimationCells.add(key);
        this.autoFlagAnimationSources.set(key, source);

        const timeoutId = window.setTimeout(() => {
          this.autoFlagAnimationCells.delete(key);
          this.autoFlagAnimationSources.delete(key);
          this.autoFlagAnimationTimeouts.delete(key);
        }, 360);

        this.autoFlagAnimationTimeouts.set(key, timeoutId);
      };

      if (delayMs > 0) {
        window.setTimeout(activate, delayMs);
        return;
      }
      activate();
    },

    showAutoFlagCombo(count: number) {
      if (count <= 0) {
        return;
      }

      this.autoFlagComboCount = count;
      this.autoFlagComboTick += 1;

      if (this.autoFlagComboTimeout !== null) {
        clearTimeout(this.autoFlagComboTimeout);
      }

      this.autoFlagComboTimeout = window.setTimeout(() => {
        this.autoFlagComboCount = 0;
        this.autoFlagComboTimeout = null;
      }, 950);
    },

    initializeGrid() {
      // Stop error checking and progress saving
      this.stopErrorChecking();
      this.stopProgressSaving();
      this.clearAutoFlagAnimations();
      this.clearPendingRotateTimeout();
      this.clearHintState();

      this.grid = createEmptyGrid(this.gridSize);
      this.moveHistory = [];
      this.isComplete = false;
      this.showSolution = false;
      this.playerMarks = Array.from({ length: this.gridSize }, () =>
        Array(this.gridSize).fill(null as MarkType)
      );
      // Reset puzzle timing
      this.puzzleStartTime = null;
      this.puzzleCompletionTime = null;
      this.puzzleBestTime = null;
      this.puzzleIsNewRecord = false;
      this.hasUsedCampaignHintThisAttempt = false;

      // Reset rotation state (keep isRotateMode, but reset per-puzzle rotation tracking)
      this.boardRotationCount = 0;
      this.rotationHistory = [];
      this.isSwipeActive = false;
      this.swipePlacedFlags = false;
      this.showCampaignIntroModal = false;
      this.isCampaignFullyComplete = false;

      // Start error checking
      this.startErrorChecking();
    },

    refreshRegionAppearances() {
      this.grid = assignRegionPaletteColors(this.grid, this.regionColorMode);
    },

    hydrateFromAdminBoard(
      boardState: QueensAdminBoardState,
      options?: {
        showSolutionQueens?: boolean;
        resetHistory?: boolean;
      }
    ) {
      const showSolutionQueens = options?.showSolutionQueens ?? true;
      const nextGrid = assignRegionPaletteColors(
        boardState.cells.map((row) =>
          row.map((cell) => ({
            position: { row: cell.row, col: cell.col },
            groupColor: cell.groupColor ?? undefined,
            isSolutionQueen: cell.isSolutionQueen,
          }))
        ),
        this.regionColorMode
      );

      const nextMarks = boardState.cells.map((row) =>
        row.map((cell) => {
          if (cell.markType === 'FLAG') return 'flag';
          if (cell.markType === 'INVALID') return 'invalid';
          if (cell.markType === 'QUEEN') {
            return 'queen';
          }
          return null;
        })
      );

      this.clearPendingRotateTimeout();
      this.grid = nextGrid;
      this.gridSize = boardState.size;
      this.playerMarks = nextMarks;
      this.targetQueenCount = Number(boardState.metadata?.targetQueenCount ?? boardState.size);
      this.orthogonalMinDistance = Number(
        boardState.metadata?.orthogonalMinDistance ?? boardState.size
      );
      this.adminBoardMetadata = boardState.metadata;
      this.adminGenerationPhase = boardState.generationPhase;
      this.adminShowSolutionPreview = showSolutionQueens;
      this.showSolution = showSolutionQueens;
      this.persistProgressEnabled = false;
      this.currentPuzzle = null;
      this.currentPuzzleId = null;
      this.isTutorialMode = false;
      this.showErrorFeedback = false;
      this.errorFeedbackSquare = null;
      this.errorSquares = new Set();
      this.errorMessage = null;
      this.clearHintState();
      this.isComplete = false;
      this.boardRotationCount = 0;
      this.rotationHistory = [];
      this.isSwipeActive = false;
      this.swipePlacedFlags = false;

      if (options?.resetHistory !== false) {
        this.moveHistory = [];
      }
    },

    exportAdminBoardState(): QueensAdminBoardState {
      return {
        size: this.gridSize,
        cells: this.grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => ({
            row: rowIndex,
            col: colIndex,
            groupColor: cell.groupColor ?? null,
            isSolutionQueen: cell.isSolutionQueen === true,
            markType: toAdminMarkType(this.playerMarks[rowIndex][colIndex]),
          }))
        ),
        generationPhase: this.adminGenerationPhase,
        metadata: this.adminBoardMetadata,
      };
    },

    applyAdminBoardResult(
      boardState: QueensAdminBoardState,
      options?: {
        showSolutionQueens?: boolean;
        saveHistory?: boolean;
      }
    ) {
      if (options?.saveHistory !== false) {
        this.saveToHistory();
      }
      this.hydrateFromAdminBoard(boardState, {
        showSolutionQueens: options?.showSolutionQueens,
        resetHistory: false,
      });
    },

    clearAdminMarks() {
      this.saveToHistory();
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.playerMarks[row][col] = null;
        }
      }
      this.isComplete = false;
      this.showSolution = false;
      this.adminShowSolutionPreview = false;
      this.showErrorFeedback = false;
      this.errorFeedbackSquare = null;
      this.errorSquares = new Set();
      this.errorMessage = null;
    },

    saveToHistory() {
      this.moveHistory.push(clonePlayerMarks(this.playerMarks));
      if (this.isRotateMode) {
        this.rotationHistory.push(this.boardRotationCount);
      }
    },

    handleUndo() {
      this.clearPendingRotateTimeout();
      if (this.moveHistory.length > 0) {
        const lastPlayerMarks = this.moveHistory.pop();
        if (lastPlayerMarks) {
          // Clone the restored state to avoid reference issues
          this.playerMarks = clonePlayerMarks(lastPlayerMarks);

          // Restore grid rotation for rotate mode
          if (this.isRotateMode && this.rotationHistory.length > 0) {
            const targetRotation = this.rotationHistory.pop()!;
            const rotationsNeeded = (targetRotation - this.boardRotationCount + 4) % 4;
            for (let i = 0; i < rotationsNeeded; i++) {
              this.rotateGridOnly90CW();
            }
            this.boardRotationCount = targetRotation;
          }

          // If auto-flagging is enabled, recalculate flags based on current queens
          // updateBlockedMoves only flags unmarked squares, so it won't remove correct flags
          if (this.uiState.autoFlagging) {
            this.updateBlockedMoves();
          }

          // Save progress and history to localStorage after undo
          if (this.persistProgressEnabled) {
            savePuzzleProgress(this.currentPuzzleId, this.playerMarks, this.puzzleStartTime);
            savePuzzleHistory(this.currentPuzzleId, this.moveHistory);
          }

          // Clear error feedback when undoing
          this.showErrorFeedback = false;
          this.errorFeedbackSquare = null;

          // Check board completion after undo (might have restored a completed state)
          this.checkBoardCompletion();
        }
      }
    },

    placeFlag(row: number, col: number, source: PlacementSource = 'player') {
      // In rotate mode during a swipe, only save history once (for the first flag)
      if (!this.isRotateMode || !this.isSwipeActive || !this.swipePlacedFlags) {
        this.saveToHistory();
      }
      if (this.isRotateMode && this.isSwipeActive) {
        this.swipePlacedFlags = true;
      }
      this.playerMarks[row][col] = 'flag';
      // Save progress and history to localStorage
      if (this.persistProgressEnabled) {
        savePuzzleProgress(this.currentPuzzleId, this.playerMarks, this.puzzleStartTime);
        savePuzzleHistory(this.currentPuzzleId, this.moveHistory);
      }
      // Check for error conditions immediately
      this.checkFullyFlaggedGroups();
      // Rotate board if in rotate mode and not mid-swipe
      if (source === 'player' && this.isRotateMode && !this.isSwipeActive) {
        this.scheduleRotateAfterDelay();
      }
      return true;
    },

    placeQueen(row: number, col: number, source: PlacementSource = 'player') {
      this.saveToHistory();
      this.playerMarks[row][col] = 'queen';

      // Auto-flag blocked squares when placing a queen (if enabled)
      if (this.uiState.autoFlagging) {
        this.updateBlockedMoves();
      }

      // Save progress and history to localStorage
      if (this.persistProgressEnabled) {
        savePuzzleProgress(this.currentPuzzleId, this.playerMarks, this.puzzleStartTime);
        savePuzzleHistory(this.currentPuzzleId, this.moveHistory);
      }
      this.checkBoardCompletion();
      this.checkFullyFlaggedGroups();

      // Check tutorial step after placing queen
      if (this.isTutorialMode) {
        // Check if we've placed 3 queens (single-square colors)
        const queenCount = this.queenPositions.length;
        if (queenCount === 3) {
          // Find the step that should trigger after 3 queens
          const currentStepIndex = this.currentTutorialStep;
          const currentStep = this.tutorialSteps[currentStepIndex];

          // If we're on a place-queen step, advance to the "3 queens placed" message
          if (currentStep && currentStep.action === 'place-queen') {
            // Find the next step that's the "3 queens placed" message
            for (let i = currentStepIndex + 1; i < this.tutorialSteps.length; i++) {
              const step = this.tutorialSteps[i];
              if (step.id === 'three-queens-placed') {
                this.currentTutorialStep = i;
                this.updateTutorialInstruction();
                return;
              }
            }
          }
        }

        this.checkTutorialStep({ row, col }, 'place-queen');
      }

      // Rotate board if in rotate mode and puzzle not yet complete
      if (source === 'player' && this.isRotateMode && !this.isComplete) {
        this.scheduleRotateAfterDelay();
      }

      return true;
    },

    removeMark(row: number, col: number) {
      const wasQueen = this.playerMarks[row][col] === 'queen';

      if (wasQueen) {
        // Save current state to history FIRST, so we have the latest state before removal
        // This ensures we have all queens that were placed after the one we're removing
        this.saveToHistory();

        const result = removeQueenPlacement(
          this.moveHistory,
          row,
          col,
          this.grid,
          this.gridSize,
          this.uiState.autoFlagging
        );

        this.playerMarks = result.newBoard;
        this.moveHistory = result.newHistory;
      } else {
        this.saveToHistory();
        this.playerMarks[row][col] = null;
      }

      if (this.persistProgressEnabled) {
        savePuzzleProgress(this.currentPuzzleId, this.playerMarks, this.puzzleStartTime);
        savePuzzleHistory(this.currentPuzzleId, this.moveHistory);
      }
      this.checkFullyFlaggedGroups();
      this.checkBoardCompletion();
    },

    replayHistory(history: MarkType[][][]): MarkType[][] {
      return replayHistoryFromEntries(history, this.grid, this.gridSize, this.uiState.autoFlagging);
    },

    applyAutoFlagging(playerMarks: MarkType[][]) {
      // Flag all squares blocked by this queen
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          // Only flag squares that are currently unmarked
          if (playerMarks[r][c] === null) {
            // Check if this square is blocked by the queen
            if (!this.isValidMoveWithMarks(r, c, playerMarks)) {
              playerMarks[r][c] = 'flag';
            }
          }
        }
      }
    },

    isValidMoveWithMarks(row: number, col: number, playerMarks: MarkType[][]): boolean {
      const square = this.grid[row][col];

      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          if (playerMarks[r][c] !== 'queen') continue;
          const queen = { row: r, col: c };
          const candidate = { row, col };
          if (isOrthogonalConflict(candidate, queen, this.orthogonalMinDistance)) {
            return false;
          }
          if (isDiagonalTouch(candidate, queen)) {
            return false;
          }
        }
      }

      // Check color group (if the square has a group color)
      if (square.groupColor) {
        for (let r = 0; r < this.gridSize; r++) {
          for (let c = 0; c < this.gridSize; c++) {
            if (playerMarks[r][c] === 'queen' && this.grid[r][c].groupColor === square.groupColor) {
              return false;
            }
          }
        }
      }

      return true;
    },

    countFlags(playerMarks: MarkType[][]): number {
      let count = 0;
      for (let r = 0; r < playerMarks.length; r++) {
        for (let c = 0; c < playerMarks[r].length; c++) {
          if (playerMarks[r][c] === 'flag') count++;
        }
      }
      return count;
    },

    countQueens(playerMarks: MarkType[][]): number {
      let count = 0;
      for (let r = 0; r < playerMarks.length; r++) {
        for (let c = 0; c < playerMarks[r].length; c++) {
          if (playerMarks[r][c] === 'queen') count++;
        }
      }
      return count;
    },

    handleSquareClick(row: number, col: number) {
      this.lastManualInteractionAt = Date.now();
      if (this.isRotateMode) {
        // A new manual tap supersedes any queued rotate from a previous tap.
        this.clearPendingRotateTimeout();
      }
      // Track clicked square for tutorial
      this.lastClickedSquare = { row, col };

      // Clear any previous error feedback
      this.showErrorFeedback = false;
      this.errorFeedbackSquare = null;

      const mode = this.uiState.placementMode;
      const currentMark = this.playerMarks[row][col];

      // Handle clicks based on placement mode
      if (mode === 'flag') {
        // Flag mode: toggle flag only
        if (currentMark === null) {
          this.placeFlag(row, col);
        } else if (currentMark === 'flag') {
          this.removeMark(row, col);
        } else if (currentMark === 'queen') {
          // Remove queen first, then can place flag
          this.removeMark(row, col);
        }
        return;
      } else if (mode === 'queen') {
        // Queen mode: place or remove queen directly
        if (currentMark === null) {
          // In tutorial mode, check if this is a solution queen
          if (this.isTutorialMode) {
            const solutionQueens = this.solutionQueenPositions;
            const isSolutionQueen = solutionQueens.some(
              (queen) => queen.row === row && queen.col === col
            );

            if (!isSolutionQueen) {
              // Show error feedback
              this.showErrorFeedback = true;
              this.errorFeedbackSquare = { row, col };
              this.shakeToast();
              // Clear error feedback after 2 seconds
              setTimeout(() => {
                this.showErrorFeedback = false;
                this.errorFeedbackSquare = null;
              }, 2000);
              return;
            }
          }

          if (!this.isTutorialMode) {
            this.placeQueen(row, col);
          } else {
            if (this.isValidMove(row, col)) {
              this.placeQueen(row, col);
            } else {
              this.showErrorFeedback = true;
              this.errorFeedbackSquare = { row, col };
              this.shakeToast();
              setTimeout(() => {
                this.showErrorFeedback = false;
                this.errorFeedbackSquare = null;
              }, 2000);
            }
          }
        } else if (currentMark === 'queen') {
          // Remove queen
          this.removeMark(row, col);
        } else if (currentMark === 'flag') {
          // Remove flag and place queen if valid
          this.removeMark(row, col);
          if (!this.isTutorialMode || this.isValidMove(row, col)) {
            this.placeQueen(row, col);
          }
        }
        return;
      } else {
        // Auto mode: first click flag, second click queen, third click remove
        if (currentMark === null) {
          // First click: place flag
          this.placeFlag(row, col);
          // Check tutorial step completion
          if (this.isTutorialMode) {
            this.checkTutorialStep({ row, col }, 'place-flag');
          }
        } else if (currentMark === 'flag') {
          // Second click: place queen
          if (!this.isTutorialMode || this.isValidMove(row, col)) {
            this.placeQueen(row, col);
            if (this.isTutorialMode) {
              this.checkTutorialStep({ row, col }, 'place-queen');
            }
          } else if (this.isTutorialMode) {
            this.showErrorFeedback = true;
            this.errorFeedbackSquare = { row, col };
            this.shakeToast();
            setTimeout(() => {
              this.showErrorFeedback = false;
              this.errorFeedbackSquare = null;
            }, 2000);
          }
        } else if (currentMark === 'queen') {
          // Third click: remove mark
          this.removeMark(row, col);
        }
      }
    },

    checkBoardCompletion() {
      const queenCount = this.queenPositions.length;
      const requiredQueens = this.targetQueenCount;

      // First check: must have the correct number of queens
      if (queenCount !== requiredQueens) {
        this.isComplete = false;
        return;
      }

      // Second check: validate that all queens are in correct positions
      const validation = this.isValidPuzzleState;
      if (validation.isValid) {
        this.isComplete = true;

        // Stop periodic progress saving when puzzle is complete
        this.stopProgressSaving();

        // Calculate completion time and update records (only if not in speed mode)
        if (this.currentMode !== 'speed' && this.puzzleStartTime !== null) {
          const completionTimeSeconds = (Date.now() - this.puzzleStartTime) / 1000; // Store as decimal seconds
          this.puzzleCompletionTime = completionTimeSeconds;

          const sizeKey = `${this.gridSize}x${this.gridSize}`;
          const isNewRecord = updateBestTimeForSize(sizeKey, completionTimeSeconds);
          const levelDifficulty = this.currentPuzzle?.difficulty;
          const levelRecordKey = this.getBestTimeRecordKey(sizeKey, levelDifficulty);
          if (levelRecordKey) {
            const existingLevelBest = this.storyLevelBestTimes[levelRecordKey];
            const nextLevelBest =
              existingLevelBest == null
                ? completionTimeSeconds
                : Math.min(existingLevelBest, completionTimeSeconds);
            this.storyLevelBestTimes = {
              ...this.storyLevelBestTimes,
              [levelRecordKey]: nextLevelBest,
            };
            this.persistStoryProgress();
            this.puzzleBestTime = nextLevelBest;
            this.puzzleIsNewRecord =
              existingLevelBest == null || completionTimeSeconds <= existingLevelBest;
          } else {
            this.puzzleBestTime = getBestTimesPerSize()[sizeKey] || null;
            this.puzzleIsNewRecord = isNewRecord;
          }

          // Update best time display
          if (!levelRecordKey) {
            const bestTimes = getBestTimesPerSize();
            this.puzzleBestTime = bestTimes[sizeKey] || null;
          }
        }

        if (
          this.isCampaignMode &&
          this.currentCampaignBucket &&
          this.puzzleCompletionTime !== null
        ) {
          this.recordCampaignLevelResult(this.currentCampaignBucket, this.puzzleCompletionTime);
        }

        // Save completion to localStorage
        if (this.currentPuzzleId !== null) {
          const puzzleId =
            typeof this.currentPuzzleId === 'string'
              ? this.currentPuzzleId
              : String(this.currentPuzzleId);
          saveCompletedPuzzle(puzzleId);
          // Clear saved progress since puzzle is completed
          clearPuzzleProgress(this.currentPuzzleId);
        }
        // Check tutorial completion step
        if (this.isTutorialMode) {
          this.checkTutorialStep(null, 'complete');
        }
        // Handle speed mode completion
        if (this.currentMode === 'speed') {
          useSpeedModeStore().onPuzzleComplete();
        }
        // Don't reveal solution - just mark as complete
      } else {
        // Has errors - don't complete, but keep the error state
        this.isComplete = false;
      }
    },

    async loadPuzzleDatabase() {
      this.isLoadingPuzzles = true;
      this.loadingProgress = 0;
      this.loadingMessage = 'Loading puzzle database...';

      try {
        this.puzzleDatabase = normalizePuzzleDatabase(
          await loadMergedQueensPuzzleCatalog('no-store')
        );
        this.puzzleSelectionIndex = buildPuzzleSelectionIndex(this.puzzleDatabase);
        this.puzzleIdMap = new Map<string, PuzzleRecord>(); // optional cache; stays empty for now
        this.allPuzzles = []; // not needed anymore, but keep type happy
        this.diversityAverageBySize = {}; // recompute averages lazily after a new database load
        this.campaignBucketCache = null;
        this.campaignSolvabilityCache = {};

        this.loadingProgress = 100;
        this.loadingMessage = 'Puzzles loaded';

        await new Promise((resolve) => setTimeout(resolve, 200));

        this.isLoadingPuzzles = false;
        this.loadingProgress = 0;
        this.loadingMessage = '';

        return true;
      } catch (error) {
        console.error('[queensStore] Error loading puzzle database:', error);
        this.isLoadingPuzzles = false;
        this.loadingProgress = 0;
        this.loadingMessage = '';
        return false;
      }
    },

    parsePuzzleData(puzzleData: PuzzleRecord, options?: { persistProgress?: boolean }) {
      this.persistProgressEnabled = options?.persistProgress ?? true;
      this.clearHintState();

      const gridSize = Math.sqrt(puzzleData.layout.length);
      this.gridSize = gridSize;
      this.targetQueenCount =
        puzzleData.targetQueenCount ?? deriveTargetQueenCountFromQueensString(puzzleData.queens);
      this.orthogonalMinDistance = puzzleData.orthogonalMinDistance ?? gridSize;
      const layout = puzzleData.layout;
      const queens = puzzleData.queens;

      // Initialize grid
      this.initializeGrid();

      // Set current puzzle ID for progress tracking
      this.currentPuzzleId = puzzleData.name || puzzleData.id;

      // Parse layout. Any non-dot symbol is treated as a stable region id.
      for (let i = 0; i < layout.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const symbol = layout[i];

        if (symbol !== '.') {
          this.grid[row][col].groupColor = symbol;
        }
      }

      this.refreshRegionAppearances();

      // Parse queens (solution)
      for (let i = 0; i < queens.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;

        if (queens[i] === 'Q') {
          this.grid[row][col].isSolutionQueen = true;
        }
      }

      this.currentPuzzle = {
        ...puzzleData,
        difficulty: this.normalizePuzzleDifficulty(puzzleData.difficulty),
      };
      if (puzzleData.id) {
        this.recordPuzzleAsRecentlyServed(`${gridSize}x${gridSize}`, String(puzzleData.id));
      }

      // Load saved progress if puzzle is not completed
      const puzzleId = puzzleData.name || puzzleData.id;
      const puzzleIdString = typeof puzzleId === 'string' ? puzzleId : String(puzzleId);
      if (this.persistProgressEnabled && !isPuzzleCompleted(puzzleIdString)) {
        const savedProgressData = loadPuzzleProgress(puzzleId);
        if (
          savedProgressData &&
          savedProgressData.playerMarks &&
          savedProgressData.playerMarks.length === gridSize
        ) {
          // Validate that saved progress matches current grid size
          let isValid = true;
          for (let r = 0; r < gridSize; r++) {
            if (
              !savedProgressData.playerMarks[r] ||
              savedProgressData.playerMarks[r].length !== gridSize
            ) {
              isValid = false;
              break;
            }
          }
          if (isValid) {
            this.playerMarks = savedProgressData.playerMarks;

            // Load saved move history if available
            const savedHistory = loadPuzzleHistory(puzzleId);
            if (savedHistory && Array.isArray(savedHistory)) {
              // Clone the history to avoid reference issues
              this.moveHistory = savedHistory.map((state) => clonePlayerMarks(state));
            } else {
              // If no history exists, create initial state in history
              // This allows undo to work even if history wasn't saved before
              this.moveHistory = [clonePlayerMarks(savedProgressData.playerMarks)];
            }

            // Recalculate blocked moves if auto-flagging is enabled
            if (this.uiState.autoFlagging) {
              this.updateBlockedMoves();
            }

            // Restore elapsed time and adjust puzzleStartTime to continue timing
            if (
              savedProgressData.elapsedTimeSeconds !== undefined &&
              savedProgressData.elapsedTimeSeconds > 0
            ) {
              if (this.currentMode === 'speed') {
                // For speed mode, restore puzzleStartTime in speedModeStore
                useSpeedModeStore().puzzleStartTime =
                  Date.now() - savedProgressData.elapsedTimeSeconds * 1000;
              } else {
                // Set puzzleStartTime to current time minus elapsed time
                // This way the timer continues from where it left off
                this.puzzleStartTime = Date.now() - savedProgressData.elapsedTimeSeconds * 1000;
              }
            }

            // Check if puzzle is already complete after loading saved progress
            this.checkBoardCompletion();
          }
        }
      }

      // Start error checking for fully flagged groups
      this.startErrorChecking();

      // Record puzzle start time (only if not in speed mode, as speed mode tracks its own timing)
      // Also check if puzzle is already complete - if so, don't start timing
      // Only set start time if it wasn't already restored from saved progress
      if (this.currentMode !== 'speed' && !this.isComplete && this.puzzleStartTime === null) {
        this.puzzleStartTime = Date.now();
      }

      // For speed mode, set puzzle start time if not already restored
      if (this.currentMode === 'speed' && !this.isComplete) {
        const speedStore = useSpeedModeStore();
        if (speedStore.puzzleStartTime === null) {
          speedStore.puzzleStartTime = Date.now();
        }
      }

      // Start periodic progress saving for both single puzzle mode and speed mode
      if (this.persistProgressEnabled && !this.isComplete) {
        this.startProgressSaving();
      }

      // Load best time for this size+difficulty level when available.
      if (this.currentMode !== 'speed') {
        const sizeKey = `${this.gridSize}x${this.gridSize}`;
        const levelDifficulty = this.currentPuzzle?.difficulty;
        const levelBestTime = this.getBestTimeForSizeAndDifficulty(sizeKey, levelDifficulty);
        if (levelBestTime !== null) {
          this.puzzleBestTime = levelBestTime;
        } else {
          const bestTimes = getBestTimesPerSize();
          this.puzzleBestTime = bestTimes[sizeKey] || null;
        }
      }
    },

    getOriginalPuzzlesForSize(sizeKey: string): PuzzleForDiversity[] {
      if (!this.puzzleDatabase || !this.puzzleDatabase[sizeKey]) {
        return [];
      }
      return keepOnlyOriginalPuzzleVariants(this.puzzleDatabase[sizeKey] as PuzzleForDiversity[]);
    },

    getAverageDifferenceThresholdForSize(sizeKey: string): number {
      const cached = this.diversityAverageBySize[sizeKey];
      if (cached !== undefined) {
        return cached;
      }

      const originals = this.getOriginalPuzzlesForSize(sizeKey);
      const average = estimateAverageDifferenceBetweenPuzzles(originals);
      this.diversityAverageBySize[sizeKey] = average;
      return average;
    },

    getRecentPuzzleIdsForSize(sizeKey: string): string[] {
      return this.recentPuzzleIdsBySize[sizeKey] || [];
    },

    recordPuzzleAsRecentlyServed(sizeKey: string, puzzleId: string): void {
      const previous = this.getRecentPuzzleIdsForSize(sizeKey);
      const withoutCurrent = previous.filter((id) => id !== puzzleId);
      const updated = [puzzleId, ...withoutCurrent].slice(0, 5);
      this.recentPuzzleIdsBySize[sizeKey] = updated;
    },

    chooseNextDiversePuzzleForSize(
      sizeKey: string,
      currentPuzzle: PuzzleForDiversity | null
    ): PuzzleForDiversity | null {
      const originals = this.getOriginalPuzzlesForSize(sizeKey);
      return this.chooseNextDiversePuzzleFromCandidates(sizeKey, originals, currentPuzzle);
    },

    chooseNextDiversePuzzleFromCandidates(
      sizeKey: string,
      candidates: PuzzleRecord[],
      currentPuzzle: PuzzleRecord | null
    ): PuzzleForDiversity | null {
      const normalizedCandidates = candidates.map((puzzle) => ({
        ...puzzle,
        id: String(puzzle.id),
      }));
      const normalizedCurrentPuzzle = currentPuzzle
        ? { ...currentPuzzle, id: String(currentPuzzle.id) }
        : null;
      const originals = keepOnlyOriginalPuzzleVariants(normalizedCandidates);
      const candidatePool = originals.length > 0 ? originals : normalizedCandidates;
      if (candidatePool.length === 0) {
        return null;
      }

      const diversitySizeKey = originals.length > 0 ? sizeKey : `${sizeKey}|all`;
      const averageDifference = this.getAverageDifferenceThresholdForSize(sizeKey);
      const requiredDifference = convertAverageIntoRequiredDifference(averageDifference);
      const choice = chooseRandomPuzzleThatIsMeaningfullyDifferent({
        currentPuzzle: normalizedCurrentPuzzle,
        candidatePuzzles: candidatePool,
        minimumDifference: requiredDifference,
        recentPuzzleIds: this.getRecentPuzzleIdsForSize(diversitySizeKey),
      });

      if (!choice.selectedPuzzle) {
        return null;
      }

      this.lastDiversitySelectionSummary = {
        sizeKey: diversitySizeKey,
        averageDifference,
        requiredDifference,
        selectedDifference: choice.selectedDifference,
        usedFallbackPool: choice.usedFallbackPool,
        candidatesAboveThreshold: choice.candidatesAboveThreshold,
      };

      return choice.selectedPuzzle;
    },

    getRandomPuzzleForSelection(
      sizeKey: string,
      orthogonalMinDistance: number,
      difficulty?: QueensSelectionDifficulty,
      targetQueenCount?: number,
      minimumGroupSize?: number,
      currentPuzzle?: PuzzleRecord | null
    ): PuzzleRecord | null {
      const candidates = this.getPuzzlesForSelection(
        sizeKey,
        orthogonalMinDistance,
        difficulty,
        targetQueenCount,
        minimumGroupSize
      );
      return this.chooseNextDiversePuzzleFromCandidates(
        `${sizeKey}|d${orthogonalMinDistance}|${difficulty}|q${targetQueenCount ?? 'any'}|g${minimumGroupSize ?? 'any'}`,
        candidates,
        (currentPuzzle ?? null) as PuzzleForDiversity | null
      );
    },

    getNextPuzzle() {
      const sizeKey = `${this.gridSize}x${this.gridSize}`;
      const current = (this.currentPuzzle || null) as PuzzleForDiversity | null;
      return this.chooseNextDiversePuzzleForSize(sizeKey, current);
    },

    async loadRandomPuzzle(options?: { persistProgress?: boolean }) {
      // Load database if not already loaded
      if (!this.puzzleDatabase) {
        const success = await this.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
      }

      // Get the next puzzle using diversity-aware random selection
      const puzzle = this.getNextPuzzle();
      if (!puzzle) {
        throw new Error(`No puzzles available for ${this.gridSize}x${this.gridSize} grid`);
      }

      // Parse and load the puzzle
      this.parsePuzzleData(puzzle, options);
    },

    findPuzzleById(id: string): PuzzleRecord | null {
      if (!this.puzzleDatabase) return null;

      // If we ever decide to cache, use puzzleIdMap
      const cached = this.puzzleIdMap.get(id);
      if (cached) return cached;

      for (const [, sizePuzzles] of Object.entries<PuzzleRecord[]>(this.puzzleDatabase)) {
        const found = sizePuzzles.find((p) => p.id === id);
        if (found) {
          // Optional: cache it for future lookups
          this.puzzleIdMap.set(id, found);
          return found;
        }
      }

      return null;
    },

    async loadPuzzleById(puzzleId: string | number, options?: { persistProgress?: boolean }) {
      try {
        if (!this.puzzleDatabase) {
          const success = await this.loadPuzzleDatabase();
          if (!success) {
            throw new Error('Failed to load puzzle database');
          }
        }

        const key = typeof puzzleId === 'string' ? puzzleId : String(puzzleId);
        const puzzle = this.findPuzzleById(key);

        if (!puzzle) {
          throw new Error(`Puzzle with ID ${key} not found`);
        }

        this.parsePuzzleData(puzzle, options);
      } catch (error) {
        console.error('[queensStore] Error loading puzzle by ID:', error);
        throw error;
      }
    },

    loadPuzzleFromEncodedLayout(encodedLayout: string, options?: { persistProgress?: boolean }) {
      try {
        if (!encodedLayout) {
          throw new Error('Encoded layout is required');
        }

        const decodedLayout = decodeQueensPuzzleLayout(encodedLayout);

        if (!isPerfectSquareLength(decodedLayout.length)) {
          throw new Error('Encoded puzzle length must form a square board');
        }

        let layout = '';
        let queens = '';
        const solutionQueens: Pos[] = [];
        const gridSize = Math.sqrt(decodedLayout.length);

        for (let index = 0; index < decodedLayout.length; index++) {
          const rawSymbol = decodedLayout[index];
          if (rawSymbol === '.') {
            layout += '.';
            queens += '.';
            continue;
          }

          const layoutSymbol = rawSymbol.toUpperCase();
          if (!/[A-Z]/.test(layoutSymbol)) {
            throw new Error(`Unsupported encoded puzzle symbol: ${rawSymbol}`);
          }

          layout += layoutSymbol;
          const isSolutionQueen = rawSymbol !== layoutSymbol;
          queens += isSolutionQueen ? 'Q' : '.';
          if (isSolutionQueen) {
            solutionQueens.push({
              row: Math.floor(index / gridSize),
              col: index % gridSize,
            });
          }
        }

        const targetQueenCount = solutionQueens.length;
        const orthogonalMinDistance = deriveOrthogonalMinDistanceFromQueens(
          solutionQueens,
          gridSize
        );

        const puzzle: PuzzleRecord = {
          id: 'url-preview',
          name: 'URL Preview Puzzle',
          layout,
          queens,
          targetQueenCount,
          orthogonalMinDistance,
        };

        this.parsePuzzleData(puzzle, options);
      } catch (error) {
        console.error('[queensStore] Error loading encoded layout from URL:', error);
        throw error;
      }
    },

    clearMarkers() {
      // Stop error checking (this also clears error messages)
      this.stopErrorChecking();
      this.clearAutoFlagAnimations();
      this.clearPendingRotateTimeout();
      this.clearHintState();

      // Clear all marks by setting each cell to null
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.playerMarks[row][col] = null;
        }
      }
      this.isComplete = false;
      this.showSolution = false;

      // Clear history when clearing markers
      this.moveHistory = [];

      // Clear saved progress when clearing markers
      clearPuzzleProgress(this.currentPuzzleId);

      // Restart error checking
      this.startErrorChecking();
    },

    clearAll() {
      this.clearPendingRotateTimeout();
      // If in rotate mode, un-rotate the grid back to its original orientation first
      if (this.isRotateMode && this.boardRotationCount > 0) {
        const rotationsBack = (4 - this.boardRotationCount) % 4;
        for (let i = 0; i < rotationsBack; i++) {
          this.rotateGridOnly90CW();
        }
        this.boardRotationCount = 0;
        this.rotationHistory = [];
      }
      // Clear all marks and reset history
      this.clearMarkers();
    },

    updateBlockedMoves() {
      let flagsPlaced = 0;
      // Flag all squares that are no longer valid moves after placing queens
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          // Only flag squares that are currently unmarked
          if (this.playerMarks[row][col] === null) {
            if (!this.isValidMove(row, col)) {
              this.playerMarks[row][col] = 'flag';
              const animationDelay = Math.min(flagsPlaced, 10) * 45;
              this.triggerAutoFlagAnimation(row, col, 'blocked', animationDelay);
              flagsPlaced += 1;
            }
          }
        }
      }
      this.showAutoFlagCombo(flagsPlaced);

      // Check for error conditions after auto-flagging
      this.checkFullyFlaggedGroups();
    },

    // Load tutorial puzzle by name (e.g., "level-1")
    async loadTutorialPuzzle(levelName: string) {
      if (!this.puzzleDatabase) {
        const success = await this.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
      }

      // Build tutorialPuzzles only once, on demand
      if (!this.tutorialPuzzles.length) {
        const tutorials: PuzzleRecord[] = [];

        for (const sizePuzzles of Object.values(this.puzzleDatabase as PuzzleDatabase)) {
          for (const puzzle of sizePuzzles) {
            if (
              puzzle.name &&
              typeof puzzle.name === 'string' &&
              puzzle.name.startsWith('level-') &&
              typeof puzzle.id === 'string' &&
              puzzle.id.endsWith('-0')
            ) {
              tutorials.push(puzzle);
            }
          }
        }

        tutorials.sort((a, b) => {
          const aNum = Number(String(a.name).slice(6));
          const bNum = Number(String(b.name).slice(6));
          return aNum - bNum;
        });

        this.tutorialPuzzles = tutorials;
      }

      const tutorialPuzzle = this.tutorialPuzzles.find((p) => p.name === levelName);
      if (!tutorialPuzzle) {
        throw new Error(`Tutorial puzzle ${levelName} not found`);
      }

      this.parsePuzzleData(tutorialPuzzle);
    },

    // Check if a puzzle is completed
    isPuzzleCompleted(puzzleId: string | number): boolean {
      const id = typeof puzzleId === 'string' ? puzzleId : String(puzzleId);
      return isPuzzleCompleted(id);
    },

    // Tutorial functions
    initializeTutorial(steps: TutorialStep[], validSquares?: Pos[]) {
      this.isTutorialMode = true;
      this.tutorialSteps = steps;
      this.currentTutorialStep = 0;
      this.tutorialValidSquares = validSquares || [];
      this.shouldShakeToast = false;
      this.updateTutorialInstruction();
    },

    updateTutorialInstruction() {
      if (this.currentTutorialStep < this.tutorialSteps.length) {
        const currentStep = this.tutorialSteps[this.currentTutorialStep];

        // Skip select-queen-mode step if queen mode is already selected
        if (currentStep.id === 'select-queen-mode' && this.uiState.placementMode === 'queen') {
          this.nextTutorialStep();
          return;
        }

        this.tutorialInstruction = currentStep.instruction;

        // Show overlay for tool selector step
        this.highlightToolSelector = currentStep.id === 'select-queen-mode';

        // Auto-advance explanation steps after 5 seconds
        if (currentStep.id.startsWith('explain-') && currentStep.action === undefined) {
          setTimeout(() => {
            // Only advance if we're still on this step
            if (
              this.isTutorialMode &&
              this.currentTutorialStep < this.tutorialSteps.length &&
              this.tutorialSteps[this.currentTutorialStep].id === currentStep.id
            ) {
              this.nextTutorialStep();
            }
          }, 5000);
        }
      } else {
        // Tutorial complete
        this.tutorialInstruction = null;
        this.highlightToolSelector = false;
      }
    },

    shakeToast() {
      this.shouldShakeToast = true;
      // Reset shake flag after animation
      setTimeout(() => {
        this.shouldShakeToast = false;
      }, 500);
    },

    checkTutorialStep(clickedPos: Pos | null, action: string) {
      if (!this.isTutorialMode || this.currentTutorialStep >= this.tutorialSteps.length) {
        return;
      }

      const currentStep = this.tutorialSteps[this.currentTutorialStep];

      // Special handling for mode selection step
      if (currentStep.id === 'select-queen-mode') {
        // Check if mode is set to 'queen'
        if (this.uiState.placementMode === 'queen') {
          this.nextTutorialStep();
        }
        return;
      }

      // Check if action matches
      if (currentStep.action && currentStep.action !== action) {
        return;
      }

      // For place-queen steps, check if clicked square is a solution queen
      if (action === 'place-queen' && clickedPos) {
        const solutionQueens = this.solutionQueenPositions;
        const isSolutionQueen = solutionQueens.some(
          (queen) => queen.row === clickedPos.row && queen.col === clickedPos.col
        );

        if (!isSolutionQueen) {
          // Not a solution queen - show error feedback
          this.showErrorFeedback = true;
          this.errorFeedbackSquare = clickedPos;
          this.shakeToast();
          setTimeout(() => {
            this.showErrorFeedback = false;
            this.errorFeedbackSquare = null;
          }, 2000);
          return; // Don't advance step
        }
      }

      // Check if target square matches (if specified and not checking solution queens)
      if (
        currentStep.targetSquare !== undefined &&
        currentStep.targetSquare !== null &&
        action !== 'place-queen'
      ) {
        if (
          !clickedPos ||
          clickedPos.row !== currentStep.targetSquare.row ||
          clickedPos.col !== currentStep.targetSquare.col
        ) {
          return;
        }
      }

      // Check custom validation if provided
      if (currentStep.validate && !currentStep.validate(this)) {
        return;
      }

      // Step completed, move to next
      this.nextTutorialStep();
    },

    nextTutorialStep() {
      if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
        this.currentTutorialStep++;
        this.updateTutorialInstruction();

        // Update valid squares based on current step
        const currentStep = this.tutorialSteps[this.currentTutorialStep];
        if (
          currentStep &&
          currentStep.targetSquare === null &&
          currentStep.action === 'place-queen'
        ) {
          // For steps with null targetSquare, allow any valid square
          this.tutorialValidSquares = [];
        }
      } else {
        // Tutorial complete
        this.tutorialInstruction = null;
        this.highlightToolSelector = false;
      }
    },

    exitTutorialMode() {
      this.isTutorialMode = false;
      this.tutorialSteps = [];
      this.currentTutorialStep = 0;
      this.tutorialInstruction = null;
      this.lastClickedSquare = null;
      this.tutorialValidSquares = [];
      this.shouldShakeToast = false;
      this.showErrorFeedback = false;
      this.errorFeedbackSquare = null;
      this.highlightToolSelector = false;
    },

    // UI state management
    setPlacementMode(mode: 'auto' | 'flag' | 'queen') {
      this.uiState.placementMode = mode;
      // Check if tutorial is waiting for mode selection
      if (this.isTutorialMode) {
        this.checkTutorialStep(null, 'mode-selected');
      }
    },

    setAutoFlagging(enabled: boolean) {
      this.uiState.autoFlagging = enabled;
      // If enabling auto-flagging, update flags based on current queens
      if (enabled) {
        this.updateBlockedMoves();
      }
      // When disabling, don't remove existing flags - just prevent future auto-flagging
    },

    setRegionColorMode(mode: QueensRegionColorMode) {
      if (this.regionColorMode === mode) {
        return;
      }

      this.regionColorMode = mode;
      saveRegionColorMode(mode);
      this.refreshRegionAppearances();
    },

    async navigateToMainMenu() {
      if (this.isSpeedMode) {
        const speedModeStore = useSpeedModeStore();
        speedModeStore.reset();
      }

      if (this.isTutorialMode) {
        this.exitTutorialMode();
      }

      if (this.isRotateMode) {
        this.resetRotateMode();
      }

      this.isCampaignMode = false;
      this.currentCampaignBucket = null;
      this.showCampaignIntroModal = false;
      this.isCampaignFullyComplete = false;
      this.clearHintState();
      this.syncStoryProgressState();

      await router.push('/queens');
    },

    async navigateToPuzzleVariationSelection() {
      const sizeKey = `${this.gridSize}x${this.gridSize}`;
      const distance = this.currentPuzzle?.orthogonalMinDistance ?? this.gridSize;
      const difficulty = this.currentPuzzle?.difficulty;

      await router.push({
        path: '/queens',
        query: {
          mode: 'single',
          size: sizeKey,
          distance: String(distance),
          ...(difficulty ? { difficulty } : {}),
        },
      });
    },

    buildShareablePuzzleUrl(): string | null {
      if (!this.gridSize || this.grid.length === 0) return null;

      const encodedLayout = buildEncodedQueensPuzzleLayout(
        this.grid.flat().map((cell) => ({
          groupColor: cell.groupColor ?? null,
          isSolutionQueen: !!cell.isSolutionQueen,
        }))
      );

      const href = router.resolve({
        name: 'queens-encoded-puzzle',
        params: { encodedLayout },
      }).href;

      return `${QUEENS_PUZZLE_SHARE_BASE_URL}${href}`;
    },

    async copyCurrentPuzzleLink() {
      const url = this.buildShareablePuzzleUrl();
      if (!url) return false;

      try {
        await navigator.clipboard.writeText(url);
        return true;
      } catch (error) {
        console.error('Error copying puzzle link:', error);
        return false;
      }
    },

    async startNextPuzzle() {
      if (this.isCampaignMode && this.currentCampaignBucket) {
        if (!this.hasPassedCurrentCampaignLevel) {
          await this.loadCampaignBucket(this.currentCampaignBucket, { showIntroModal: false });
          return;
        }
        if (!this.nextCampaignBucket) {
          await router.push('/queens/campaign');
          return;
        }
        await router.push(
          `/queens/campaign/${this.nextCampaignBucket.sizeKey}/${this.nextCampaignBucket.difficulty}`
        );
        return;
      }

      // Load database if not already loaded
      if (!this.puzzleDatabase) {
        const success = await this.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
      }

      // Require a current puzzle; if missing, redirect to /queens and return
      if (!this.currentPuzzle) {
        router.push('/queens');
        return;
      }

      const sizeKey = `${this.gridSize}x${this.gridSize}`;
      const orthogonalMinDistance =
        this.currentPuzzle?.orthogonalMinDistance ?? this.orthogonalMinDistance;
      const difficulty = this.currentPuzzle?.difficulty ?? 'easy';
      const selectedPuzzle = this.getRandomPuzzleForSelection(
        sizeKey,
        orthogonalMinDistance,
        difficulty,
        undefined,
        undefined,
        this.currentPuzzle
      );

      if (!selectedPuzzle) {
        router.push({ path: '/queens', query: { mode: 'single' } });
        return;
      }

      router.push(
        buildQueensSelectionRoute({
          sizeKey,
          orthogonalMinDistance,
          difficulty: this.currentPuzzle?.difficulty,
          puzzleId: selectedPuzzle.id,
        })
      );
    },

    setMode(mode: GameMode) {
      this.currentMode = mode;
    },

    getSpeedModeRecord(timerDuration: number, isSequential: boolean, sizeKey?: string): number {
      return getSpeedModeRecord(timerDuration, isSequential, sizeKey);
    },

    getAllSpeedModeSizeRecords(timerDuration: number): Record<string, number> {
      return getAllSpeedModeSizeRecords(timerDuration);
    },

    getBestTimesPerSize(): Record<string, number> {
      return getBestTimesPerSize();
    },

    getBestTimesByLevel(): Record<string, number> {
      return this.storyLevelBestTimes;
    },

    // Check if a time is a record for a given size
    isRecordForSize(size: string, time: number): boolean {
      const bestTimes = getBestTimesPerSize();
      const bestTime = bestTimes[size];
      return bestTime === undefined || time <= bestTime;
    },

    resetAllRecords() {
      try {
        // Clear speed mode records
        localStorage.removeItem(SPEED_MODE_2MIN_SEQUENTIAL_RECORD_KEY);
        localStorage.removeItem(SPEED_MODE_5MIN_SEQUENTIAL_RECORD_KEY);
        localStorage.removeItem(SPEED_MODE_2MIN_SIZE_RECORDS_KEY);
        localStorage.removeItem(SPEED_MODE_5MIN_SIZE_RECORDS_KEY);
        // Clear best times per size
        localStorage.removeItem(BEST_TIMES_PER_SIZE_KEY);
        localStorage.removeItem(STORY_PROGRESS_KEY);
        this.storyUnlockedLevelIndex = 1;
        this.storyPassedLevelBestTimes = {};
        this.storyLevelBestTimes = {};
        // Trigger reactivity update
        this.recordsRefreshTrigger = Date.now();
      } catch (e) {
        console.error('Error resetting records:', e);
      }
    },

    getAvailableSizes(): string[] {
      if (!this.puzzleDatabase) {
        const sizeKeys = Array.from(
          new Set(Object.values(this.campaignCatalogIndex).map((entry) => entry.sizeKey))
        );
        return sizeKeys.sort((a, b) => {
          const aSize = parseInt(a.split('x')[0], 10);
          const bSize = parseInt(b.split('x')[0], 10);
          return aSize - bSize;
        });
      }

      const sizeKeys = Object.keys(this.puzzleDatabase);
      return sizeKeys.sort((a, b) => {
        const aSize = parseInt(a.split('x')[0], 10);
        const bSize = parseInt(b.split('x')[0], 10);
        return aSize - bSize;
      });
    },

    getAvailableOrthogonalDistancesForSize(sizeKey: string): number[] {
      if (!this.puzzleDatabase || !this.puzzleDatabase[sizeKey]) {
        const distances = Object.values(this.campaignCatalogIndex)
          .filter((entry) => entry.sizeKey === sizeKey)
          .flatMap((entry) => entry.orthogonalMinDistances);
        return Array.from(new Set(distances)).sort((left, right) => left - right);
      }

      const distances = new Set<number>();
      const boardSize = parseInt(sizeKey.split('x')[0], 10);
      for (const puzzle of this.puzzleDatabase[sizeKey]) {
        distances.add(puzzle.orthogonalMinDistance ?? boardSize);
      }

      return Array.from(distances).sort((left, right) => left - right);
    },

    getPuzzlesForSelection(
      sizeKey: string,
      orthogonalMinDistance?: number,
      difficulty?: QueensSelectionDifficulty,
      targetQueenCount?: number,
      minimumGroupSize?: number
    ): PuzzleRecord[] {
      if (!this.puzzleDatabase || !this.puzzleDatabase[sizeKey]) {
        const group =
          difficulty != null ? this.campaignCatalogIndex[bucketKey(sizeKey, difficulty)] : null;
        if (!group) {
          return [];
        }
        if (!(orthogonalMinDistance != null && difficulty)) {
          return [];
        }
        const cached = this.campaignBucketPuzzleCache[bucketKey(sizeKey, difficulty)] ?? [];
        return cached.filter((puzzle) => {
          const boardSize = parseInt(sizeKey.split('x')[0], 10);
          const puzzleDistance = puzzle.orthogonalMinDistance ?? boardSize;
          return puzzleDistance === orthogonalMinDistance;
        });
      }

      const boardSize = parseInt(sizeKey.split('x')[0], 10);
      const basePool =
        orthogonalMinDistance != null && difficulty
          ? (this.puzzleSelectionIndex[`${sizeKey}|${orthogonalMinDistance}|${difficulty}`] ??
            this.puzzleDatabase[sizeKey])
          : this.puzzleDatabase[sizeKey];

      return basePool.filter((puzzle) => {
        const puzzleDistance = puzzle.orthogonalMinDistance ?? boardSize;
        const puzzleDifficulty = this.normalizePuzzleDifficulty(puzzle.difficulty) ?? 'easy';
        const puzzleTargetQueenCount =
          puzzle.targetQueenCount ?? deriveTargetQueenCountFromQueensString(puzzle.queens);
        const puzzleMinimumGroupSize = puzzle.minimumGroupSize ?? 3;
        if (orthogonalMinDistance != null && puzzleDistance !== orthogonalMinDistance) {
          return false;
        }

        if (difficulty && puzzleDifficulty !== difficulty) {
          return false;
        }

        if (targetQueenCount != null && puzzleTargetQueenCount !== targetQueenCount) {
          return false;
        }

        if (minimumGroupSize != null && puzzleMinimumGroupSize !== minimumGroupSize) {
          return false;
        }

        return true;
      });
    },

    getAvailableDifficultiesForSelection(
      sizeKey: string,
      orthogonalMinDistance: number
    ): QueensSelectionDifficulty[] {
      if (!this.puzzleDatabase) {
        const difficultyOrder = QUEENS_SELECTION_DIFFICULTY_ORDER;
        const difficulties = new Set<QueensSelectionDifficulty>();
        for (const entry of Object.values(this.campaignCatalogIndex)) {
          if (
            entry.sizeKey === sizeKey &&
            entry.orthogonalMinDistances.includes(orthogonalMinDistance)
          ) {
            difficulties.add(entry.difficulty);
          }
        }
        return difficultyOrder.filter((difficulty) => difficulties.has(difficulty));
      }

      const puzzles = this.getPuzzlesForSelection(sizeKey, orthogonalMinDistance);
      if (puzzles.length === 0) {
        return [];
      }

      const difficultyOrder = QUEENS_SELECTION_DIFFICULTY_ORDER;
      const difficulties = new Set<QueensSelectionDifficulty>();
      for (const puzzle of puzzles) {
        difficulties.add(this.normalizePuzzleDifficulty(puzzle.difficulty) ?? 'easy');
      }

      return difficultyOrder.filter((difficulty) => difficulties.has(difficulty));
    },

    getAvailableDifficultiesForSize(sizeKey: string): QueensSelectionDifficulty[] {
      const distances = this.getAvailableOrthogonalDistancesForSize(sizeKey);
      const difficultyOrder = QUEENS_SELECTION_DIFFICULTY_ORDER;
      const difficulties = new Set<QueensSelectionDifficulty>();

      for (const distance of distances) {
        for (const difficulty of this.getAvailableDifficultiesForSelection(sizeKey, distance)) {
          difficulties.add(difficulty);
        }
      }

      return difficultyOrder.filter((difficulty) => difficulties.has(difficulty));
    },

    countPuzzlesForSelection(
      sizeKey: string,
      orthogonalMinDistance: number,
      difficulty: QueensSelectionDifficulty
    ): number {
      if (!this.puzzleDatabase) {
        const group = this.campaignCatalogIndex[bucketKey(sizeKey, difficulty)];
        return group?.orthogonalMinDistances.includes(orthogonalMinDistance) ? group.count : 0;
      }
      return this.getPuzzlesForSelection(sizeKey, orthogonalMinDistance, difficulty).length;
    },

    countPuzzlesForSizeAndDifficulty(
      sizeKey: string,
      difficulty: QueensSelectionDifficulty
    ): number {
      return this.getPuzzlesForSelection(sizeKey, undefined, difficulty).length;
    },

    // Modal state management
    openSinglePuzzleModeModal() {
      this.showSinglePuzzleModeModal = true;
    },

    closeSinglePuzzleModeModal() {
      this.showSinglePuzzleModeModal = false;
    },

    openRecordsModal() {
      this.showRecordsModal = true;
    },

    closeRecordsModal() {
      this.showRecordsModal = false;
    },

    // Rotate mode core methods
    clearPendingRotateTimeout() {
      if (this.pendingRotateTimeout !== null) {
        clearTimeout(this.pendingRotateTimeout);
        this.pendingRotateTimeout = null;
      }
    },

    scheduleRotateAfterDelay() {
      this.clearPendingRotateTimeout();
      this.pendingRotateTimeout = window.setTimeout(() => {
        this.pendingRotateTimeout = null;
        if (!this.isRotateMode || this.isComplete || this.isSwipeActive) {
          return;
        }
        this.rotateBoard90CW();
      }, ROTATE_DELAY_MS);
    },

    // Rotate only the grid (color groups + solution queens) 90° clockwise
    rotateGridOnly90CW() {
      const n = this.gridSize;
      const newGrid: GridSquare[][] = Array.from({ length: n }, () =>
        Array.from({ length: n }, () => ({
          position: { row: 0, col: 0 },
        }))
      );
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          // CW rotation: new[c][n-1-r] = old[r][c]
          const rotatedCell = { ...this.grid[r][c] };
          rotatedCell.position = { row: c, col: n - 1 - r };
          newGrid[c][n - 1 - r] = rotatedCell;
        }
      }
      this.grid = newGrid;
    },

    // Rotate both grid and playerMarks 90° clockwise
    rotateBoard90CW() {
      const n = this.gridSize;
      // Rotate grid
      this.rotateGridOnly90CW();
      // Rotate playerMarks
      const newMarks: MarkType[][] = Array.from({ length: n }, () => Array(n).fill(null));
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          newMarks[c][n - 1 - r] = this.playerMarks[r][c];
        }
      }
      this.playerMarks = newMarks;
      this.boardRotationCount = (this.boardRotationCount + 1) % 4;
    },

    // Called by PlayGrid when a touch swipe begins
    onSwipeStart() {
      if (!this.isRotateMode) return;
      this.clearPendingRotateTimeout();
      this.isSwipeActive = true;
      this.swipePlacedFlags = false;
    },

    // Called by PlayGrid when a touch swipe ends
    onSwipeEnd() {
      if (!this.isRotateMode) return;
      const hadFlags = this.swipePlacedFlags;
      this.isSwipeActive = false;
      this.swipePlacedFlags = false;
      if (hadFlags) {
        this.scheduleRotateAfterDelay();
      }
    },

    startRotateMode() {
      this.clearPendingRotateTimeout();
      this.currentMode = 'rotate';
      this.boardRotationCount = 0;
      this.rotationHistory = [];
      this.isSwipeActive = false;
      this.swipePlacedFlags = false;
    },

    resetRotateMode() {
      this.clearPendingRotateTimeout();
      // Un-rotate grid back to original orientation
      if (this.boardRotationCount > 0) {
        const rotationsBack = (4 - this.boardRotationCount) % 4;
        for (let i = 0; i < rotationsBack; i++) {
          this.rotateGridOnly90CW();
        }
      }
      this.currentMode = 'standard';
      this.boardRotationCount = 0;
      this.rotationHistory = [];
      this.isSwipeActive = false;
      this.swipePlacedFlags = false;
    },

    async startRotateModePuzzle(sizeKey: string) {
      if (!this.puzzleDatabase) {
        const success = await this.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
      }
      const puzzleDatabase = this.puzzleDatabase;
      if (!puzzleDatabase) {
        throw new Error('Puzzle database unavailable');
      }

      const puzzle = this.getNextUncompletedPuzzleForSize(sizeKey);
      if (!puzzle) {
        // All puzzles for this size are completed — just use the first one
        const puzzlesForSize = puzzleDatabase[sizeKey];
        if (puzzlesForSize && puzzlesForSize.length > 0) {
          this.startRotateMode();
          router.push(`/queens/${puzzlesForSize[0].id}`);
        }
        return;
      }

      this.startRotateMode();
      router.push(`/queens/${puzzle.id}`);
    },

    async getRandomPuzzleForSelectionAsync(
      sizeKey: string,
      orthogonalMinDistance: number,
      difficulty?: QueensSelectionDifficulty
    ): Promise<PuzzleRecord | null> {
      if (!this.puzzleDatabase && difficulty) {
        const puzzles = await this.loadCampaignBucketPuzzles(sizeKey, difficulty);
        const boardSize = parseInt(sizeKey.split('x')[0], 10);
        const candidates = puzzles.filter((puzzle) => {
          const puzzleDistance = puzzle.orthogonalMinDistance ?? boardSize;
          const puzzleDifficulty = this.normalizePuzzleDifficulty(puzzle.difficulty) ?? 'easy';
          return puzzleDistance === orthogonalMinDistance && puzzleDifficulty === difficulty;
        });
        if (candidates.length === 0) {
          return null;
        }
        const randomIndex = Math.floor(Math.random() * candidates.length);
        return candidates[randomIndex];
      }

      return this.getRandomPuzzleForSelection(sizeKey, orthogonalMinDistance, difficulty);
    },

    getNextUncompletedPuzzleForSize(sizeKey: string): PuzzleRecord | null {
      if (!this.puzzleDatabase || !this.puzzleDatabase[sizeKey]) {
        return null;
      }

      const completedPuzzles = getCompletedPuzzles();
      const puzzlesForSize = this.puzzleDatabase[sizeKey] || [];

      // Find first uncompleted puzzle
      for (const puzzle of puzzlesForSize) {
        const puzzleId = String(puzzle.id);
        if (!completedPuzzles.has(puzzleId)) {
          return puzzle;
        }
      }

      // All puzzles completed for this size
      return null;
    },

    getNextUncompletedPuzzleForSizeAndDifficulty(
      sizeKey: string,
      difficulty: QueensSelectionDifficulty
    ): PuzzleRecord | null {
      const distances = this.getAvailableOrthogonalDistancesForSize(sizeKey);
      for (const distance of distances) {
        const puzzle = this.getNextUncompletedPuzzleForSelection(sizeKey, distance, difficulty);
        if (puzzle) {
          return puzzle;
        }
      }
      return null;
    },

    getNextUncompletedPuzzleForSelection(
      sizeKey: string,
      orthogonalMinDistance: number,
      difficulty: QueensSelectionDifficulty
    ): PuzzleRecord | null {
      if (!this.puzzleDatabase || !this.puzzleDatabase[sizeKey]) {
        return null;
      }

      const completedPuzzles = getCompletedPuzzles();
      const puzzlesForBucket = this.getPuzzlesForSelection(
        sizeKey,
        orthogonalMinDistance,
        difficulty
      );

      for (const puzzle of puzzlesForBucket) {
        const puzzleId = String(puzzle.id);
        if (!completedPuzzles.has(puzzleId)) {
          return puzzle;
        }
      }

      return null;
    },

    getFirstPuzzleForSizeAndDifficulty(
      sizeKey: string,
      difficulty: QueensSelectionDifficulty
    ): PuzzleRecord | null {
      const distances = this.getAvailableOrthogonalDistancesForSize(sizeKey);
      for (const distance of distances) {
        const puzzle = this.getFirstPuzzleForSelection(sizeKey, distance, difficulty);
        if (puzzle) {
          return puzzle;
        }
      }
      return null;
    },

    getFirstPuzzleForSelection(
      sizeKey: string,
      orthogonalMinDistance: number,
      difficulty: QueensSelectionDifficulty,
      targetQueenCount?: number,
      minimumGroupSize?: number
    ): PuzzleRecord | null {
      if (!this.puzzleDatabase || !this.puzzleDatabase[sizeKey]) {
        return null;
      }

      return (
        this.getPuzzlesForSelection(
          sizeKey,
          orthogonalMinDistance,
          difficulty,
          targetQueenCount,
          minimumGroupSize
        ).find(() => true) ?? null
      );
    },

    getPuzzleProgress(puzzleId: string | number | null): MarkType[][] | null {
      const progress = loadPuzzleProgress(puzzleId);
      return progress ? progress.playerMarks : null;
    },

    // Error detection for fully flagged groups/rows/columns and multiple queens
    checkFullyFlaggedGroups() {
      const now = Date.now();
      const fullyFlaggedGroups = new Set<string>();
      const errorSquaresSet = new Set<string>();
      const lineCoverageRequired = requiresLineCoverage(
        this.targetQueenCount,
        this.orthogonalMinDistance,
        this.gridSize
      );

      // Check rows for fully flagged
      for (let row = 0; row < this.gridSize; row++) {
        if (lineCoverageRequired) {
          const isFullyFlagged = this.playerMarks[row].every((mark) => mark === 'flag');
          if (isFullyFlagged) {
            const groupKey = `row-flag-${row}`;
            fullyFlaggedGroups.add(groupKey);

            const timestamp = this.flaggedGroupTimestamps.get(groupKey);
            if (!timestamp) {
              this.flaggedGroupTimestamps.set(groupKey, now);
            } else if (now - timestamp >= 1000) {
              for (let col = 0; col < this.gridSize; col++) {
                errorSquaresSet.add(`${row},${col}`);
              }
            }
          } else {
            this.flaggedGroupTimestamps.delete(`row-flag-${row}`);
          }
        } else {
          this.flaggedGroupTimestamps.delete(`row-flag-${row}`);
        }
      }

      // Check rows for queens that violate the orthogonal distance rule
      for (let row = 0; row < this.gridSize; row++) {
        const queenPositions: number[] = [];
        for (let col = 0; col < this.gridSize; col++) {
          if (this.playerMarks[row][col] === 'queen') {
            queenPositions.push(col);
          }
        }
        const conflictingCols = new Set<number>();
        for (let leftIndex = 0; leftIndex < queenPositions.length; leftIndex++) {
          for (let rightIndex = leftIndex + 1; rightIndex < queenPositions.length; rightIndex++) {
            const leftCol = queenPositions[leftIndex];
            const rightCol = queenPositions[rightIndex];
            if (Math.abs(leftCol - rightCol) < this.orthogonalMinDistance) {
              conflictingCols.add(leftCol);
              conflictingCols.add(rightCol);
            }
          }
        }
        if (conflictingCols.size > 0) {
          const groupKey = `row-queen-${row}`;
          fullyFlaggedGroups.add(groupKey);

          const timestamp = this.flaggedGroupTimestamps.get(groupKey);
          if (!timestamp) {
            this.flaggedGroupTimestamps.set(groupKey, now);
          } else if (now - timestamp >= 1000) {
            for (const col of conflictingCols) {
              errorSquaresSet.add(`${row},${col}`);
            }
          }
        } else {
          this.flaggedGroupTimestamps.delete(`row-queen-${row}`);
        }
      }

      // Check columns for fully flagged
      for (let col = 0; col < this.gridSize; col++) {
        if (lineCoverageRequired) {
          const isFullyFlagged = this.playerMarks.every((row) => row[col] === 'flag');
          if (isFullyFlagged) {
            const groupKey = `col-flag-${col}`;
            fullyFlaggedGroups.add(groupKey);

            const timestamp = this.flaggedGroupTimestamps.get(groupKey);
            if (!timestamp) {
              this.flaggedGroupTimestamps.set(groupKey, now);
            } else if (now - timestamp >= 1000) {
              for (let row = 0; row < this.gridSize; row++) {
                errorSquaresSet.add(`${row},${col}`);
              }
            }
          } else {
            this.flaggedGroupTimestamps.delete(`col-flag-${col}`);
          }
        } else {
          this.flaggedGroupTimestamps.delete(`col-flag-${col}`);
        }
      }

      // Check columns for queens that violate the orthogonal distance rule
      for (let col = 0; col < this.gridSize; col++) {
        const queenPositions: number[] = [];
        for (let row = 0; row < this.gridSize; row++) {
          if (this.playerMarks[row][col] === 'queen') {
            queenPositions.push(row);
          }
        }
        const conflictingRows = new Set<number>();
        for (let topIndex = 0; topIndex < queenPositions.length; topIndex++) {
          for (let bottomIndex = topIndex + 1; bottomIndex < queenPositions.length; bottomIndex++) {
            const topRow = queenPositions[topIndex];
            const bottomRow = queenPositions[bottomIndex];
            if (Math.abs(topRow - bottomRow) < this.orthogonalMinDistance) {
              conflictingRows.add(topRow);
              conflictingRows.add(bottomRow);
            }
          }
        }
        if (conflictingRows.size > 0) {
          const groupKey = `col-queen-${col}`;
          fullyFlaggedGroups.add(groupKey);

          const timestamp = this.flaggedGroupTimestamps.get(groupKey);
          if (!timestamp) {
            this.flaggedGroupTimestamps.set(groupKey, now);
          } else if (now - timestamp >= 1000) {
            for (const row of conflictingRows) {
              errorSquaresSet.add(`${row},${col}`);
            }
          }
        } else {
          this.flaggedGroupTimestamps.delete(`col-queen-${col}`);
        }
      }

      // Check color groups for fully flagged
      const colorGroups: { [color: string]: { row: number; col: number }[] } = {};
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const color = this.grid[row][col].groupColor;
          if (!color) continue;

          if (!colorGroups[color]) {
            colorGroups[color] = [];
          }
          colorGroups[color].push({ row, col });
        }
      }

      for (const color in colorGroups) {
        const squares = colorGroups[color];
        const isFullyFlagged = squares.every(
          (pos) => this.playerMarks[pos.row][pos.col] === 'flag'
        );

        if (isFullyFlagged) {
          const groupKey = `color-flag-${color}`;
          fullyFlaggedGroups.add(groupKey);

          const timestamp = this.flaggedGroupTimestamps.get(groupKey);
          if (!timestamp) {
            this.flaggedGroupTimestamps.set(groupKey, now);
          } else {
            if (now - timestamp >= 1000) {
              // Mark all squares in this color group as errors
              for (const pos of squares) {
                errorSquaresSet.add(`${pos.row},${pos.col}`);
              }
            }
          }
        } else {
          this.flaggedGroupTimestamps.delete(`color-flag-${color}`);
        }
      }

      // Check color groups for multiple queens
      for (const color in colorGroups) {
        const squares = colorGroups[color];
        const queenPositions: { row: number; col: number }[] = [];
        for (const pos of squares) {
          if (this.playerMarks[pos.row][pos.col] === 'queen') {
            queenPositions.push(pos);
          }
        }
        if (queenPositions.length > 1) {
          const groupKey = `color-queen-${color}`;
          fullyFlaggedGroups.add(groupKey);

          const timestamp = this.flaggedGroupTimestamps.get(groupKey);
          if (!timestamp) {
            this.flaggedGroupTimestamps.set(groupKey, now);
          } else {
            if (now - timestamp >= 1000) {
              // Mark all queens in this color group as errors
              for (const pos of queenPositions) {
                errorSquaresSet.add(`${pos.row},${pos.col}`);
              }
            }
          }
        } else {
          this.flaggedGroupTimestamps.delete(`color-queen-${color}`);
        }
      }

      // Check for diagonally adjacent queens (touching diagonally)
      const allQueenPositions: { row: number; col: number }[] = [];
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.playerMarks[row][col] === 'queen') {
            allQueenPositions.push({ row, col });
          }
        }
      }

      // Check each queen against all others for diagonal adjacency
      const diagonalConflicts = new Set<string>();
      for (let i = 0; i < allQueenPositions.length; i++) {
        const queen1 = allQueenPositions[i];
        for (let j = i + 1; j < allQueenPositions.length; j++) {
          const queen2 = allQueenPositions[j];
          // Check if queens are diagonally adjacent (one square away diagonally)
          const rowDiff = Math.abs(queen1.row - queen2.row);
          const colDiff = Math.abs(queen1.col - queen2.col);
          if (rowDiff === 1 && colDiff === 1) {
            // Queens are diagonally touching, mark both as errors
            diagonalConflicts.add(`${queen1.row},${queen1.col}`);
            diagonalConflicts.add(`${queen2.row},${queen2.col}`);
          }
        }
      }

      // Add diagonal conflicts to error squares (no delay needed, show immediately)
      for (const squareKey of diagonalConflicts) {
        errorSquaresSet.add(squareKey);
      }

      // Show error messages for detected errors
      this.showErrorMessages(errorSquaresSet, allQueenPositions, diagonalConflicts.size > 0);

      // Update error squares
      this.errorSquares = errorSquaresSet;
    },

    showErrorMessages(
      errorSquares: Set<string>,
      queenPositions: { row: number; col: number }[],
      hasDiagonalConflicts: boolean
    ) {
      // Clear any existing timeout
      if (this.errorMessageTimeout !== null) {
        clearTimeout(this.errorMessageTimeout);
        this.errorMessageTimeout = null;
      }

      // If no errors, clear message
      if (errorSquares.size === 0) {
        this.errorMessage = null;
        return;
      }

      // Determine which error type to show (prioritize diagonal conflicts)
      let message: string | null = null;

      if (hasDiagonalConflicts) {
        message = 'Queens cannot touch diagonally';
      } else {
        const lineCoverageRequired = requiresLineCoverage(
          this.targetQueenCount,
          this.orthogonalMinDistance,
          this.gridSize
        );

        // Check for same-row distance conflicts
        for (let row = 0; row < this.gridSize; row++) {
          const queensInRow = queenPositions.filter((q) => q.row === row);
          for (let index = 0; index < queensInRow.length; index++) {
            for (let nextIndex = index + 1; nextIndex < queensInRow.length; nextIndex++) {
              if (
                Math.abs(queensInRow[index].col - queensInRow[nextIndex].col) <
                this.orthogonalMinDistance
              ) {
                message = `Queens in the same row must be at least ${this.orthogonalMinDistance} apart`;
                break;
              }
            }
            if (message) break;
          }
          if (message) break;
        }

        // Check for same-column distance conflicts
        if (!message) {
          for (let col = 0; col < this.gridSize; col++) {
            const queensInCol = queenPositions.filter((q) => q.col === col);
            for (let index = 0; index < queensInCol.length; index++) {
              for (let nextIndex = index + 1; nextIndex < queensInCol.length; nextIndex++) {
                if (
                  Math.abs(queensInCol[index].row - queensInCol[nextIndex].row) <
                  this.orthogonalMinDistance
                ) {
                  message = `Queens in the same column must be at least ${this.orthogonalMinDistance} apart`;
                  break;
                }
              }
              if (message) break;
            }
            if (message) break;
          }
        }

        if (!message && lineCoverageRequired) {
          for (let row = 0; row < this.gridSize; row++) {
            if (this.playerMarks[row].every((mark) => mark === 'flag')) {
              message = 'Each row must still allow a queen';
              break;
            }
          }
        }

        if (!message && lineCoverageRequired) {
          for (let col = 0; col < this.gridSize; col++) {
            if (this.playerMarks.every((row) => row[col] === 'flag')) {
              message = 'Each column must still allow a queen';
              break;
            }
          }
        }

        // Check for multiple queens in color groups
        if (!message) {
          const colorGroups: { [color: string]: { row: number; col: number }[] } = {};
          for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
              const color = this.grid[row][col].groupColor;
              if (!color) continue;
              if (!colorGroups[color]) {
                colorGroups[color] = [];
              }
              colorGroups[color].push({ row, col });
            }
          }

          for (const color in colorGroups) {
            const squares = colorGroups[color];
            const queensInColor = queenPositions.filter((q) =>
              squares.some((s) => s.row === q.row && s.col === q.col)
            );
            if (queensInColor.length > 1) {
              message = 'Only 1 queen per color group';
              break;
            }
          }
        }
      }

      // Only update message if it changed (to avoid flickering)
      if (message !== this.errorMessage) {
        this.errorMessage = message;
        // Auto-hide after 3 seconds
        this.errorMessageTimeout = window.setTimeout(() => {
          this.errorMessage = null;
          this.errorMessageTimeout = null;
        }, 3000);
      }
    },

    startErrorChecking() {
      // Clear any existing interval
      this.stopErrorChecking();

      // Check immediately
      this.checkFullyFlaggedGroups();

      // Then check periodically (every 100ms for responsive updates)
      this.errorCheckInterval = window.setInterval(() => {
        this.checkFullyFlaggedGroups();
      }, 100);
    },

    stopErrorChecking() {
      if (this.errorCheckInterval !== null) {
        clearInterval(this.errorCheckInterval);
        this.errorCheckInterval = null;
      }
      // Clear error state
      this.errorSquares.clear();
      this.flaggedGroupTimestamps.clear();
      // Clear error message
      if (this.errorMessageTimeout !== null) {
        clearTimeout(this.errorMessageTimeout);
        this.errorMessageTimeout = null;
      }
      this.errorMessage = null;
    },

    startProgressSaving() {
      if (!this.persistProgressEnabled) {
        this.stopProgressSaving();
        return;
      }

      // Clear any existing interval
      this.stopProgressSaving();

      // Save immediately
      if (this.currentPuzzleId !== null && !this.isComplete) {
        const startTime =
          this.currentMode === 'speed' ? useSpeedModeStore().puzzleStartTime : this.puzzleStartTime;
        savePuzzleProgress(this.currentPuzzleId, this.playerMarks, startTime);
      }

      // Then save periodically every second
      this.progressSaveInterval = window.setInterval(() => {
        if (this.currentPuzzleId !== null && !this.isComplete) {
          const startTime =
            this.currentMode === 'speed'
              ? useSpeedModeStore().puzzleStartTime
              : this.puzzleStartTime;
          savePuzzleProgress(this.currentPuzzleId, this.playerMarks, startTime);
        } else {
          // Stop saving if puzzle is complete
          this.stopProgressSaving();
        }
      }, 1000);
    },

    stopProgressSaving() {
      if (this.progressSaveInterval !== null) {
        clearInterval(this.progressSaveInterval);
        this.progressSaveInterval = null;
      }
    },
  },
});
