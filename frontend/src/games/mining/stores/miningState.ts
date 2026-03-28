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
import { DAYS_PER_MONTH, EXCHANGE_LEVELS, STARTING_COINS, STARTING_FOOD } from './miningConfig';

function createFlagGrid(size: number): Array<Array<MiningFlagType | null>> {
  return Array.from({ length: size }, () => Array<MiningFlagType | null>(size).fill(null));
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
  daysPerMonth: number;
  daysLeftInMonth: number;
  currentMonthLevel: number;
  bestLevel: number;
  goldCollectedThisMonth: number;
  deathMessage: string | null;
  hasSeenHint: boolean;
}

export interface MiningEconomyState {
  goldTotal: number;
  coinsTotal: number;
  foodTotal: number;
}

export interface MiningProgressionState {
  selectedTab: MiningProgressionTab;
  townStep: MiningTownStep;
  showPurchasedUpgrades: boolean;
  exchangeProcessedThisTown: boolean;
  monthlyUpkeepPaid: boolean;
  magpieSkillIds: MiningMagpieSkillId[];
  ownedToolUpgradeIds: MiningToolUpgradeId[];
}

export interface MiningUiState {
  progressionMenuOpen: boolean;
  showSettingsModal: boolean;
  showIntroModal: boolean;
  showMonthOverModal: boolean;
  hasSeenIntroThisRun: boolean;
  showDeathModal: boolean;
  showFieldExhaustedModal: boolean;
  showHintModal: boolean;
  showUpgradeExplanation: boolean;
  levelCelebration: {
    level: number;
    returnPercent: number;
    scannerUnlocked: boolean;
  } | null;
  upgradeExplanationTitle: string | null;
  upgradeExplanationMessage: string | null;
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
      daysPerMonth: DAYS_PER_MONTH,
      daysLeftInMonth: DAYS_PER_MONTH,
      currentMonthLevel: 0,
      bestLevel: 0,
      goldCollectedThisMonth: 0,
      deathMessage: null,
      hasSeenHint: false,
    },
    economy: {
      goldTotal: 0,
      coinsTotal: STARTING_COINS,
      foodTotal: STARTING_FOOD,
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
      selectedTab: 'food-shop',
      townStep: 'none',
      showPurchasedUpgrades: false,
      exchangeProcessedThisTown: false,
      monthlyUpkeepPaid: false,
      magpieSkillIds: [],
      ownedToolUpgradeIds: [],
    },
    ui: {
      progressionMenuOpen: false,
      showSettingsModal: false,
      showIntroModal: false,
      showMonthOverModal: false,
      hasSeenIntroThisRun: false,
      showDeathModal: false,
      showFieldExhaustedModal: false,
      showHintModal: false,
      showUpgradeExplanation: false,
      levelCelebration: null,
      upgradeExplanationTitle: null,
      upgradeExplanationMessage: null,
      errorMessage: null,
      errorTick: 0,
      lastActionMessage:
        'Prototype mode: every progression item costs 1 coin, and each dig uses 1 day.',
    },
    system: {
      persistenceInitialized: false,
      persistenceHydrating: false,
    },
  };
}
