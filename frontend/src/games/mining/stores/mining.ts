import { defineStore } from 'pinia';

import { loadRandomMiningPuzzle } from '../game/puzzles/loadMiningPuzzle';
import { convertQueensPuzzleToMiningBoard } from '../game/puzzles/convertQueensPuzzleToMiningBoard';
import { buildQuartzTruthGrid } from '../game/rules/quartzTruth';
import { getFoundGoldPositions } from '../game/selectors/getFoundGoldPositions';
import type {
  MiningDepthLevel,
  MiningPhase,
  MiningUpgradeDefinition,
  MiningUpgradeId,
  PositionRef,
} from '../game/types';
import {
  getGoldRewardForDepth,
  getMiningUpgrade,
  MINING_UPGRADES,
} from '../game/upgrades/miningUpgrades';
import { createBooleanGrid } from '../game/utils/createBooleanGrid';

const DIG_COST = 1;
const LEVEL_COMPLETE_DELAY_MS = 700;
const STARTING_GOLD = 25;

const UPGRADE_EXPLANATIONS: Record<MiningUpgradeId, string> = {
  'basic-pick':
    'The Basic Pick unlocks the stone layer. Gold now pays 10, and dug stone can show quartz for impossible tiles or grey rock for unknown ground.',
  'reinforced-pick':
    'The Reinforced Pick unlocks the region layer. Quartz disappears, and each color region can now hold only one gold tile.',
  'survey-scanner':
    'The Survey Scanner unlocks the scanner layer. Region maps are visible immediately, so you can plan around them before digging.',
};

function createInitialState() {
  return {
    phase: 'idle' as MiningPhase,
    currentLevel: 0,
    currentPuzzleId: null as string | null,
    boardSize: 5,
    truthGold: createBooleanGrid(5),
    truthQuartz: createBooleanGrid(5),
    regionIds: Array.from({ length: 5 }, () => Array(5).fill('.')),
    revealed: createBooleanGrid(5),
    playerFlags: createBooleanGrid(5),
    goldTotal: STARTING_GOLD,
    foundGoldCount: 0,
    daysElapsed: 0,
    highestUnlockedDepthLevel: 1 as MiningDepthLevel,
    currentDepthLevel: 1 as MiningDepthLevel,
    unlockedUpgradeIds: [] as MiningUpgradeId[],
    showUpgradeExplanation: false,
    upgradeExplanationTitle: null as string | null,
    upgradeExplanationMessage: null as string | null,
    shopOpen: false,
    errorMessage: null as string | null,
    errorTick: 0,
    lastActionMessage:
      'Start in the dirt layer. Efficient digging earns enough gold to unlock deeper mining methods.' as string,
    pendingLevelTimeout: null as number | null,
  };
}

function createRegionGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array(size).fill('.'));
}

