import type {
  MiningExchangeLevelDefinition,
  MiningFlagType,
  MiningMagpieSkillId,
  MiningPhase,
  MiningProgressionTab,
  MiningTownStep,
  MiningToolUpgradeId,
} from '../game/types';
import { createBooleanGrid } from '../game/utils/createBooleanGrid';
import { EXCHANGE_LEVELS, STARTING_GOLD } from './miningConfig';

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
  truthQuartz: boolean[][];
  regionIds: string[][];
  revealed: boolean[][];
  playerFlags: Array<Array<MiningFlagType | null>>;
  systemFlags: Array<Array<MiningFlagType | null>>;
  pendingLevelTimeout: number | null;
}

export interface MiningRunState {
  phase: MiningPhase;
  currentLevel: number;
  foundGoldCount: number;
  daysElapsed: number;
  currentMonthLevel: number;
  bestLevel: number;
  hasSeenHint: boolean;
}

export interface MiningEconomyState {
  goldTotal: number;
}

export interface MiningProgressionState {
  selectedTab: MiningProgressionTab;
  townStep: MiningTownStep;
  showPurchasedUpgrades: boolean;
  exchangeProcessedThisTown: boolean;
  magpieSkillIds: MiningMagpieSkillId[];
  ownedToolUpgradeIds: MiningToolUpgradeId[];
  maxPlotSize: number;
}

export interface MiningUiState {
  progressionMenuOpen: boolean;
  showSettingsModal: boolean;
  showIntroModal: boolean;
  hasSeenIntroThisRun: boolean;
  showFieldExhaustedModal: boolean;
  showHintModal: boolean;
  levelCelebration: {
    level: number;
    returnPercent: number;
    scannerUnlocked: boolean;
  } | null;
  errorMessage: string | null;
  errorTick: number;
  lastActionMessage: string;
}

export interface MiningExchangeState {
  lastSoldGold: number;
  lastBaseValue: number;
  lastReturnPercent: number;
  lastBonus: number;
  lastPayout: number;
  lastReachedLevel: number;
  lastBestLevel: number;
  nextThreshold: number | null;
  progressRatio: number;
}

export interface MiningSystemState {
  persistenceInitialized: boolean;
  persistenceHydrating: boolean;
  flagHistory: Array<Array<Array<MiningFlagType | null>>>;
}

export interface MiningStoreState {
  board: MiningBoardState;
  run: MiningRunState;
  economy: MiningEconomyState;
  exchange: MiningExchangeState;
  progression: MiningProgressionState;
  ui: MiningUiState;
  system: MiningSystemState;
}

export function createInitialMiningState(): MiningStoreState {
  return {
    board: {
      currentPuzzleId: null,
      boardSize: 5,
      truthGold: createBooleanGrid(5),
      truthQuartz: createBooleanGrid(5),
      regionIds: Array.from({ length: 5 }, () => Array(5).fill('.')),
      revealed: createBooleanGrid(5),
      playerFlags: createFlagGrid(5),
      systemFlags: createFlagGrid(5),
      pendingLevelTimeout: null,
    },
    run: {
      phase: 'idle',
      currentLevel: 0,
      foundGoldCount: 0,
      daysElapsed: 0,
      currentMonthLevel: 0,
      bestLevel: 0,
      hasSeenHint: false,
    },
    economy: {
      goldTotal: STARTING_GOLD,
    },
    exchange: {
      lastSoldGold: 0,
      lastBaseValue: 0,
      lastReturnPercent: EXCHANGE_LEVELS[0].returnPercent,
      lastBonus: 0,
      lastPayout: 0,
      lastReachedLevel: 0,
      lastBestLevel: 0,
      nextThreshold: EXCHANGE_LEVELS[1]?.threshold ?? null,
      progressRatio: 0,
    },
    progression: {
      selectedTab: 'gold-exchange',
      townStep: 'none',
      showPurchasedUpgrades: false,
      exchangeProcessedThisTown: false,
      magpieSkillIds: [],
      ownedToolUpgradeIds: [],
      maxPlotSize: 5,
    },
    ui: {
      progressionMenuOpen: false,
      showSettingsModal: false,
      showIntroModal: false,
      hasSeenIntroThisRun: false,
      showFieldExhaustedModal: false,
      showHintModal: false,
      levelCelebration: null,
      errorMessage: null,
      errorTick: 0,
      lastActionMessage: 'Prototype mode: every dig adds 1 day to your run.',
    },
    system: {
      persistenceInitialized: false,
      persistenceHydrating: false,
      flagHistory: [],
    },
  };
}
