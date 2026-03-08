import { defineStore } from 'pinia';
import { useQueensStore } from './queensStore';
import { useSpeedModeStore } from './speedModeStore';
import {
  PATTERN_CARD_DEFINITIONS,
  getPatternCardById,
  type PatternCardDefinition,
} from '../utils/incrementalPatternCards';
import { runIncrementalAutomationFixedPoint } from '../utils/incrementalAutomation';
import {
  BASE_TIME_SECONDS,
  MIN_TIME_SECONDS,
  ONE_OFF_UPGRADE_IDS,
  PATTERN_CARD_COST_STEP,
  RISK_BASE_COST,
  RISK_COST_STEP,
  RISK_SCORE_FACTOR,
  SIZE_UP_COST,
  TIME_BASE_COST,
  TIME_COST_GROWTH,
  TIME_SECONDS_PER_LEVEL,
  type OneOffUpgradeId,
  getOneOffUpgradeCost,
  getOneOffUpgradeDescription,
  getOneOffUpgradeTitle,
} from '../utils/incrementalUpgrades';

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

const BASE_POINTS = 100;

function createInitialRunState() {
  return {
    runStatus: 'idle' as IncrementalRunStatus,
    runScore: 0,
    runBank: 0,
    puzzlesSolved: 0,
    riskLevel: 0,
    timeLevel: 0,
    autoFlagPurchased: false,
    autoQueenByColorPurchased: false,
    autoQueenByRowPurchased: false,
    autoQueenByColumnPurchased: false,
    currentPuzzleSize: 5,
    sizeUpCost: SIZE_UP_COST,
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
  };
}

