import { defineStore } from 'pinia';
import { useQueensStore } from './queensStore';
import { useSpeedModeStore } from './speedModeStore';

export type IncrementalRunStatus = 'idle' | 'playing' | 'upgrade-select' | 'game-over';

export type IncrementalUpgradeId = 'high-risk' | 'auto-flag' | 'more-time';

export interface IncrementalUpgrade {
  id: IncrementalUpgradeId;
  name: string;
  description: string;
}

interface PuzzleScoreBreakdown {
  basePoints: number;
  rawScore: number;
  minimumApplied: boolean;
  multiplier: number;
  scoreAwarded: number;
  timeRemaining: number;
  totalTime: number;
}

const BASE_PUZZLE_TIME_SECONDS = 300;
const BASE_POINTS = 100;

const UPGRADE_POOL: IncrementalUpgrade[] = [
  {
    id: 'high-risk',
    name: 'High Risk',
    description: 'Future puzzles: -50% time, x3 score.',
  },
  {
    id: 'auto-flag',
    name: 'Auto Flag',
    description: 'Auto-flag blocked squares when placing queens.',
  },
  {
    id: 'more-time',
    name: 'More Time',
    description: 'Future puzzles: +60 seconds.',
  },
];

export const useIncrementalQueensStore = defineStore('incrementalQueens', {
  state: () => ({
    runStatus: 'idle' as IncrementalRunStatus,
    runScore: 0,
    puzzlesSolved: 0,
    activeUpgrades: [] as IncrementalUpgradeId[],
    availableUpgrades: [] as IncrementalUpgrade[],
    currentPuzzleTimeLimit: BASE_PUZZLE_TIME_SECONDS,
    timeRemaining: BASE_PUZZLE_TIME_SECONDS,
    timerInterval: null as number | null,
    lastScoreBreakdown: null as PuzzleScoreBreakdown | null,
    lastPuzzleId: null as string | null,
    isLoadingPuzzle: false,
    previousPlacementMode: null as 'auto' | 'flag' | 'queen' | null,
    previousAutoFlagging: null as boolean | null,
  }),

  getters: {
    isPlaying: (state) => state.runStatus === 'playing',
    hasUpgrade:
      (state) =>
      (id: IncrementalUpgradeId): boolean => {
        return state.activeUpgrades.includes(id);
      },
    activeUpgradeDetails: (state): IncrementalUpgrade[] => {
      return UPGRADE_POOL.filter((upgrade) => state.activeUpgrades.includes(upgrade.id));
    },
    formattedTimeRemaining: (state): string => {
      const minutes = Math.floor(state.timeRemaining / 60);
      const seconds = Math.floor(state.timeRemaining % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
      let totalTime = BASE_PUZZLE_TIME_SECONDS;
      if (this.activeUpgrades.includes('more-time')) {
        totalTime += 60;
      }
      if (this.activeUpgrades.includes('high-risk')) {
        totalTime = Math.max(1, Math.floor(totalTime / 2));
      }
      return totalTime;
    },

    getScoreMultiplier(): number {
      return this.activeUpgrades.includes('high-risk') ? 3 : 1;
    },

    getRemainingUpgrades(): IncrementalUpgrade[] {
      return UPGRADE_POOL.filter((upgrade) => !this.activeUpgrades.includes(upgrade.id));
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
      queensStore.setAutoFlagging(this.activeUpgrades.includes('auto-flag'));

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
      this.puzzlesSolved = 0;
      this.activeUpgrades = [];
      this.availableUpgrades = [];
      this.lastScoreBreakdown = null;
      this.currentPuzzleTimeLimit = BASE_PUZZLE_TIME_SECONDS;
      this.timeRemaining = BASE_PUZZLE_TIME_SECONDS;
      this.lastPuzzleId = null;

      await this.startNextPuzzle();
    },

    async startNextPuzzle() {
      this.isLoadingPuzzle = true;
      this.lastScoreBreakdown = null;
      this.availableUpgrades = [];

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
      const scoreAwarded = scoreBeforeMultiplier * multiplier;

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
      this.puzzlesSolved += 1;

      this.availableUpgrades = this.getRemainingUpgrades();
      this.runStatus = this.availableUpgrades.length > 0 ? 'upgrade-select' : 'playing';

      if (this.availableUpgrades.length === 0) {
        void this.startNextPuzzle();
      }
    },

    async selectUpgrade(upgradeId: IncrementalUpgradeId) {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      if (this.activeUpgrades.includes(upgradeId)) {
        return;
      }

      const isValidUpgrade = UPGRADE_POOL.some((upgrade) => upgrade.id === upgradeId);
      if (!isValidUpgrade) {
        return;
      }

      this.activeUpgrades.push(upgradeId);
      this.availableUpgrades = this.getRemainingUpgrades();

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
      this.puzzlesSolved = 0;
      this.activeUpgrades = [];
      this.availableUpgrades = [];
      this.lastScoreBreakdown = null;
      this.currentPuzzleTimeLimit = BASE_PUZZLE_TIME_SECONDS;
      this.timeRemaining = BASE_PUZZLE_TIME_SECONDS;
      this.isLoadingPuzzle = false;
      this.previousPlacementMode = null;
      this.previousAutoFlagging = null;
    },
  },
});
