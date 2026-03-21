import { defineStore } from 'pinia';
import { useQueensStore } from './queensStore';
import { useSpeedModeStore } from './speedModeStore';
import type { MarkType } from './queensStore';
import {
  PATTERN_CARD_DEFINITIONS,
  getPatternCardById,
  type PatternCardDefinition,
} from '../utils/incrementalPatternCards';
import { buildIncrementalAutomationPlan } from '../utils/incrementalAutomation';
import {
  BASE_TIME_SECONDS,
  MIN_TIME_SECONDS,
  ONE_OFF_UPGRADE_IDS,
  PATTERN_CARD_COST_STEP,
  RISK_BASE_COST,
  RISK_COST_STEP,
  RISK_SCORE_FACTOR,
  SIZE_UP_COST,
  type OneOffUpgradeId,
  getOneOffUpgradeCost,
  getOneOffUpgradeDescription,
  getOneOffUpgradeTitle,
} from '../utils/incrementalUpgrades';

function findPatternCardInAll(
  id: string,
  customCards: PatternCardDefinition[]
): PatternCardDefinition | null {
  return getPatternCardById(id) || customCards.find((card) => card.id === id) || null;
}

const AUTOMATION_UPGRADE_STATE_KEYS = {
  'auto-queen-color': 'autoQueenByColorPurchased',
  'auto-queen-row': 'autoQueenByRowPurchased',
  'auto-queen-column': 'autoQueenByColumnPurchased',
} as const satisfies Record<AutomationUpgradeId, string>;

export type IncrementalRunStatus = 'idle' | 'playing' | 'upgrade-select' | 'game-over';

interface PuzzleScoreBreakdown {
  basePoints: number;
  rawScore: number;
  minimumApplied: boolean;
  multiplier: number;
  scoreAwarded: number;
  timeRemaining: number;
  totalTime: number;
}

interface OneOffUpgradeOption {
  id: OneOffUpgradeId;
  title: string;
  description: string;
  cost: number;
  canBuy: boolean;
}

type AutomationUpgradeId = 'auto-queen-color' | 'auto-queen-row' | 'auto-queen-column';

interface AutomationUpgradeOption {
  id: AutomationUpgradeId;
  title: string;
  description: string;
  cost: number;
  canBuy: boolean;
}

const BASE_POINTS = 100;
const AUTOMATION_STEP_DELAY_MS = 45;
const AUTOMATION_INPUT_GRACE_MS = 900;
const INCREMENTAL_QUEENS_SAVE_KEY = 'incremental-queens-save-v1';

interface IncrementalSavedRunState {
  runStatus: Exclude<IncrementalRunStatus, 'idle' | 'game-over'>;
  runScore: number;
  runBank: number;
  puzzlesSolved: number;
  riskLevel: number;
  autoFlagPurchased: boolean;
  autoNextPuzzlePurchased: boolean;
  rotatePuzzlePurchased: boolean;
  autoNextPuzzleEnabled: boolean;
  autoQueenByColorPurchased: boolean;
  autoQueenByRowPurchased: boolean;
  autoQueenByColumnPurchased: boolean;
  currentPuzzleSize: number;
  currentPuzzleTimeLimit: number;
  timeRemaining: number;
  lastScoreBreakdown: PuzzleScoreBreakdown | null;
  lastPuzzleId: string | null;
  ownedPatternCardIds: string[];
  customPatternCards: PatternCardDefinition[];
  customPatternCardCounter: number;
  selectedOneOffUpgradeId: OneOffUpgradeId | null;
  automationEnabled: boolean;
  previousPlacementMode: 'auto' | 'flag' | 'queen' | null;
  previousAutoFlagging: boolean | null;
}

interface IncrementalSavedBoardState {
  puzzleId: string;
  currentMode: 'standard' | 'rotate';
  placementMode: 'auto' | 'flag' | 'queen';
  autoFlagging: boolean;
  playerMarks: MarkType[][];
  moveHistory: MarkType[][][];
  lastManualInteractionAt: number;
}

interface IncrementalSavedRun {
  version: 1;
  savedAt: number;
  run: IncrementalSavedRunState;
  board: IncrementalSavedBoardState;
}