export const useIncrementalQueensStore = defineStore('incrementalQueens', {
  state: () => ({
    ...createInitialRunState(),
    previousPlacementMode: null as 'auto' | 'flag' | 'queen' | null,
    previousAutoFlagging: null as boolean | null,
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
    nextTimeCost: (state): number => {
      return Math.floor(TIME_BASE_COST * Math.pow(TIME_COST_GROWTH, state.timeLevel));
    },
    canAffordRisk(): boolean {
      return this.runBank >= this.nextRiskCost && this.currentPuzzleTimeLimit > MIN_TIME_SECONDS;
    },
    canAffordTime(): boolean {
      return this.runBank >= this.nextTimeCost;
    },
    canAffordSizeUp(state): boolean {
      return state.runBank >= SIZE_UP_COST && state.currentPuzzleSize < 9;
    },
    availablePatternCards(state): PatternCardDefinition[] {
      return PATTERN_CARD_DEFINITIONS.filter((card) => !state.ownedPatternCardIds.includes(card.id));
    },
    allPatternCards(state): PatternCardDefinition[] {
      return [...PATTERN_CARD_DEFINITIONS, ...state.customPatternCards];
    },
    canCreateCustomPatternCard(): boolean {
      return this.availablePatternCards.length === 0;
    },
    hasPatternCard:
      (state) =>
      (patternCardId: string): boolean => {
        return state.ownedPatternCardIds.includes(patternCardId);
      },
    patternCardCost:
      (state) =>
      (patternCardId: string): number => {
        const card =
          PATTERN_CARD_DEFINITIONS.find((item) => item.id === patternCardId) ||
          state.customPatternCards.find((item) => item.id === patternCardId);
        if (!card) return 0;
        const purchasedCount = state.ownedPatternCardIds.length;
        return card.cost + purchasedCount * PATTERN_CARD_COST_STEP;
      },
    canAffordPatternCard:
      (state) =>
      (patternCardId: string): boolean => {
        const card =
          PATTERN_CARD_DEFINITIONS.find((item) => item.id === patternCardId) ||
          state.customPatternCards.find((item) => item.id === patternCardId);
        if (!card) return false;
        if (state.ownedPatternCardIds.includes(patternCardId)) return false;
        const purchasedCount = state.ownedPatternCardIds.length;
        const currentCost = card.cost + purchasedCount * PATTERN_CARD_COST_STEP;
        return state.runBank >= currentCost;
      },
    currentRunTimeLimit(state): number {
      return state.currentPuzzleTimeLimit;
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
    timeShopPreview(state): {
      currentLevel: number;
      nextLevel: number;
      currentTimeLimit: number;
      nextTimeLimit: number;
      cost: number;
    } {
      const currentLevel = state.timeLevel;
      const nextLevel = state.timeLevel + 1;

      return {
        currentLevel,
        nextLevel,
        currentTimeLimit: state.currentPuzzleTimeLimit,
        nextTimeLimit: state.currentPuzzleTimeLimit + TIME_SECONDS_PER_LEVEL,
        cost: Math.floor(TIME_BASE_COST * Math.pow(TIME_COST_GROWTH, currentLevel)),
      };
    },
    availableManagePatternCards(state): PatternCardDefinition[] {
      return [...PATTERN_CARD_DEFINITIONS, ...state.customPatternCards].filter(
        (card) => !state.ownedPatternCardIds.includes(card.id)
      );
    },
    ownedPatternCards(state): PatternCardDefinition[] {
      return state.ownedPatternCardIds
        .map(
          (cardId) =>
            getPatternCardById(cardId) ||
            state.customPatternCards.find((patternCard) => patternCard.id === cardId) ||
            null
        )
        .filter((card): card is PatternCardDefinition => card !== null);
    },
    availableOneOffUpgrades(state): OneOffUpgradeOption[] {
      return ONE_OFF_UPGRADE_IDS.filter((id) => {
        if (id === 'size-up') return state.currentPuzzleSize < 9;
        if (id === 'auto-flag') return !state.autoFlagPurchased;
        if (id === 'auto-queen-color') return !state.autoQueenByColorPurchased;
        if (id === 'auto-queen-row') return !state.autoQueenByRowPurchased;
        if (id === 'auto-queen-column') return !state.autoQueenByColumnPurchased;
        return false;
      }).map((id) => {
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
    selectedOneOffUpgrade(): OneOffUpgradeOption | null {
      if (!this.selectedOneOffUpgradeId) return null;
      return this.availableOneOffUpgrades.find((u) => u.id === this.selectedOneOffUpgradeId) || null;
    },
  },

  actions: {
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

    computeTimeLimitSeconds(): number {
      return this.currentRunTimeLimit;
    },

    getScoreMultiplier(): number {
      return this.currentScoreMultiplier;
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

    getOwnedPatternCards(): PatternCardDefinition[] {
      return this.ownedPatternCardIds
        .map(
          (cardId) =>
            getPatternCardById(cardId) ||
            this.customPatternCards.find((patternCard) => patternCard.id === cardId) ||
            null
        )
        .filter((card): card is PatternCardDefinition => card !== null);
    },

    applyOwnedPatternCards() {
      if (this.runStatus !== 'playing') {
        return;
      }

      const hasPatternCards = this.ownedPatternCardIds.length > 0;
      const hasAutoQueen =
        this.autoQueenByColorPurchased || this.autoQueenByRowPurchased || this.autoQueenByColumnPurchased;

      if (!hasPatternCards && !hasAutoQueen) {
        return;
      }

      const queensStore = useQueensStore();
      const { flagsPlaced } = runIncrementalAutomationFixedPoint({
        grid: queensStore.grid,
        initialMarks: queensStore.playerMarks,
        patternCards: hasPatternCards ? this.getOwnedPatternCards() : [],
        autoQueenRules: {
          byColor: this.autoQueenByColorPurchased,
          byRow: this.autoQueenByRowPurchased,
          byColumn: this.autoQueenByColumnPurchased,
        },
        isValidMoveWithMarks: (row, col, marks) => queensStore.isValidMoveWithMarks(row, col, marks),
        isValidMoveNow: (row, col) => queensStore.isValidMove(row, col),
        getCurrentMarks: () => queensStore.playerMarks,
        placeFlag: (row, col) => queensStore.placeFlag(row, col),
        placeQueen: (row, col) => queensStore.placeQueen(row, col),
        onPatternFlagPlaced: (row, col) => {
          queensStore.triggerAutoFlagAnimation(row, col, 'pattern', 0);
        },
      });

      if (flagsPlaced > 0) {
        queensStore.showAutoFlagCombo(flagsPlaced);
      }
    },

    startPatternScan() {
      this.stopPatternScan();

      this.applyOwnedPatternCards();

      this.patternScanInterval = window.setInterval(() => {
        this.applyOwnedPatternCards();
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

      const nonRepeatingPool =
        this.lastPuzzleId && originalVariants.length > 1
          ? originalVariants.filter((puzzle) => puzzle.id !== this.lastPuzzleId)
          : originalVariants;

      const selectionPool = nonRepeatingPool.length > 0 ? nonRepeatingPool : originalVariants;
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

      this.lastPuzzleId = puzzleId;
    },

    async startRun() {
      const queensStore = useQueensStore();
      const speedModeStore = useSpeedModeStore();

      this.stopTimer();
      this.stopPatternScan();

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

      this.currentPuzzleTimeLimit = this.computeTimeLimitSeconds();
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

      const multiplier = this.getScoreMultiplier();
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
    },

    buyRiskUpgrade() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
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

    buyTimeUpgrade() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      const cost = this.nextTimeCost;
      if (this.runBank < cost) {
        return;
      }

      this.runBank -= cost;
      this.timeLevel += 1;
      this.currentPuzzleTimeLimit += TIME_SECONDS_PER_LEVEL;
    },

    buyPatternCard(patternCardId: string) {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      if (this.ownedPatternCardIds.includes(patternCardId)) {
        return;
      }

      const card =
        getPatternCardById(patternCardId) ||
        this.customPatternCards.find((patternCard) => patternCard.id === patternCardId) ||
        null;
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
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      this.ownedPatternCardIds = this.ownedPatternCardIds.filter((id) => id !== patternCardId);
    },

    purchaseOneOffUpgrade(id: OneOffUpgradeId): boolean {
      if (this.runStatus !== 'upgrade-select') return false;

      const option = this.availableOneOffUpgrades.find((upgrade) => upgrade.id === id);
      if (!option || !option.canBuy) return false;

      this.runBank -= option.cost;

      switch (id) {
        case 'auto-flag':
          this.autoFlagPurchased = true;
          break;
        case 'auto-queen-color':
          this.autoQueenByColorPurchased = true;
          break;
        case 'auto-queen-row':
          this.autoQueenByRowPurchased = true;
          break;
        case 'auto-queen-column':
          this.autoQueenByColumnPurchased = true;
          break;
        case 'size-up':
          this.currentPuzzleSize += 1;
          this.riskLevel = 0;
          this.timeLevel = 0;
          this.autoFlagPurchased = false;
          this.autoQueenByColorPurchased = false;
          this.autoQueenByRowPurchased = false;
          this.autoQueenByColumnPurchased = false;
          this.ownedPatternCardIds = [];
          this.customPatternCards = [];
          this.customPatternCardCounter = 1;
          this.currentPuzzleTimeLimit = BASE_TIME_SECONDS;
          break;
      }

      this.rollOneOffUpgrade();
      return true;
    },

    buySelectedOneOffUpgrade() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      if (!this.selectedOneOffUpgradeId) {
        return;
      }

      this.purchaseOneOffUpgrade(this.selectedOneOffUpgradeId);
    },

    createCustomPatternCard(input: {
      id?: string;
      size: number;
      cells: Array<{ row: number; col: number; activeSquare?: boolean }>;
      outputFlags: Array<{ row: number; col: number }>;
    }) {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
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

      const fallbackId = `pattern-custom-${this.customPatternCardCounter}`;
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

    async skipUpgradeSelection() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      await this.startNextPuzzle();
    },

    handleTimeout() {
      this.stopTimer();
      this.stopPatternScan();
      this.runStatus = 'game-over';
    },

    cleanupSessionState() {
      const queensStore = useQueensStore();
      this.stopTimer();
      this.stopPatternScan();
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
      Object.assign(this, createInitialRunState());
      this.previousPlacementMode = null;
      this.previousAutoFlagging = null;
    },
  },
});
