import { defineStore } from 'pinia';
import { useQueensStore } from './queensStore';
import { useSpeedModeStore } from './speedModeStore';
import type { MarkType } from '../types/types';
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

type OneOffUpgradeId =
  | 'auto-flag'
  | 'auto-queen-color'
  | 'auto-queen-row'
  | 'auto-queen-column'
  | 'size-up';

interface OneOffUpgradeOption {
  id: OneOffUpgradeId;
  title: string;
  description: string;
  cost: number;
  canBuy: boolean;
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
const PATTERN_CARD_COST_STEP = 20;
const AUTO_QUEEN_COLOR_COST = 80;
const AUTO_QUEEN_ROW_COST = 90;
const AUTO_QUEEN_COLUMN_COST = 90;
const SIZE_UP_COST = 150;

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
    canAffordAutoFlag(state): boolean {
      if (state.autoFlagPurchased) return false;
      return state.runBank >= AUTO_FLAG_COST;
    },
    canAffordAutoQueenByColor(state): boolean {
      if (state.autoQueenByColorPurchased) return false;
      return state.runBank >= AUTO_QUEEN_COLOR_COST;
    },
    canAffordAutoQueenByRow(state): boolean {
      if (state.autoQueenByRowPurchased) return false;
      return state.runBank >= AUTO_QUEEN_ROW_COST;
    },
    canAffordAutoQueenByColumn(state): boolean {
      if (state.autoQueenByColumnPurchased) return false;
      return state.runBank >= AUTO_QUEEN_COLUMN_COST;
    },
    canAffordSizeUp(state): boolean {
      return state.runBank >= SIZE_UP_COST && state.currentPuzzleSize < 9;
    },
    autoFlagCost(): number {
      return AUTO_FLAG_COST;
    },
    autoQueenByColorCost(): number {
      return AUTO_QUEEN_COLOR_COST;
    },
    autoQueenByRowCost(): number {
      return AUTO_QUEEN_ROW_COST;
    },
    autoQueenByColumnCost(): number {
      return AUTO_QUEEN_COLUMN_COST;
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
      const upgrades: OneOffUpgradeOption[] = [
        {
          id: 'auto-flag',
          title: 'Auto Flag',
          description: 'Automatically flags blocked squares after placing a queen.',
          cost: AUTO_FLAG_COST,
          canBuy: !state.autoFlagPurchased && state.runBank >= AUTO_FLAG_COST,
        },
        {
          id: 'auto-queen-color',
          title: 'Auto Queen: Color Group',
          description: 'Auto-place when only one square remains in a color group.',
          cost: AUTO_QUEEN_COLOR_COST,
          canBuy: !state.autoQueenByColorPurchased && state.runBank >= AUTO_QUEEN_COLOR_COST,
        },
        {
          id: 'auto-queen-row',
          title: 'Auto Queen: Row',
          description: 'Auto-place when only one square remains in a row.',
          cost: AUTO_QUEEN_ROW_COST,
          canBuy: !state.autoQueenByRowPurchased && state.runBank >= AUTO_QUEEN_ROW_COST,
        },
        {
          id: 'auto-queen-column',
          title: 'Auto Queen: Column',
          description: 'Auto-place when only one square remains in a column.',
          cost: AUTO_QUEEN_COLUMN_COST,
          canBuy: !state.autoQueenByColumnPurchased && state.runBank >= AUTO_QUEEN_COLUMN_COST,
        },
        {
          id: 'size-up',
          title: `Size Up: ${state.currentPuzzleSize}x${state.currentPuzzleSize} -> ${state.currentPuzzleSize + 1}x${state.currentPuzzleSize + 1}`,
          description: 'Move to next board size and reset all upgrades.',
          cost: SIZE_UP_COST,
          canBuy: state.currentPuzzleSize < 9 && state.runBank >= SIZE_UP_COST,
        },
      ];

      return upgrades.filter((upgrade) => {
        if (upgrade.id === 'size-up') {
          return state.currentPuzzleSize < 9;
        }
        return true;
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

    cloneMarks(marks: MarkType[][]): MarkType[][] {
      return marks.map((row) => [...row]);
    },

    collectPlacementsForMarks(marks: MarkType[][]): Array<{ row: number; col: number }> {
      const queensStore = useQueensStore();
      const cards = this.getOwnedPatternCards();
      const placements: Array<{ row: number; col: number }> = [];
      const seen = new Set<string>();

      for (const card of cards) {
        const matches = collectPatternFlagPlacements(queensStore.grid, marks, card);
        for (const match of matches) {
          const key = `${match.row},${match.col}`;
          if (seen.has(key)) continue;
          seen.add(key);
          placements.push(match);
        }
      }

      return placements;
    },

    collectWavePlacements(seedMarks: MarkType[][]): Array<{ row: number; col: number }> {
      const workingMarks = this.cloneMarks(seedMarks);
      const queuedPlacements: Array<{ row: number; col: number }> = [];
      const queuedSet = new Set<string>();
      const maxIterations = 100;

      for (let i = 0; i < maxIterations; i++) {
        const matches = this.collectPlacementsForMarks(workingMarks);
        let addedAny = false;

        for (const match of matches) {
          if (workingMarks[match.row][match.col] !== null) continue;

          const key = `${match.row},${match.col}`;
          if (queuedSet.has(key)) continue;

          queuedSet.add(key);
          queuedPlacements.push(match);
          workingMarks[match.row][match.col] = 'flag';
          addedAny = true;
        }

        if (!addedAny) {
          break;
        }
      }

      return queuedPlacements;
    },

    collectAutoQueenPlacements(marks: MarkType[][]): Array<{ row: number; col: number }> {
      const queensStore = useQueensStore();
      const placements: Array<{ row: number; col: number }> = [];
      const seen = new Set<string>();
      const size = queensStore.gridSize;

      const tryAdd = (row: number, col: number) => {
        if (marks[row][col] !== null) return;
        if (!queensStore.isValidMoveWithMarks(row, col, marks)) return;
        const key = `${row},${col}`;
        if (seen.has(key)) return;
        seen.add(key);
        placements.push({ row, col });
      };

      if (this.autoQueenByColorPurchased) {
        const colorGroups = new Map<string, Array<{ row: number; col: number }>>();
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const color = queensStore.grid[row][col].groupColor;
            if (!color) continue;
            if (!colorGroups.has(color)) colorGroups.set(color, []);
            colorGroups.get(color)!.push({ row, col });
          }
        }
        for (const group of colorGroups.values()) {
          const free = group.filter((cell) => marks[cell.row][cell.col] === null);
          if (free.length === 1) {
            tryAdd(free[0].row, free[0].col);
          }
        }
      }

      if (this.autoQueenByRowPurchased) {
        for (let row = 0; row < size; row++) {
          const free: Array<{ row: number; col: number }> = [];
          for (let col = 0; col < size; col++) {
            if (marks[row][col] === null) free.push({ row, col });
          }
          if (free.length === 1) {
            tryAdd(free[0].row, free[0].col);
          }
        }
      }

      if (this.autoQueenByColumnPurchased) {
        for (let col = 0; col < size; col++) {
          const free: Array<{ row: number; col: number }> = [];
          for (let row = 0; row < size; row++) {
            if (marks[row][col] === null) free.push({ row, col });
          }
          if (free.length === 1) {
            tryAdd(free[0].row, free[0].col);
          }
        }
      }

      return placements;
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
      const marksSnapshot = this.cloneMarks(queensStore.playerMarks);
      const maxWaves = 100;
      let totalPlacedCount = 0;

      for (let wave = 0; wave < maxWaves; wave++) {
        let changed = false;
        const queuedPlacements = hasPatternCards ? this.collectWavePlacements(marksSnapshot) : [];

        let wavePlacedCount = 0;
        for (const position of queuedPlacements) {
          if (queensStore.playerMarks[position.row][position.col] !== null) {
            continue;
          }

          queensStore.placeFlag(position.row, position.col);
          queensStore.triggerAutoFlagAnimation(position.row, position.col, 'pattern', 0);
          marksSnapshot[position.row][position.col] = 'flag';
          wavePlacedCount += 1;
          changed = true;
        }

        const queenPlacements = hasAutoQueen ? this.collectAutoQueenPlacements(marksSnapshot) : [];
        let placedQueen = false;
        for (const queen of queenPlacements) {
          if (queensStore.playerMarks[queen.row][queen.col] !== null) continue;
          if (!queensStore.isValidMove(queen.row, queen.col)) continue;
          queensStore.placeQueen(queen.row, queen.col);
          placedQueen = true;
          changed = true;
        }
        if (placedQueen) {
          const refreshed = this.cloneMarks(queensStore.playerMarks);
          for (let row = 0; row < refreshed.length; row++) {
            for (let col = 0; col < refreshed[row].length; col++) {
              marksSnapshot[row][col] = refreshed[row][col];
            }
          }
        }

        if (!changed) {
          break;
        }

        totalPlacedCount += wavePlacedCount;
      }

      if (totalPlacedCount > 0) {
        queensStore.showAutoFlagCombo(totalPlacedCount);
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

      this.runStatus = 'playing';
      this.runScore = 0;
      this.runBank = 0;
      this.puzzlesSolved = 0;
      this.riskLevel = 0;
      this.timeLevel = 0;
      this.autoFlagPurchased = false;
      this.autoQueenByColorPurchased = false;
      this.autoQueenByRowPurchased = false;
      this.autoQueenByColumnPurchased = false;
      this.currentPuzzleSize = 5;
      this.ownedPatternCardIds = [];
      this.customPatternCards = [];
      this.customPatternCardCounter = 1;
      this.selectedOneOffUpgradeId = null;
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
      this.rollOneOffUpgrade();
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

    buyAutoQueenByColorUpgrade() {
      if (this.runStatus !== 'upgrade-select' || this.autoQueenByColorPurchased) return;
      if (this.runBank < AUTO_QUEEN_COLOR_COST) return;
      this.runBank -= AUTO_QUEEN_COLOR_COST;
      this.autoQueenByColorPurchased = true;
      this.rollOneOffUpgrade();
    },

    buyAutoQueenByRowUpgrade() {
      if (this.runStatus !== 'upgrade-select' || this.autoQueenByRowPurchased) return;
      if (this.runBank < AUTO_QUEEN_ROW_COST) return;
      this.runBank -= AUTO_QUEEN_ROW_COST;
      this.autoQueenByRowPurchased = true;
      this.rollOneOffUpgrade();
    },

    buyAutoQueenByColumnUpgrade() {
      if (this.runStatus !== 'upgrade-select' || this.autoQueenByColumnPurchased) return;
      if (this.runBank < AUTO_QUEEN_COLUMN_COST) return;
      this.runBank -= AUTO_QUEEN_COLUMN_COST;
      this.autoQueenByColumnPurchased = true;
      this.rollOneOffUpgrade();
    },

    buySizeUpUpgrade() {
      if (this.runStatus !== 'upgrade-select') return;
      if (this.runBank < SIZE_UP_COST) return;
      if (this.currentPuzzleSize >= 9) return;

      this.runBank -= SIZE_UP_COST;
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
      this.rollOneOffUpgrade();
    },

    buySelectedOneOffUpgrade() {
      if (this.runStatus !== 'upgrade-select') {
        return;
      }
      if (!this.selectedOneOffUpgradeId) {
        return;
      }

      switch (this.selectedOneOffUpgradeId) {
        case 'auto-flag':
          this.buyAutoFlagUpgrade();
          break;
        case 'auto-queen-color':
          this.buyAutoQueenByColorUpgrade();
          break;
        case 'auto-queen-row':
          this.buyAutoQueenByRowUpgrade();
          break;
        case 'auto-queen-column':
          this.buyAutoQueenByColumnUpgrade();
          break;
        case 'size-up':
          this.buySizeUpUpgrade();
          break;
        default:
          break;
      }
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
      this.autoQueenByColorPurchased = false;
      this.autoQueenByRowPurchased = false;
      this.autoQueenByColumnPurchased = false;
      this.currentPuzzleSize = 5;
      this.ownedPatternCardIds = [];
      this.customPatternCards = [];
      this.customPatternCardCounter = 1;
      this.selectedOneOffUpgradeId = null;
      this.lastScoreBreakdown = null;
      this.currentPuzzleTimeLimit = BASE_TIME_SECONDS;
      this.timeRemaining = BASE_TIME_SECONDS;
      this.isLoadingPuzzle = false;
      this.previousPlacementMode = null;
      this.previousAutoFlagging = null;
    },
  },
});
