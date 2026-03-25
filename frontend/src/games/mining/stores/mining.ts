import { defineStore } from 'pinia';

import { buildAutoFlagGrid } from '../game/rules/autoFlag';
import { getFoundGoldPositions } from '../game/selectors/getFoundGoldPositions';
import { loadRandomMiningPuzzle } from '../game/puzzles/loadMiningPuzzle';
import { convertQueensPuzzleToMiningBoard } from '../game/puzzles/convertQueensPuzzleToMiningBoard';
import type { MiningPhase, PositionRef } from '../game/types';
import { AUTO_FLAG_UPGRADE } from '../game/upgrades/miningUpgrades';
import { createBooleanGrid } from '../game/utils/createBooleanGrid';

const LEVEL_COMPLETE_DELAY_MS = 700;
const UPGRADE_EXPLANATION =
  "You've bought the survey upgrade. In these mines, there is only one gold tile per row and one per column, and gold never touches diagonally. From now on, when you find gold, we will mark tiles where gold cannot be.";

function createInitialState() {
  return {
    phase: 'idle' as MiningPhase,
    currentLevel: 0,
    currentPuzzleId: null as string | null,
    boardSize: 5,
    truthGold: createBooleanGrid(5),
    revealed: createBooleanGrid(5),
    flagged: createBooleanGrid(5),
    goldTotal: 0,
    foundGoldCount: 0,
    daysElapsed: 0,
    hasAutoFlagUpgrade: false,
    showUpgradeExplanation: false,
    upgradeExplanationMessage: null as string | null,
    shopOpen: false,
    errorMessage: null as string | null,
    errorTick: 0,
    lastActionMessage: 'Start digging and look for a pattern.' as string,
    pendingLevelTimeout: null as number | null,
  };
}

export const useMiningStore = defineStore('mining', {
  state: () => createInitialState(),

  getters: {
    autoFlagUpgrade: () => AUTO_FLAG_UPGRADE,

    canBuyAutoFlagUpgrade(state): boolean {
      return !state.hasAutoFlagUpgrade && state.goldTotal >= AUTO_FLAG_UPGRADE.cost;
    },

    remainingGold(state): number {
      return state.boardSize - state.foundGoldCount;
    },

    isRevealedGold:
      (state) =>
      (row: number, col: number): boolean =>
        state.revealed[row][col] && state.truthGold[row][col],

    isRevealedDirt:
      (state) =>
      (row: number, col: number): boolean =>
        state.revealed[row][col] && !state.truthGold[row][col],

    isHidden:
      (state) =>
      (row: number, col: number): boolean =>
        !state.revealed[row][col],
  },

  actions: {
    async initialize() {
      if (this.phase !== 'idle') {
        return;
      }

      await this.loadNextLevel();
    },

    setError(message: string) {
      this.errorMessage = message;
      this.errorTick += 1;
    },

    clearError() {
      this.errorMessage = null;
    },

    hideUpgradeExplanation() {
      this.showUpgradeExplanation = false;
    },

    async loadNextLevel() {
      if (this.pendingLevelTimeout !== null) {
        window.clearTimeout(this.pendingLevelTimeout);
        this.pendingLevelTimeout = null;
      }

      this.phase = 'loading';
      this.clearError();

      try {
        const puzzle = await loadRandomMiningPuzzle(this.currentPuzzleId);
        const board = convertQueensPuzzleToMiningBoard(puzzle);

        this.currentPuzzleId = board.puzzleId;
        this.boardSize = board.size;
        this.truthGold = board.truthGold;
        this.revealed = createBooleanGrid(board.size);
        this.flagged = createBooleanGrid(board.size);
        this.foundGoldCount = 0;
        this.currentLevel += 1;
        this.phase = 'playing';
        this.lastActionMessage = `Level ${this.currentLevel}: Dig for the hidden gold seam.`;
      } catch (error) {
        console.error('[mining] Failed to load next level', error);
        this.phase = 'idle';
        this.setError('Unable to load a mining board right now.');
      }
    },

    recomputeFlags() {
      if (!this.hasAutoFlagUpgrade) {
        this.flagged = createBooleanGrid(this.boardSize);
        return;
      }

      const foundGold = getFoundGoldPositions(this.truthGold, this.revealed);
      this.flagged = buildAutoFlagGrid(foundGold, this.revealed, this.boardSize);
    },

    async dig(position: PositionRef) {
      if (this.phase !== 'playing') {
        return;
      }

      if (this.revealed[position.row]?.[position.col]) {
        return;
      }

      if (this.flagged[position.row]?.[position.col]) {
        return;
      }

      this.revealed[position.row][position.col] = true;
      this.daysElapsed += 1;
      this.clearError();

      if (this.truthGold[position.row][position.col]) {
        this.goldTotal += 5;
        this.foundGoldCount += 1;
        this.lastActionMessage = `Day ${this.daysElapsed}: You found gold worth 5.`;

        if (this.hasAutoFlagUpgrade) {
          this.recomputeFlags();
        }

        if (this.foundGoldCount === this.boardSize) {
          this.phase = 'level-complete';
          this.lastActionMessage = `Level ${this.currentLevel} cleared. Loading a new claim.`;
          this.pendingLevelTimeout = window.setTimeout(() => {
            this.pendingLevelTimeout = null;
            void this.loadNextLevel();
          }, LEVEL_COMPLETE_DELAY_MS);
        }

        return;
      }

      this.lastActionMessage = `Day ${this.daysElapsed}: Nothing here but dirt.`;
    },

    openShop() {
      this.shopOpen = true;
    },

    closeShop() {
      this.shopOpen = false;
    },

    buyAutoFlagUpgrade() {
      if (this.hasAutoFlagUpgrade) {
        this.setError('You already own the survey kit.');
        return;
      }

      if (this.goldTotal < AUTO_FLAG_UPGRADE.cost) {
        this.setError('Not enough gold for that upgrade.');
        return;
      }

      this.goldTotal -= AUTO_FLAG_UPGRADE.cost;
      this.hasAutoFlagUpgrade = true;
      this.upgradeExplanationMessage = UPGRADE_EXPLANATION;
      this.showUpgradeExplanation = true;
      this.shopOpen = false;
      this.recomputeFlags();
      this.lastActionMessage =
        'Survey kit purchased. Future gold finds will mark impossible tiles.';
      this.clearError();
    },
  },
});
