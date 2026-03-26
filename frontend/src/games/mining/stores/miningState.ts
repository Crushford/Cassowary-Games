import type {
  MiningDepthLevel,
  MiningFieldId,
  MiningMagpieSkillId,
  MiningPermitTierId,
  MiningPhase,
  MiningProgressionTab,
  MiningToolUpgradeId,
} from '../game/types';
import { createBooleanGrid } from '../game/utils/createBooleanGrid';
import { STARTING_COINS, STARTING_FOOD } from './miningConfig';

export interface MiningBoardState {
  currentPuzzleId: string | null;
  boardSize: number;
  truthGold: boolean[][];
  truthQuartz: boolean[][];
  regionIds: string[][];
  revealed: boolean[][];
  playerFlags: boolean[][];
  systemFlags: boolean[][];
  pendingLevelTimeout: number | null;
}

export interface MiningRunState {
  phase: MiningPhase;
  currentLevel: number;
  foundGoldCount: number;
  daysElapsed: number;
  highestUnlockedDepthLevel: MiningDepthLevel;
  currentDepthLevel: MiningDepthLevel;
  deathMessage: string | null;
  hintUnlocked: boolean;
  shownHintDepths: MiningDepthLevel[];
}

export interface MiningEconomyState {
  goldTotal: number;
  coinsTotal: number;
  foodTotal: number;
}

export interface MiningProgressionState {
  selectedTab: MiningProgressionTab;
  ownedFieldIds: MiningFieldId[];
  selectedFieldId: MiningFieldId;
  magpieSkillIds: MiningMagpieSkillId[];
  ownedPermitTierIds: MiningPermitTierId[];
  activePermitTierId: MiningPermitTierId | null;
  ownedToolUpgradeIds: MiningToolUpgradeId[];
}

export interface MiningUiState {
  progressionMenuOpen: boolean;
  showSettingsModal: boolean;
  showIntroModal: boolean;
  hasSeenIntroThisRun: boolean;
  showDeathModal: boolean;
  showHintModal: boolean;
  showUpgradeExplanation: boolean;
  upgradeExplanationTitle: string | null;
  upgradeExplanationMessage: string | null;
  errorMessage: string | null;
  errorTick: number;
  lastActionMessage: string;
}

export interface MiningSystemState {
  persistenceInitialized: boolean;
  persistenceHydrating: boolean;
}

export interface MiningStoreState {
  board: MiningBoardState;
  run: MiningRunState;
  economy: MiningEconomyState;
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
      playerFlags: createBooleanGrid(5),
      systemFlags: createBooleanGrid(5),
      pendingLevelTimeout: null,
    },
    run: {
      phase: 'idle',
      currentLevel: 0,
      foundGoldCount: 0,
      daysElapsed: 0,
      highestUnlockedDepthLevel: 1,
      currentDepthLevel: 1,
      deathMessage: null,
      hintUnlocked: false,
      shownHintDepths: [],
    },
    economy: {
      goldTotal: 0,
      coinsTotal: STARTING_COINS,
      foodTotal: STARTING_FOOD,
    },
    progression: {
      selectedTab: 'food-shop',
      ownedFieldIds: ['training-field'],
      selectedFieldId: 'training-field',
      magpieSkillIds: [],
      ownedPermitTierIds: [],
      activePermitTierId: null,
      ownedToolUpgradeIds: [],
    },
    ui: {
      progressionMenuOpen: false,
      showSettingsModal: false,
      showIntroModal: false,
      hasSeenIntroThisRun: false,
      showDeathModal: false,
      showHintModal: false,
      showUpgradeExplanation: false,
      upgradeExplanationTitle: null,
      upgradeExplanationMessage: null,
      errorMessage: null,
      errorTick: 0,
      lastActionMessage:
        'Prototype mode: every progression item costs 1 coin, and every dig costs 1 food.',
    },
    system: {
      persistenceInitialized: false,
      persistenceHydrating: false,
    },
  };
}
