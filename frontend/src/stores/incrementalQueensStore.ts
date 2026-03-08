import { defineStore } from 'pinia';
import { useQueensStore } from './queensStore';
import { useSpeedModeStore } from './speedModeStore';
import {
  PATTERN_CARD_DEFINITIONS,
  collectPatternFlagPlacements,
  getPatternCardById,
  type PatternCardDefinition,
} from '../utils/incrementalPatternCards';

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

const BASE_TIME_SECONDS = 300;
const MIN_TIME_SECONDS = 15;

const RISK_SCORE_FACTOR = 1.5;
const RISK_BASE_COST = 90;
const RISK_COST_STEP = 20;

const TIME_SECONDS_PER_LEVEL = 30;
const TIME_BASE_COST = 40;
const TIME_COST_GROWTH = 1.6;
const AUTO_FLAG_COST = 75;

const BASE_POINTS = 100;

function getTimeBonusSeconds(timeLevel: number): number {
  return TIME_SECONDS_PER_LEVEL * timeLevel;
}

function getRunTimeLimitSeconds(riskLevel: number, timeLevel: number): number {
  const totalTimeBeforeRisk = BASE_TIME_SECONDS + getTimeBonusSeconds(timeLevel);
  const riskDivisor = Math.pow(2, riskLevel);
  return Math.max(MIN_TIME_SECONDS, Math.floor(totalTimeBeforeRisk / riskDivisor));
}

export const useIncrementalQueensStore = defineStore('incrementalQueens', {
  state: () => ({
    runStatus: 'idle' as IncrementalRunStatus,
    runScore: 0,
    runBank: 0,
    puzzlesSolved: 0,
    riskLevel: 0,
    timeLevel: 0,
    autoFlagPurchased: false,
    currentPuzzleTimeLimit: BASE_TIME_SECONDS,
    timeRemaining: BASE_TIME_SECONDS,
    timerInterval: null as number | null,
    patternScanInterval: null as number | null,
    lastScoreBreakdown: null as PuzzleScoreBreakdown | null,
    lastPuzzleId: null as string | null,
    ownedPatternCardIds: [] as string[],
    customPatternCards: [] as PatternCardDefinition[],
    customPatternCardCounter: 1,
    isLoadingPuzzle: false,
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
      return this.runBank >= this.nextRiskCost;
    },
    canAffordTime(): boolean {
      return this.runBank >= this.nextTimeCost;
    },
    canAffordAutoFlag(state): boolean {
      if (state.autoFlagPurchased) return false;
      return state.runBank >= AUTO_FLAG_COST;
    },
    autoFlagCost(): number {
      return AUTO_FLAG_COST;
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
    canAffordPatternCard:
      (state) =>
      (patternCardId: string): boolean => {
        const card = PATTERN_CARD_DEFINITIONS.find((item) => item.id === patternCardId);
        if (!card) return false;
        if (state.ownedPatternCardIds.includes(patternCardId)) return false;
        return state.runBank >= card.cost;
      },
    currentRunTimeLimit(state): number {
      return getRunTimeLimitSeconds(state.riskLevel, state.timeLevel);
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
        currentTimeLimit: getRunTimeLimitSeconds(currentLevel, state.timeLevel),
        nextTimeLimit: getRunTimeLimitSeconds(nextLevel, state.timeLevel),
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
        currentTimeLimit: getRunTimeLimitSeconds(state.riskLevel, currentLevel),
        nextTimeLimit: getRunTimeLimitSeconds(state.riskLevel, nextLevel),
        cost: Math.floor(TIME_BASE_COST * Math.pow(TIME_COST_GROWTH, currentLevel)),
      };
    },
  },

  actions: {
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

    applyOwnedPatternCards() {
      if (this.runStatus !== 'playing') {
        return;
      }

      if (this.ownedPatternCardIds.length === 0) {
        return;
      }

      const queensStore = useQueensStore();
      const placements: Array<{ row: number; col: number }> = [];
      const seen = new Set<string>();

      for (const cardId of this.ownedPatternCardIds) {
        const card =
          getPatternCardById(cardId) ||
          this.customPatternCards.find((patternCard) => patternCard.id === cardId) ||
          null;
        if (!card) continue;

        const matches = collectPatternFlagPlacements(
          queensStore.grid,
          queensStore.playerMarks,
          card
        );

        for (const match of matches) {
          const key = `${match.row},${match.col}`;
          if (seen.has(key)) continue;
          seen.add(key);
          placements.push(match);
        }
      }

      const maxPlacementsPerTick = 3;
      const limited = placements.slice(0, maxPlacementsPerTick);

      let placedCount = 0;
      for (const [index, position] of limited.entries()) {
        queensStore.placeFlag(position.row, position.col);
        queensStore.triggerAutoFlagAnimation(position.row, position.col, 'pattern', index * 50);
        placedCount += 1;
      }

      if (placedCount > 0) {
        queensStore.showAutoFlagCombo(placedCount);
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
      const puzzlesForSize = (queensStore.puzzleDatabase?.['5x5'] || []) as Array<{ id: string }>;
      const originalVariants = puzzlesForSize.filter((puzzle) =>
        typeof puzzle.id === 'string' ? puzzle.id.endsWith('-0') : false
      );

      if (originalVariants.length === 0) {
        throw new Error('No 5x5 puzzles available for Incremental Queens');
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

      this.runStatus = 'playing';
      this.runScore = 0;
      this.runBank = 0;
      this.puzzlesSolved = 0;
      this.riskLevel = 0;
      this.timeLevel = 0;
      this.autoFlagPurchased = false;
      this.ownedPatternCardIds = [];
      this.customPatternCards = [];
      this.customPatternCardCounter = 1;
      this.lastScoreBreakdown = null;
      this.currentPuzzleTimeLimit = BASE_TIME_SECONDS;
      this.timeRemaining = BASE_TIME_SECONDS;
      this.lastPuzzleId = null;

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
    },

    buyRiskUpgrade() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      const cost = this.nextRiskCost;
      if (this.runBank < cost) {
        return;
      }

      this.runBank -= cost;
      this.riskLevel += 1;
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
    },

    buyAutoFlagUpgrade() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      if (this.autoFlagPurchased) {
        return;
      }
      if (this.runBank < AUTO_FLAG_COST) {
        return;
      }

      this.runBank -= AUTO_FLAG_COST;
      this.autoFlagPurchased = true;
    },

    buyPatternCard(patternCardId: string) {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      if (this.ownedPatternCardIds.includes(patternCardId)) {
        return;
      }

      const card = getPatternCardById(patternCardId);
      if (!card) {
        return;
      }
      if (this.runBank < card.cost) {
        return;
      }

      this.runBank -= card.cost;
      this.ownedPatternCardIds.push(patternCardId);
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
      this.runStatus = 'idle';
      this.runScore = 0;
      this.runBank = 0;
      this.puzzlesSolved = 0;
      this.riskLevel = 0;
      this.timeLevel = 0;
      this.autoFlagPurchased = false;
      this.ownedPatternCardIds = [];
      this.customPatternCards = [];
      this.customPatternCardCounter = 1;
      this.lastScoreBreakdown = null;
      this.currentPuzzleTimeLimit = BASE_TIME_SECONDS;
      this.timeRemaining = BASE_TIME_SECONDS;
      this.isLoadingPuzzle = false;
      this.previousPlacementMode = null;
      this.previousAutoFlagging = null;
    },
  },
});
