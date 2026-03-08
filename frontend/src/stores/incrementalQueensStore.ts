import { defineStore } from 'pinia';
import { useQueensStore } from './queensStore';
import { useSpeedModeStore } from './speedModeStore';

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

const RISK_TIME_FACTOR = 0.85;
const RISK_SCORE_FACTOR = 1.5;
const RISK_BASE_COST = 90;
const RISK_COST_GROWTH = 1.9;

const TIME_SECONDS_PER_LEVEL = 30;
const TIME_BASE_COST = 40;
const TIME_COST_GROWTH = 1.6;
const AUTO_FLAG_COST = 75;

const BASE_POINTS = 100;

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
    lastScoreBreakdown: null as PuzzleScoreBreakdown | null,
    lastPuzzleId: null as string | null,
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
      return Math.floor(RISK_BASE_COST * Math.pow(RISK_COST_GROWTH, state.riskLevel));
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
    currentRunTimeLimit(state): number {
      const reducedBaseTime = Math.max(
        MIN_TIME_SECONDS,
        Math.floor(BASE_TIME_SECONDS * Math.pow(RISK_TIME_FACTOR, state.riskLevel))
      );
      const bonusTime = TIME_SECONDS_PER_LEVEL * state.timeLevel;
      return reducedBaseTime + bonusTime;
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

      const currentReducedBase = Math.max(
        MIN_TIME_SECONDS,
        Math.floor(BASE_TIME_SECONDS * Math.pow(RISK_TIME_FACTOR, currentLevel))
      );
      const nextReducedBase = Math.max(
        MIN_TIME_SECONDS,
        Math.floor(BASE_TIME_SECONDS * Math.pow(RISK_TIME_FACTOR, nextLevel))
      );
      const bonusTime = TIME_SECONDS_PER_LEVEL * state.timeLevel;

      return {
        currentLevel,
        nextLevel,
        currentMultiplier,
        nextMultiplier,
        currentTimeLimit: currentReducedBase + bonusTime,
        nextTimeLimit: nextReducedBase + bonusTime,
        cost: Math.floor(RISK_BASE_COST * Math.pow(RISK_COST_GROWTH, currentLevel)),
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

      const reducedBase = Math.max(
        MIN_TIME_SECONDS,
        Math.floor(BASE_TIME_SECONDS * Math.pow(RISK_TIME_FACTOR, state.riskLevel))
      );

      const currentBonus = TIME_SECONDS_PER_LEVEL * currentLevel;
      const nextBonus = TIME_SECONDS_PER_LEVEL * nextLevel;

      return {
        currentLevel,
        nextLevel,
        currentTimeLimit: reducedBase + currentBonus,
        nextTimeLimit: reducedBase + nextBonus,
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

      // Incremental runs should not reuse single-puzzle progress/history.
      await queensStore.loadPuzzleById(puzzleId, { persistProgress: false });
      queensStore.clearAll();

      // Keep familiar flow: first click flag, second click queen (validated in auto mode).
      queensStore.setPlacementMode('auto');
      queensStore.setAutoFlagging(this.autoFlagPurchased);

      this.lastPuzzleId = puzzleId;
    },

    async startRun() {
      const queensStore = useQueensStore();
      const speedModeStore = useSpeedModeStore();

      this.stopTimer();

      // Reset any active Queens side-modes before entering Incremental.
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
    },

    handlePuzzleSolved() {
      if (this.runStatus !== 'playing') {
        return;
      }

      this.stopTimer();

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

    async buyRiskUpgrade() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      const cost = this.nextRiskCost;
      if (this.runBank < cost) {
        return;
      }

      this.runBank -= cost;
      this.riskLevel += 1;
      await this.startNextPuzzle();
    },

    async buyTimeUpgrade() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      const cost = this.nextTimeCost;
      if (this.runBank < cost) {
        return;
      }

      this.runBank -= cost;
      this.timeLevel += 1;
      await this.startNextPuzzle();
    },

    async skipUpgradeSelection() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      await this.startNextPuzzle();
    },

    async buyAutoFlagUpgrade() {
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
      await this.startNextPuzzle();
    },

    handleTimeout() {
      this.stopTimer();
      this.runStatus = 'game-over';
    },

    cleanupSessionState() {
      const queensStore = useQueensStore();
      this.stopTimer();
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
      this.runStatus = 'idle';
      this.runScore = 0;
      this.runBank = 0;
      this.puzzlesSolved = 0;
      this.riskLevel = 0;
      this.timeLevel = 0;
      this.autoFlagPurchased = false;
      this.lastScoreBreakdown = null;
      this.currentPuzzleTimeLimit = BASE_TIME_SECONDS;
      this.timeRemaining = BASE_TIME_SECONDS;
      this.isLoadingPuzzle = false;
      this.previousPlacementMode = null;
      this.previousAutoFlagging = null;
    },
  },
});
