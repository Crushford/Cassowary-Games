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
const STARTING_GOLD = 20;
const LOW_GOLD_WARNING_THRESHOLD_MILD = 10;
const LOW_GOLD_WARNING_THRESHOLD_SEVERE = 5;

const UPGRADE_EXPLANATIONS: Record<MiningUpgradeId, string> = {
  'basic-pick':
    'A young magpie starts working ahead of you. Gold pays 10 here, and the ground starts confessing through quartz and dull grey rock.',
  'reinforced-pick':
    'Your magpie learns the colored claims. Quartz vanishes, but each region now permits only one gold seam.',
  'survey-scanner':
    'The magpie crew becomes a proper survey gang. Region borders are visible before the first dig, which is more than most miners ever get.',
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
    showIntroModal: false,
    hasSeenIntroThisRun: false,
    showDeathModal: false,
    deathMessage: null as string | null,
    hintUnlocked: false,
    showHintModal: false,
    shownHintDepths: [] as MiningDepthLevel[],
    showUpgradeExplanation: false,
    upgradeExplanationTitle: null as string | null,
    upgradeExplanationMessage: null as string | null,
    shopOpen: false,
    errorMessage: null as string | null,
    errorTick: 0,
    warningMessage: null as string | null,
    warningTick: 0,
    lastLowGoldWarningThreshold: null as number | null,
    lastActionMessage:
      'Start in the dirt layer. Efficient digging earns enough gold to unlock deeper mining methods.' as string,
    pendingLevelTimeout: null as number | null,
  };
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
          return 'Your survey crew maps the boundaries before the first swing. Reward 40 gold per hit.';
        case 3:
          return 'The earth breaks into colored claims. One gold seam per region. Reward 20 gold per hit.';
        case 2:
          return 'Stone starts talking. Quartz marks impossible ground. Reward 10 gold per hit.';
        default:
          return 'No hints. Just dirt, hunger, and the pattern you can learn. Reward 5 gold per hit.';
      }
    },

    canAffordDig(state): boolean {
      return state.goldTotal >= DIG_COST;
    },

    currentHintText(state): string {
      const alreadySeen = state.shownHintDepths.includes(state.currentDepthLevel);
      if (alreadySeen) {
        return 'No one has anything new to add. The hill expects you to listen to what it already told you.';
      }

      switch (state.currentDepthLevel) {
        case 4:
          return 'The survey birds know the borderlines before you strike. Use the map before you trust your hunger.';
        case 3:
          return 'Old miners say a rich patch never shares a color region with another rich patch.';
        case 2:
          return 'White stone is the earth crossing out bad guesses for you.';
        default:
          return 'Most miners break even. The clever ones notice which seams refuse to crowd each other.';
      }
    },
  },

  actions: {
    async initialize() {
      if (this.phase !== 'idle') {
        return;
      }

      await this.loadNextLevel();
      if (!this.hasSeenIntroThisRun) {
        this.showIntroModal = true;
        this.hasSeenIntroThisRun = true;
      }
    },

    setError(message: string) {
      this.errorMessage = message;
      this.errorTick += 1;
    },

    clearError() {
      this.errorMessage = null;
    },

    setWarning(message: string) {
      this.warningMessage = message;
      this.warningTick += 1;
    },

    clearWarning() {
      this.warningMessage = null;
    },

    dismissIntro() {
      this.showIntroModal = false;
    },

    hideUpgradeExplanation() {
      this.showUpgradeExplanation = false;
    },

    openHints() {
      if (!this.hintUnlocked) {
        this.setError(
          'No one is offering advice yet. Survive a bad run and the town starts talking.'
        );
        return;
      }

      this.showHintModal = true;
      if (!this.shownHintDepths.includes(this.currentDepthLevel)) {
        this.shownHintDepths.push(this.currentDepthLevel);
      }
    },

    closeHints() {
      this.showHintModal = false;
    },

    dismissDeathModal() {
      this.showDeathModal = false;
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
        this.showDeathModal = false;
        this.deathMessage = null;
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

    checkLowGoldWarnings(previousGoldTotal: number) {
      if (
        previousGoldTotal > LOW_GOLD_WARNING_THRESHOLD_MILD &&
        this.goldTotal <= LOW_GOLD_WARNING_THRESHOLD_MILD &&
        this.lastLowGoldWarningThreshold !== LOW_GOLD_WARNING_THRESHOLD_MILD
      ) {
        this.lastLowGoldWarningThreshold = LOW_GOLD_WARNING_THRESHOLD_MILD;
        this.setWarning('Supplies are running low.');
        return;
      }

      if (
        previousGoldTotal > LOW_GOLD_WARNING_THRESHOLD_SEVERE &&
        this.goldTotal <= LOW_GOLD_WARNING_THRESHOLD_SEVERE &&
        this.lastLowGoldWarningThreshold !== LOW_GOLD_WARNING_THRESHOLD_SEVERE
      ) {
        this.lastLowGoldWarningThreshold = LOW_GOLD_WARNING_THRESHOLD_SEVERE;
        this.setWarning("You're digging on borrowed time.");
      }
    },

    triggerDeath() {
      if (this.pendingLevelTimeout !== null) {
        window.clearTimeout(this.pendingLevelTimeout);
        this.pendingLevelTimeout = null;
      }

      this.phase = 'dead';
      this.goldTotal = 0;
      this.shopOpen = false;
      this.showHintModal = false;
      this.showUpgradeExplanation = false;
      this.showIntroModal = false;
      this.showDeathModal = true;
      this.hintUnlocked = true;
      this.deathMessage =
        'You starved underground.\nMost miners do.\n\nA condor drags you back to the surface.\nIt thinks you can do better.\n\nYou start listening more carefully.';
      this.lastActionMessage = 'Out of supplies. The contract ends here.';
      this.clearWarning();
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
      const previousGoldTotal = this.goldTotal;
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

        this.checkLowGoldWarnings(previousGoldTotal);

        return;
      }

      if (this.currentDepthLevel === 2 && this.truthQuartz[position.row][position.col]) {
        this.lastActionMessage = `Day ${this.daysElapsed}: You paid 1 gold to uncover quartz. That tile can never hold gold.`;
        return;
      }

      if (this.currentDepthLevel >= 3) {
        this.lastActionMessage = `Day ${this.daysElapsed}: You paid 1 gold to expose the region rock.`;
      } else {
        this.lastActionMessage = `Day ${this.daysElapsed}: You paid 1 gold to uncover plain dirt.`;
      }

      if (this.goldTotal <= 0) {
        this.triggerDeath();
        return;
      }

      this.checkLowGoldWarnings(previousGoldTotal);
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

    restartAfterDeath() {
      const unlockedUpgradeIds = [...this.unlockedUpgradeIds];
      const highestUnlockedDepthLevel = this.highestUnlockedDepthLevel;
      const hintUnlocked = this.hintUnlocked;

      this.$patch({
        ...createInitialState(),
        unlockedUpgradeIds,
        highestUnlockedDepthLevel,
        currentDepthLevel: 1 as MiningDepthLevel,
        hintUnlocked,
        hasSeenIntroThisRun: true,
      });

      void this.loadNextLevel();
    },

    resetRun() {
      this.$patch(createInitialState());
      void this.initialize();
    },
  },
});