interface IncrementalSavedRunSummary {
  bank: number;
  puzzlesSolved: number;
  puzzleSize: number;
  runStatus: Exclude<IncrementalRunStatus, 'idle' | 'game-over'>;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function shouldPersistRun(
  status: IncrementalRunStatus
): status is Exclude<IncrementalRunStatus, 'idle' | 'game-over'> {
  return status === 'playing' || status === 'upgrade-select';
}

function toSavedRunSummary(snapshot: IncrementalSavedRun): IncrementalSavedRunSummary {
  return {
    bank: snapshot.run.runBank,
    puzzlesSolved: snapshot.run.puzzlesSolved,
    puzzleSize: snapshot.run.currentPuzzleSize,
    runStatus: snapshot.run.runStatus,
  };
}

function readSavedRun(): IncrementalSavedRun | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(INCREMENTAL_QUEENS_SAVE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as IncrementalSavedRun;
    if (parsed?.version !== 1 || !parsed.run || !parsed.board?.puzzleId) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Error reading incremental queens save from localStorage:', error);
    return null;
  }
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createInitialRunState() {
  return {
    runStatus: 'idle' as IncrementalRunStatus,
    runScore: 0,
    runBank: 0,
    puzzlesSolved: 0,
    riskLevel: 0,
    autoFlagPurchased: false,
    autoNextPuzzlePurchased: false,
    rotatePuzzlePurchased: false,
    autoNextPuzzleEnabled: false,
    autoQueenByColorPurchased: false,
    autoQueenByRowPurchased: false,
    autoQueenByColumnPurchased: false,
    currentPuzzleSize: 5,
    currentPuzzleTimeLimit: BASE_TIME_SECONDS,
    timeRemaining: BASE_TIME_SECONDS,
    timerInterval: null as number | null,
    patternScanInterval: null as number | null,
    lastScoreBreakdown: null as PuzzleScoreBreakdown | null,
    lastPuzzleId: null as string | null,
    ownedPatternCardIds: [] as string[],
    customPatternCards: [] as PatternCardDefinition[],
    customPatternCardCounter: 1,
    selectedOneOffUpgradeId: null as OneOffUpgradeId | null,
    isLoadingPuzzle: false,
    isAutomationInProgress: false,
    autoNextPuzzleTimeout: null as number | null,
    automationEnabled: true,
  };
}

export const useIncrementalQueensStore = defineStore('incrementalQueens', {
  state: () => ({
    ...createInitialRunState(),
    previousPlacementMode: null as 'auto' | 'flag' | 'queen' | null,
    previousAutoFlagging: null as boolean | null,
    savedRunSummary: null as IncrementalSavedRunSummary | null,
    persistenceInitialized: false,
    persistenceHydrating: false,
  }),

  getters: {
    isPlaying: (state) => state.runStatus === 'playing',
    formattedTimeRemaining: (state): string => {
      const minutes = Math.floor(state.timeRemaining / 60);
      const seconds = Math.floor(state.timeRemaining % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    currentScoreMultiplier: (state): number => {
      return Math.pow(RISK_SCORE_FACTOR, state.riskLevel);
    },
    nextRiskCost: (state): number => {
      return RISK_BASE_COST + state.riskLevel * RISK_COST_STEP;
    },
    canAffordRisk(state): boolean {
      return state.runBank >= this.nextRiskCost && state.currentPuzzleTimeLimit > MIN_TIME_SECONDS;
    },
    canStartNextPuzzle(state): boolean {
      return (
        state.runStatus === 'upgrade-select' &&
        !state.isLoadingPuzzle &&
        !state.isAutomationInProgress
      );
    },
    canBuySizeUpGoal(state): boolean {
      return state.currentPuzzleSize < 9 && state.runBank >= SIZE_UP_COST;
    },
    sizeUpGoalCost(): number {
      return SIZE_UP_COST;
    },
    sizeUpGoalLabel(state): string {
      const nextSize = state.currentPuzzleSize + 1;
      return `${state.currentPuzzleSize}x${state.currentPuzzleSize} -> ${nextSize}x${nextSize}`;
    },
    allPatternCards(state): PatternCardDefinition[] {
      return [...PATTERN_CARD_DEFINITIONS, ...state.customPatternCards];
    },
    canCreateCustomPatternCard(state): boolean {
      return PATTERN_CARD_DEFINITIONS.every((card) => state.ownedPatternCardIds.includes(card.id));
    },
    patternCardCost:
      (state) =>
      (patternCardId: string): number => {
        const card = findPatternCardInAll(patternCardId, state.customPatternCards);
        if (!card) return 0;
        return card.cost + state.ownedPatternCardIds.length * PATTERN_CARD_COST_STEP;
      },
    canAffordPatternCard:
      (state) =>
      (patternCardId: string): boolean => {
        if (state.ownedPatternCardIds.includes(patternCardId)) return false;
        const card = findPatternCardInAll(patternCardId, state.customPatternCards);
        if (!card) return false;
        const cost = card.cost + state.ownedPatternCardIds.length * PATTERN_CARD_COST_STEP;
        return state.runBank >= cost;
      },
    riskShopPreview(state): {
      currentLevel: number;
      nextLevel: number;
      currentMultiplier: number;
      nextMultiplier: number;
      currentTimeLimit: number;
      nextTimeLimit: number;
      cost: number;
    } {
      const currentLevel = state.riskLevel;
      const nextLevel = state.riskLevel + 1;
      const currentMultiplier = Math.pow(RISK_SCORE_FACTOR, currentLevel);
      const nextMultiplier = Math.pow(RISK_SCORE_FACTOR, nextLevel);
      // Note: currentMultiplier mirrors currentScoreMultiplier; kept inline to avoid `this` in a state-arrow getter

      return {
        currentLevel,
        nextLevel,
        currentMultiplier,
        nextMultiplier,
        currentTimeLimit: state.currentPuzzleTimeLimit,
        nextTimeLimit: Math.max(MIN_TIME_SECONDS, Math.floor(state.currentPuzzleTimeLimit / 2)),
        cost: RISK_BASE_COST + currentLevel * RISK_COST_STEP,
      };
    },
    availableManagePatternCards(): PatternCardDefinition[] {
      return this.allPatternCards.filter((card) => !this.ownedPatternCardIds.includes(card.id));
    },
    ownedPatternCards(state): PatternCardDefinition[] {
      return state.ownedPatternCardIds
        .map((cardId) => findPatternCardInAll(cardId, state.customPatternCards))
        .filter((card): card is PatternCardDefinition => card !== null);
    },
    availableOneOffUpgrades(state): OneOffUpgradeOption[] {
      const purchased: Record<string, boolean> = {
        'auto-flag': state.autoFlagPurchased,
        'auto-next-puzzle': state.autoNextPuzzlePurchased,
        'rotate-puzzle': state.rotatePuzzlePurchased,
      };
      return ONE_OFF_UPGRADE_IDS.filter((id) => !purchased[id]).map((id) => {
        const cost = getOneOffUpgradeCost(id);

        return {
          id,
          title: getOneOffUpgradeTitle(id, state.currentPuzzleSize),
          description: getOneOffUpgradeDescription(id),
          cost,
          canBuy: state.runBank >= cost,
        };
      });
    },
    automationUpgradeOptions(state): AutomationUpgradeOption[] {
      const ids: AutomationUpgradeId[] = [
        'auto-queen-color',
        'auto-queen-row',
        'auto-queen-column',
      ];
      return ids.map((id) => {
        const cost = getOneOffUpgradeCost(id);
        const owned = state[AUTOMATION_UPGRADE_STATE_KEYS[id]];
        return {
          id,
          title: getOneOffUpgradeTitle(id, state.currentPuzzleSize),
          description: getOneOffUpgradeDescription(id),
          cost,
          canBuy: !owned && state.runBank >= cost,
        };
      });
    },
    selectedOneOffUpgrade(): OneOffUpgradeOption | null {
      if (!this.selectedOneOffUpgradeId) return null;
      return (
        this.availableOneOffUpgrades.find((u) => u.id === this.selectedOneOffUpgradeId) || null
      );
    },
    hasSavedRun: (state) => state.savedRunSummary !== null,
  },

  actions: {
    initializePersistence() {
      if (this.persistenceInitialized) {
        return;
      }

      this.persistenceInitialized = true;
      this.refreshSavedRunSummary();

      this.$subscribe(() => {
        if (this.persistenceHydrating) {
          return;
        }

        this.persistRunState();
      });
    },

    buildSavedRunSnapshot(): IncrementalSavedRun | null {
      if (!shouldPersistRun(this.runStatus)) {
        return null;
      }

      const queensStore = useQueensStore();
      const puzzleId = queensStore.currentPuzzleId;
      if (puzzleId === null) {
        return null;
      }

      return {
        version: 1,
        savedAt: Date.now(),
        run: {
          runStatus: this.runStatus,
          runScore: this.runScore,
          runBank: this.runBank,
          puzzlesSolved: this.puzzlesSolved,
          riskLevel: this.riskLevel,
          autoFlagPurchased: this.autoFlagPurchased,
          autoNextPuzzlePurchased: this.autoNextPuzzlePurchased,
          rotatePuzzlePurchased: this.rotatePuzzlePurchased,
          autoNextPuzzleEnabled: this.autoNextPuzzleEnabled,
          autoQueenByColorPurchased: this.autoQueenByColorPurchased,
          autoQueenByRowPurchased: this.autoQueenByRowPurchased,
          autoQueenByColumnPurchased: this.autoQueenByColumnPurchased,
          currentPuzzleSize: this.currentPuzzleSize,
          currentPuzzleTimeLimit: this.currentPuzzleTimeLimit,
          timeRemaining: this.timeRemaining,
          lastScoreBreakdown: cloneSerializable(this.lastScoreBreakdown),
          lastPuzzleId: this.lastPuzzleId,
          ownedPatternCardIds: [...this.ownedPatternCardIds],
          customPatternCards: cloneSerializable(this.customPatternCards),
          customPatternCardCounter: this.customPatternCardCounter,
          selectedOneOffUpgradeId: this.selectedOneOffUpgradeId,
          automationEnabled: this.automationEnabled,
          previousPlacementMode: this.previousPlacementMode,
          previousAutoFlagging: this.previousAutoFlagging,
        },
        board: {
          puzzleId: String(puzzleId),
          currentMode: queensStore.currentMode === 'rotate' ? 'rotate' : 'standard',
          placementMode: queensStore.uiState.placementMode,
          autoFlagging: queensStore.uiState.autoFlagging,
          playerMarks: cloneSerializable(queensStore.playerMarks),
          moveHistory: cloneSerializable(queensStore.moveHistory),
          lastManualInteractionAt: queensStore.lastManualInteractionAt,
        },
      };
    },

    persistRunState() {
      if (!canUseStorage()) {
        return;
      }

      const snapshot = this.buildSavedRunSnapshot();
      if (!snapshot) {
        this.clearSavedRun();
        return;
      }

      try {
        window.localStorage.setItem(INCREMENTAL_QUEENS_SAVE_KEY, JSON.stringify(snapshot));
      } catch (error) {
        console.error('Error saving incremental queens run to localStorage:', error);
      }
    },

    clearSavedRun() {
      if (canUseStorage()) {
        window.localStorage.removeItem(INCREMENTAL_QUEENS_SAVE_KEY);
      }
      this.savedRunSummary = null;
    },

    refreshSavedRunSummary() {
      const snapshot = readSavedRun();
      this.savedRunSummary = snapshot ? toSavedRunSummary(snapshot) : null;
    },

    async continueSavedRun(): Promise<boolean> {
      const snapshot = readSavedRun();
      if (!snapshot) {
        this.savedRunSummary = null;
        return false;
      }

      const queensStore = useQueensStore();
      const speedModeStore = useSpeedModeStore();

      this.stopTimer();
      this.stopPatternScan();
      this.stopAutoNextPuzzleTimer();
      this.isAutomationInProgress = false;

      if (speedModeStore.timerDuration !== null) {
        speedModeStore.reset();
      }
      if (queensStore.isTutorialMode) {
        queensStore.exitTutorialMode();
      }
      queensStore.stopProgressSaving();
      queensStore.stopErrorChecking();

      this.persistenceHydrating = true;
      Object.assign(this, createInitialRunState(), snapshot.run);
      this.previousPlacementMode = snapshot.run.previousPlacementMode;
      this.previousAutoFlagging = snapshot.run.previousAutoFlagging;
      this.savedRunSummary = toSavedRunSummary(snapshot);

      await this.ensurePuzzleDatabaseLoaded();
      await queensStore.loadPuzzleById(snapshot.board.puzzleId, { persistProgress: false });
      queensStore.setMode(snapshot.board.currentMode);
      queensStore.playerMarks = cloneSerializable(snapshot.board.playerMarks);
      queensStore.moveHistory = cloneSerializable(snapshot.board.moveHistory);
      queensStore.setPlacementMode(snapshot.board.placementMode);
      queensStore.setAutoFlagging(snapshot.board.autoFlagging);
      queensStore.lastManualInteractionAt = snapshot.board.lastManualInteractionAt;
      queensStore.puzzleStartTime = Date.now();
      queensStore.checkBoardCompletion();
      queensStore.startErrorChecking();

      if (this.runStatus === 'playing') {
        this.startTimer();
        this.startPatternScan();
      }

      this.persistenceHydrating = false;
      return true;
    },

    rollOneOffUpgrade() {
      const pool = this.availableOneOffUpgrades;
      if (pool.length === 0) {
        this.selectedOneOffUpgradeId = null;
        return;
      }
      const randomIndex = Math.floor(Math.random() * pool.length);
      this.selectedOneOffUpgradeId = pool[randomIndex].id;
    },

    stopTimer() {
      if (this.timerInterval !== null) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },

    stopPatternScan() {
      if (this.patternScanInterval !== null) {
        clearInterval(this.patternScanInterval);
        this.patternScanInterval = null;
      }
    },

    stopAutoNextPuzzleTimer() {
      if (this.autoNextPuzzleTimeout !== null) {
        clearTimeout(this.autoNextPuzzleTimeout);
        this.autoNextPuzzleTimeout = null;
      }
    },

    startTimer() {
      this.stopTimer();
      this.timerInterval = window.setInterval(() => {
        if (this.runStatus !== 'playing') {
          this.stopTimer();
          return;
        }

        if (this.timeRemaining > 0) {
          this.timeRemaining -= 1;
          return;
        }

        this.handleTimeout();
      }, 1000);
    },

    async applyOwnedPatternCards() {
      if (!this.automationEnabled) {
        return;
      }
      if (this.runStatus !== 'playing') {
        return;
      }
      if (this.isAutomationInProgress) {
        return;
      }

      const hasPatternCards = this.ownedPatternCardIds.length > 0;
      const hasAutoQueen =
        this.autoQueenByColorPurchased ||
        this.autoQueenByRowPurchased ||
        this.autoQueenByColumnPurchased;

      if (!hasPatternCards && !hasAutoQueen) {
        return;
      }

      const queensStore = useQueensStore();
      if (Date.now() - queensStore.lastManualInteractionAt < AUTOMATION_INPUT_GRACE_MS) {
        return;
      }

      const { actions, flagsPlaced } = buildIncrementalAutomationPlan({
        grid: queensStore.grid,
        initialMarks: queensStore.playerMarks,
        patternCards: hasPatternCards ? this.ownedPatternCards : [],
        autoQueenRules: {
          byColor: this.autoQueenByColorPurchased,
          byRow: this.autoQueenByRowPurchased,
          byColumn: this.autoQueenByColumnPurchased,
        },
      });
      if (actions.length === 0) {
        return;
      }

      this.isAutomationInProgress = true;
      try {
        for (const action of actions) {
          if (!this.automationEnabled) {
            break;
          }
          if (this.runStatus !== 'playing') {
            break;
          }

          if (queensStore.playerMarks[action.row][action.col] !== null) {
            continue;
          }
          if (action.type === 'flag') {
            queensStore.placeFlag(action.row, action.col, 'automation');
            queensStore.triggerAutoFlagAnimation(action.row, action.col, 'pattern', 0);
          } else {
            queensStore.placeQueen(action.row, action.col, 'automation');
          }

          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, AUTOMATION_STEP_DELAY_MS);
          });
        }
      } finally {
        this.isAutomationInProgress = false;
      }

      if (flagsPlaced > 0) {
        queensStore.showAutoFlagCombo(flagsPlaced);
      }
      if (this.runStatus === 'playing' && queensStore.isComplete) {
        this.handlePuzzleSolved();
      }
    },

    startPatternScan() {
      this.stopPatternScan();

      if (this.automationEnabled) {
        void this.applyOwnedPatternCards();
      }

      this.patternScanInterval = window.setInterval(() => {
        if (this.automationEnabled) {
          void this.applyOwnedPatternCards();
        }
      }, 1000);
    },

    async ensurePuzzleDatabaseLoaded() {
      const queensStore = useQueensStore();
      if (!queensStore.puzzleDatabase) {
        const success = await queensStore.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
      }
    },

    setAutomationEnabled(enabled: boolean) {
      this.automationEnabled = enabled;
    },

    pickNextPuzzleId(): string {
      const queensStore = useQueensStore();
      const sizeKey = `${this.currentPuzzleSize}x${this.currentPuzzleSize}`;
      const puzzlesForSize = (queensStore.puzzleDatabase?.[sizeKey] || []) as Array<{ id: string }>;
      const originalVariants = puzzlesForSize.filter((puzzle) =>
        typeof puzzle.id === 'string' ? puzzle.id.endsWith('-0') : false
      );

      if (originalVariants.length === 0) {
        throw new Error(`No ${sizeKey} puzzles available for Incremental Queens`);
      }

      const selectionPool =
        this.lastPuzzleId && originalVariants.length > 1
          ? originalVariants.filter((puzzle) => puzzle.id !== this.lastPuzzleId)
          : originalVariants;

      const randomIndex = Math.floor(Math.random() * selectionPool.length);
      return selectionPool[randomIndex].id;
    },

    async loadFreshPuzzleSession() {
      const queensStore = useQueensStore();
      await this.ensurePuzzleDatabaseLoaded();

      const puzzleId = this.pickNextPuzzleId();

      await queensStore.loadPuzzleById(puzzleId, { persistProgress: false });
      queensStore.clearAll();

      queensStore.setPlacementMode('auto');
      queensStore.setAutoFlagging(this.autoFlagPurchased);
      queensStore.setMode(this.rotatePuzzlePurchased ? 'rotate' : 'standard');

      this.lastPuzzleId = puzzleId;
    },

    async startRun() {
      const queensStore = useQueensStore();
      const speedModeStore = useSpeedModeStore();

      this.stopTimer();
      this.stopPatternScan();
      this.stopAutoNextPuzzleTimer();

      if (speedModeStore.timerDuration !== null) {
        speedModeStore.reset();
      }
      if (queensStore.isTutorialMode) {
        queensStore.exitTutorialMode();
      }
      if (queensStore.isRotateMode) {
        queensStore.resetRotateMode();
      }
      queensStore.setMode('standard');

      this.previousPlacementMode = queensStore.uiState.placementMode;
      this.previousAutoFlagging = queensStore.uiState.autoFlagging;

      Object.assign(this, createInitialRunState());
      this.runStatus = 'playing';

      await this.startNextPuzzle();
    },

    async startNextPuzzle() {
      this.isLoadingPuzzle = true;
      this.lastScoreBreakdown = null;

      try {
        await this.loadFreshPuzzleSession();
      } finally {
        this.isLoadingPuzzle = false;
      }

      this.timeRemaining = this.currentPuzzleTimeLimit;
      this.runStatus = 'playing';
      this.startTimer();
      this.startPatternScan();
    },

    handlePuzzleSolved() {
      if (this.runStatus !== 'playing') {
        return;
      }

      this.stopTimer();
      this.stopPatternScan();

      const multiplier = this.currentScoreMultiplier * (this.rotatePuzzlePurchased ? 3 : 1);
      const rawScore = Math.round(BASE_POINTS * (this.timeRemaining / this.currentPuzzleTimeLimit));
      const minimumApplied = rawScore < 10;
      const scoreBeforeMultiplier = Math.max(10, rawScore);
      const scoreAwarded = Math.round(scoreBeforeMultiplier * multiplier);

      this.lastScoreBreakdown = {
        basePoints: BASE_POINTS,
        rawScore,
        minimumApplied,
        multiplier,
        scoreAwarded,
        timeRemaining: this.timeRemaining,
        totalTime: this.currentPuzzleTimeLimit,
      };

      this.runScore += scoreAwarded;
      this.runBank += scoreAwarded;
      this.puzzlesSolved += 1;
      this.runStatus = 'upgrade-select';
      this.rollOneOffUpgrade();

      if (this.autoNextPuzzlePurchased && this.autoNextPuzzleEnabled) {
        this.stopAutoNextPuzzleTimer();
        this.autoNextPuzzleTimeout = window.setTimeout(() => {
          if (
            this.runStatus === 'upgrade-select' &&
            this.autoNextPuzzlePurchased &&
            this.autoNextPuzzleEnabled
          ) {
            void this.startNextPuzzle();
          }
        }, 350);
      }
    },

    buyRiskUpgrade() {
      const cost = this.nextRiskCost;
      if (this.runBank < cost) {
        return;
      }
      if (this.currentPuzzleTimeLimit <= MIN_TIME_SECONDS) {
        return;
      }

      this.runBank -= cost;
      this.riskLevel += 1;
      this.currentPuzzleTimeLimit = Math.max(
        MIN_TIME_SECONDS,
        Math.floor(this.currentPuzzleTimeLimit / 2)
      );
    },

    buyPatternCard(patternCardId: string) {
      if (this.ownedPatternCardIds.includes(patternCardId)) {
        return;
      }

      const card = findPatternCardInAll(patternCardId, this.customPatternCards);
      if (!card) {
        return;
      }
      const currentCost = this.patternCardCost(patternCardId);
      if (this.runBank < currentCost) {
        return;
      }

      this.runBank -= currentCost;
      this.ownedPatternCardIds.push(patternCardId);
    },

    removePatternCard(patternCardId: string) {
      this.ownedPatternCardIds = this.ownedPatternCardIds.filter((id) => id !== patternCardId);
    },

    purchaseOneOffUpgrade(id: OneOffUpgradeId): boolean {
      const option = this.availableOneOffUpgrades.find((upgrade) => upgrade.id === id);
      if (!option || !option.canBuy) return false;

      this.runBank -= option.cost;

      // Only one-off ids from ONE_OFF_UPGRADE_IDS appear in availableOneOffUpgrades.
      // 'auto-queen-*' use buyAutomationUpgrade; 'size-up' uses buySizeUpGoal.
      switch (id) {
        case 'auto-flag':
          this.autoFlagPurchased = true;
          break;
        case 'auto-next-puzzle':
          this.autoNextPuzzlePurchased = true;
          this.autoNextPuzzleEnabled = true;
          break;
        case 'rotate-puzzle':
          this.rotatePuzzlePurchased = true;
          break;
      }

      this.rollOneOffUpgrade();
      return true;
    },

    buySelectedOneOffUpgrade() {
      if (!this.selectedOneOffUpgradeId) {
        return;
      }

      this.purchaseOneOffUpgrade(this.selectedOneOffUpgradeId);
    },

    setAutoNextPuzzleEnabled(enabled: boolean) {
      if (!this.autoNextPuzzlePurchased) {
        this.autoNextPuzzleEnabled = false;
        return;
      }
      this.autoNextPuzzleEnabled = enabled;
    },

    buyAutomationUpgrade(id: AutomationUpgradeId) {
      const option = this.automationUpgradeOptions.find((upgrade) => upgrade.id === id);
      if (!option || !option.canBuy) {
        return;
      }

      this.runBank -= option.cost;
      this[AUTOMATION_UPGRADE_STATE_KEYS[id]] = true;
    },

    createCustomPatternCard(input: {
      id?: string;
      size: number;
      cells: Array<{ row: number; col: number; activeSquare?: boolean }>;
      outputFlags: Array<{ row: number; col: number }>;
    }) {
      if (!this.canCreateCustomPatternCard) {
        return;
      }

      const normalizedSize = Math.min(9, Math.max(3, Math.floor(input.size)));
      const normalizedCells = input.cells
        .filter((cell) => cell.activeSquare === true)
        .filter(
          (cell) =>
            cell.row >= 0 && cell.row < normalizedSize && cell.col >= 0 && cell.col < normalizedSize
        )
        .map((cell) => ({ row: cell.row, col: cell.col, activeSquare: true as const }));

      const normalizedFlags = input.outputFlags
        .filter(
          (flag) =>
            flag.row >= 0 && flag.row < normalizedSize && flag.col >= 0 && flag.col < normalizedSize
        )
        .map((flag) => ({ row: flag.row, col: flag.col }));

      if (normalizedCells.length === 0 || normalizedFlags.length === 0) {
        return;
      }

      const fallbackId = `pc-custom-${this.customPatternCardCounter}`;
      const id = (input.id || '').trim() || fallbackId;
      if (this.allPatternCards.some((card) => card.id === id)) {
        return;
      }

      const newCard: PatternCardDefinition = {
        id,
        cost: 0,
        size: normalizedSize as PatternCardDefinition['size'],
        cells: normalizedCells,
        outputFlags: normalizedFlags,
      };

      this.customPatternCards.push(newCard);
      this.ownedPatternCardIds.push(newCard.id);
      this.customPatternCardCounter += 1;
    },

    resetProgressForSizeUp() {
      this.runScore = 0;
      this.runBank = 0;
      this.puzzlesSolved = 0;
      this.riskLevel = 0;
      // Persist selected one-off convenience upgrades across size-up.
      // Keep current toggle state for auto-next if it's already unlocked.
      this.autoNextPuzzleEnabled = this.autoNextPuzzlePurchased
        ? this.autoNextPuzzleEnabled
        : false;
      this.rotatePuzzlePurchased = false;
      this.autoQueenByColorPurchased = false;
      this.autoQueenByRowPurchased = false;
      this.autoQueenByColumnPurchased = false;
      this.ownedPatternCardIds = [];
      this.customPatternCards = [];
      this.customPatternCardCounter = 1;
      this.currentPuzzleTimeLimit = BASE_TIME_SECONDS;
      this.timeRemaining = BASE_TIME_SECONDS;
      this.lastScoreBreakdown = null;
      this.lastPuzzleId = null;
      this.selectedOneOffUpgradeId = null;
      this.isAutomationInProgress = false;
      this.automationEnabled = true;
      this.stopAutoNextPuzzleTimer();
    },

    async buySizeUpGoal() {
      if (this.currentPuzzleSize >= 9) {
        return;
      }
      if (this.runBank < SIZE_UP_COST) {
        return;
      }

      this.currentPuzzleSize += 1;
      this.resetProgressForSizeUp();
      await this.startNextPuzzle();
    },

    async skipUpgradeSelection() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      this.stopAutoNextPuzzleTimer();
      await this.startNextPuzzle();
    },

    handleTimeout() {
      this.stopTimer();
      this.stopPatternScan();
      this.stopAutoNextPuzzleTimer();
      this.isAutomationInProgress = false;
      this.runStatus = 'game-over';
    },

    cleanupSessionState() {
      const queensStore = useQueensStore();
      this.stopTimer();
      this.stopPatternScan();
      this.stopAutoNextPuzzleTimer();
      this.isAutomationInProgress = false;
      queensStore.stopProgressSaving();
      queensStore.stopErrorChecking();
      if (this.previousPlacementMode !== null) {
        queensStore.setPlacementMode(this.previousPlacementMode);
      }
      if (this.previousAutoFlagging !== null) {
        queensStore.setAutoFlagging(this.previousAutoFlagging);
      }
    },

    resetRunState() {
      this.stopTimer();
      this.stopPatternScan();
      this.stopAutoNextPuzzleTimer();
      Object.assign(this, createInitialRunState());
      this.previousPlacementMode = null;
      this.previousAutoFlagging = null;
      this.clearSavedRun();
    },
  },
});