export const useMiningStore = defineStore('mining', {
  state: () => createInitialState(),

  getters: {
    visibleFlags(state): boolean[][] {
      return state.playerFlags;
    },

    availableDepthLevels(state): MiningDepthLevel[] {
      return [1, 2, 3, 4].filter(
        (depthLevel) => depthLevel <= state.highestUnlockedDepthLevel
      ) as MiningDepthLevel[];
    },

    availableUpgrades(state): MiningUpgradeDefinition[] {
      return MINING_UPGRADES.filter((upgrade) => !state.unlockedUpgradeIds.includes(upgrade.id));
    },

    goldRewardPerTile(state): number {
      return getGoldRewardForDepth(state.currentDepthLevel);
    },

    depthTitle(state): string {
      switch (state.currentDepthLevel) {
        case 4:
          return 'Scanner Layer';
        case 3:
          return 'Region Layer';
        case 2:
          return 'Stone Layer';
        default:
          return 'Dirt Layer';
      }
    },

    depthSummary(state): string {
      switch (state.currentDepthLevel) {
        case 4:
          return 'Region map visible before digging. Reward 40 gold per hit.';
        case 3:
          return 'Color regions matter. Reward 20 gold per hit.';
        case 2:
          return 'Quartz marks impossible tiles once uncovered. Reward 10 gold per hit.';
        default:
          return 'No extra hints. Reward 5 gold per hit.';
      }
    },

    canAffordDig(state): boolean {
      return state.goldTotal >= DIG_COST;
    },
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
        this.regionIds = board.regionIds;
        this.truthQuartz = buildQuartzTruthGrid(
          getFoundGoldPositions(board.truthGold, board.truthGold),
          board.size
        );
        this.revealed = createBooleanGrid(board.size);
        this.playerFlags = createBooleanGrid(board.size);
        this.foundGoldCount = 0;
        this.currentLevel += 1;
        this.phase = 'playing';
        this.lastActionMessage = `Level ${this.currentLevel}: ${
          this.depthTitle
        }. Each dig costs 1 gold.`;
      } catch (error) {
        console.error('[mining] Failed to load next level', error);
        this.phase = 'idle';
        this.setError('Unable to load a mining board right now.');
      }
    },

    setDepthLevel(depthLevel: MiningDepthLevel) {
      if (depthLevel > this.highestUnlockedDepthLevel) {
        this.setError('That depth has not been unlocked yet.');
        return;
      }

      if (this.currentDepthLevel === depthLevel) {
        return;
      }

      this.currentDepthLevel = depthLevel;
      void this.loadNextLevel();
    },

    toggleFlag(position: PositionRef) {
      if (this.phase !== 'playing') {
        return;
      }

      if (this.revealed[position.row]?.[position.col]) {
        return;
      }

      this.playerFlags[position.row][position.col] = !this.playerFlags[position.row][position.col];
      this.lastActionMessage = this.playerFlags[position.row][position.col]
        ? 'Flag placed.'
        : 'Flag removed.';
    },

    async dig(position: PositionRef) {
      if (this.phase !== 'playing') {
        return;
      }

      if (this.revealed[position.row]?.[position.col]) {
        return;
      }

      if (this.goldTotal < DIG_COST) {
        this.setError(
          'You need 1 gold to dig. Farm an earlier depth or finish the board efficiently.'
        );
        return;
      }

      this.playerFlags[position.row][position.col] = false;
      this.revealed[position.row][position.col] = true;
      this.goldTotal -= DIG_COST;
      this.daysElapsed += 1;
      this.clearError();

      if (this.truthGold[position.row][position.col]) {
        const reward = this.goldRewardPerTile;
        this.goldTotal += reward;
        this.foundGoldCount += 1;
        this.lastActionMessage = `Day ${this.daysElapsed}: You paid 1 gold to dig and found ${reward} gold.`;

        if (this.foundGoldCount === this.boardSize) {
          this.phase = 'level-complete';
          this.lastActionMessage = `Level ${this.currentLevel} cleared in the ${this.depthTitle.toLowerCase()}.`;
          this.pendingLevelTimeout = window.setTimeout(() => {
            this.pendingLevelTimeout = null;
            void this.loadNextLevel();
          }, LEVEL_COMPLETE_DELAY_MS);
        }

        return;
      }

      if (this.currentDepthLevel === 2 && this.truthQuartz[position.row][position.col]) {
        this.lastActionMessage = `Day ${this.daysElapsed}: You paid 1 gold to uncover quartz. That tile can never hold gold.`;
        return;
      }

      if (this.currentDepthLevel >= 3) {
        this.lastActionMessage = `Day ${this.daysElapsed}: You paid 1 gold to expose the region rock.`;
        return;
      }

      this.lastActionMessage = `Day ${this.daysElapsed}: You paid 1 gold to uncover plain dirt.`;
    },

    openShop() {
      this.shopOpen = true;
    },

    closeShop() {
      this.shopOpen = false;
    },

    canBuyUpgrade(upgradeId: MiningUpgradeId): boolean {
      const upgrade = getMiningUpgrade(upgradeId);
      return (
        !this.unlockedUpgradeIds.includes(upgrade.id) &&
        this.goldTotal >= upgrade.cost &&
        upgrade.unlocksDepth === this.highestUnlockedDepthLevel + 1
      );
    },

    buyUpgrade(upgradeId: MiningUpgradeId) {
      const upgrade = getMiningUpgrade(upgradeId);

      if (this.unlockedUpgradeIds.includes(upgrade.id)) {
        this.setError('That upgrade is already owned.');
        return;
      }

      if (upgrade.unlocksDepth !== this.highestUnlockedDepthLevel + 1) {
        this.setError('Unlock the previous depth before buying this upgrade.');
        return;
      }

      if (this.goldTotal < upgrade.cost) {
        this.setError('Not enough gold for that upgrade.');
        return;
      }

      this.goldTotal -= upgrade.cost;
      this.unlockedUpgradeIds.push(upgrade.id);
      this.highestUnlockedDepthLevel = upgrade.unlocksDepth;
      this.currentDepthLevel = upgrade.unlocksDepth;
      this.upgradeExplanationTitle = `${upgrade.title} Unlocked`;
      this.upgradeExplanationMessage = UPGRADE_EXPLANATIONS[upgrade.id];
      this.showUpgradeExplanation = true;
      this.shopOpen = false;
      this.lastActionMessage = `${upgrade.title} purchased. ${this.depthTitle} is now available.`;
      this.clearError();
      void this.loadNextLevel();
    },

    resetRun() {
      this.$patch(createInitialState());
      void this.initialize();
    },
  },
});
