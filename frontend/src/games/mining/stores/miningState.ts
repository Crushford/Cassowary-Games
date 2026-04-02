import type {
  MiningFlagType,
  MiningLeaderboardEntry,
  MiningPhase,
  MiningRavenSkillId,
  MiningToolUpgradeId,
} from '../game/types';
import { createBooleanGrid } from '../game/utils/createBooleanGrid';

function createFlagGrid(size: number): Array<Array<MiningFlagType | null>> {
  return Array.from({ length: size }, () => Array<MiningFlagType | null>(size).fill(null));
}

export function cloneFlagGrid(
  grid: Array<Array<MiningFlagType | null>>
): Array<Array<MiningFlagType | null>> {
  return grid.map((row) => [...row]);
}

export interface MiningBoardState {
  currentPuzzleId: string | null;
  boardSize: number;
  truthGold: boolean[][];
  regionIds: string[][];
  revealed: boolean[][];
  playerFlags: Array<Array<MiningFlagType | null>>;
  systemFlags: Array<Array<MiningFlagType | null>>;
}

export interface MiningRunState {
  phase: MiningPhase;
  currentLevelIndex: number;
  highestUnlockedLevelIndex: number;
  foundGoldCount: number;
  digsUsed: number;
  daysElapsed: number;
}

export interface MiningProgressionState {
  unlockedRavenSkillIds: MiningRavenSkillId[];
  unlockedToolUpgradeIds: MiningToolUpgradeId[];
  earnedRewardIds: string[];
}

export interface MiningUiState {
  showSettingsModal: boolean;
  showLevelIntroModal: boolean;
  showLevelResultModal: boolean;
  hasSeenIntroThisRun: boolean;
  levelResult:
    | {
        passed: boolean;
        clueRevealed: boolean;
      }
    | null
    | undefined;
  errorMessage: string | null;
  errorTick: number;
  lastActionMessage: string;
  leaderboardName: string;
  scoreSubmitted: boolean;
}

export interface MiningLeaderboardState {
  entries: MiningLeaderboardEntry[];
}

export interface MiningSystemState {
  persistenceInitialized: boolean;
  persistenceHydrating: boolean;
  flagHistory: Array<Array<Array<MiningFlagType | null>>>;
}

export interface MiningStoreState {
  board: MiningBoardState;
  run: MiningRunState;
  progression: MiningProgressionState;
  ui: MiningUiState;
  leaderboard: MiningLeaderboardState;
  system: MiningSystemState;
}

export function createInitialMiningState(): MiningStoreState {
  return {
    board: {
      currentPuzzleId: null,
      boardSize: 5,
      truthGold: createBooleanGrid(5),
      regionIds: Array.from({ length: 5 }, () => Array(5).fill('.')),
      revealed: createBooleanGrid(5),
      playerFlags: createFlagGrid(5),
      systemFlags: createFlagGrid(5),
    },
    run: {
      phase: 'idle',
      currentLevelIndex: 0,
      highestUnlockedLevelIndex: 0,
      foundGoldCount: 0,
      digsUsed: 0,
      daysElapsed: 0,
    },
    progression: {
      unlockedRavenSkillIds: [],
      unlockedToolUpgradeIds: [],
      earnedRewardIds: [],
    },
    ui: {
      showSettingsModal: false,
      showLevelIntroModal: false,
      showLevelResultModal: false,
      hasSeenIntroThisRun: false,
      levelResult: null,
      errorMessage: null,
      errorTick: 0,
      lastActionMessage: 'Find the gold and complete the level goals.',
      leaderboardName: '',
      scoreSubmitted: false,
    },
    leaderboard: {
      entries: [],
    },
    system: {
      persistenceInitialized: false,
      persistenceHydrating: false,
      flagHistory: [],
    },
  };
}
