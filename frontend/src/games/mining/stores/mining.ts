import { defineStore } from 'pinia';

import { AUTOMATION_OPTIONS, getAutomationOption } from '../game/progression/automation';
import { FIELD_OPTIONS, getFieldOption } from '../game/progression/fields';
import { getPermitOption, PERMIT_OPTIONS } from '../game/progression/permits';
import { getToolUpgrade, TOOL_UPGRADES } from '../game/progression/toolUpgrades';
import { loadRandomMiningPuzzle } from '../game/puzzles/loadMiningPuzzle';
import { convertQueensPuzzleToMiningBoard } from '../game/puzzles/convertQueensPuzzleToMiningBoard';
import { buildSelectiveAutoFlagGrid } from '../game/rules/autoFlag';
import { buildQuartzTruthGrid } from '../game/rules/quartzTruth';
import { getFoundGoldPositions } from '../game/selectors/getFoundGoldPositions';
import type {
  MiningAutomationDefinition,
  MiningDepthLevel,
  MiningFieldDefinition,
  MiningFieldId,
  MiningMagpieSkillId,
  MiningPermitDefinition,
  MiningPermitTierId,
  MiningPhase,
  MiningProgressionTab,
  MiningToolUpgradeDefinition,
  MiningToolUpgradeId,
  PositionRef,
} from '../game/types';
import { getGoldRewardForDepth } from '../game/upgrades/miningUpgrades';
import { createBooleanGrid } from '../game/utils/createBooleanGrid';

const DIG_COST = 1;
const LEVEL_COMPLETE_DELAY_MS = 700;
const STARTING_GOLD = 20;
const LOW_GOLD_WARNING_THRESHOLD_MILD = 10;
const LOW_GOLD_WARNING_THRESHOLD_SEVERE = 5;

const TOOL_EXPLANATIONS: Partial<Record<MiningToolUpgradeId, string>> = {
  'stronger-pick':
    'The first equipment step unlocks the stone layer. Depth lives in Tools; field profile stays separate in the new menu.',
  'deeper-digging':
    'The rig now reaches region logic. The board is the same hidden Queens seam, but the layer explains more.',
  scanner:
    'The scanner unlocks the mapped region layer without changing the underlying board model.',
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
    systemFlags: createBooleanGrid(5),
    goldTotal: STARTING_GOLD,
    foundGoldCount: 0,
    daysElapsed: 0,
    highestUnlockedDepthLevel: 1 as MiningDepthLevel,
    currentDepthLevel: 1 as MiningDepthLevel,
    progressionMenuOpen: false,
    selectedProgressionTab: 'field' as MiningProgressionTab,
    ownedFieldIds: ['training-field'] as MiningFieldId[],
    selectedFieldId: 'training-field' as MiningFieldId,
    hasMagpie: false,
    magpieSkillIds: [] as MiningMagpieSkillId[],
    ownedPermitTierIds: [] as MiningPermitTierId[],
    activePermitTierId: null as MiningPermitTierId | null,
    ownedToolUpgradeIds: [] as MiningToolUpgradeId[],
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
    errorMessage: null as string | null,
    errorTick: 0,
    warningMessage: null as string | null,
    warningTick: 0,
    lastLowGoldWarningThreshold: null as number | null,
    lastActionMessage:
      'Prototype mode: every menu item costs 1 so field, permits, automation, and tool categories can be tested quickly.' as string,
    pendingLevelTimeout: null as number | null,
  };
}

export const useMiningStore = defineStore('mining', {
  state: () => createInitialState(),

  getters: {
    visibleFlags(state): boolean[][] {
      return state.playerFlags.map((row, rowIndex) =>
        row.map((flagged, colIndex) => flagged || state.systemFlags[rowIndex][colIndex])
      );
    },

    fieldOptions(): MiningFieldDefinition[] {
      return FIELD_OPTIONS;
    },

    automationOptions(): MiningAutomationDefinition[] {
      return AUTOMATION_OPTIONS;
    },

    permitOptions(): MiningPermitDefinition[] {
      return PERMIT_OPTIONS;
    },

    toolUpgradeOptions(): MiningToolUpgradeDefinition[] {
      return TOOL_UPGRADES;
    },

    availableDepthLevels(state): MiningDepthLevel[] {
      return [1, 2, 3, 4].filter(
        (depthLevel) => depthLevel <= state.highestUnlockedDepthLevel
      ) as MiningDepthLevel[];
    },

    permitMultiplier(state): number {
      if (!state.activePermitTierId) {
        return 1;
      }

      return getPermitOption(state.activePermitTierId).payoutMultiplier;
    },

    baseGoldRewardPerTile(state): number {
      return getGoldRewardForDepth(state.currentDepthLevel);
    },

    goldRewardPerTile(state): number {
      return Math.round(getGoldRewardForDepth(state.currentDepthLevel) * this.permitMultiplier);
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
          return 'Your survey tools expose region borders before the first swing.';
        case 3:
          return 'The earth breaks into colored claims. One seam per region.';
        case 2:
          return 'Stone starts talking. Quartz marks impossible ground.';
        default:
          return 'No hints. Just dirt, cost pressure, and the pattern you can learn.';
      }
    },

    selectedFieldTitle(state): string {
      return getFieldOption(state.selectedFieldId).title;
    },

    activePermitTitle(state): string {
      return state.activePermitTierId ? getPermitOption(state.activePermitTierId).title : 'None';
    },

    magpieSummary(state): string {
      if (!state.hasMagpie) {
        return 'No magpie hired yet.';
      }

      const lessonCount = state.magpieSkillIds.filter((skillId) => skillId !== 'buy-magpie').length;
      return lessonCount > 0
        ? `Magpie trained with ${lessonCount} lesson${lessonCount === 1 ? '' : 's'}.`
        : 'Magpie hired, waiting for lessons.';
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

    openProgressionMenu() {
      this.progressionMenuOpen = true;
    },

    closeProgressionMenu() {
      this.progressionMenuOpen = false;
    },

    setProgressionTab(tab: MiningProgressionTab) {
      this.selectedProgressionTab = tab;
    },

    recomputeSystemFlags() {
      if (!this.hasMagpie) {
        this.systemFlags = createBooleanGrid(this.boardSize);
        return;
      }

      const foundGold = getFoundGoldPositions(this.truthGold, this.revealed);
      if (foundGold.length === 0) {
        this.systemFlags = createBooleanGrid(this.boardSize);
        return;
      }

      const row = this.magpieSkillIds.includes('teach-row-rule');
      const column = this.magpieSkillIds.includes('teach-column-rule');
      const diagonal = this.magpieSkillIds.includes('teach-diagonal-rule');

      if (!row && !column && !diagonal) {
        this.systemFlags = createBooleanGrid(this.boardSize);
        return;
      }

      this.systemFlags = buildSelectiveAutoFlagGrid(foundGold, this.revealed, this.boardSize, {
        row,
        column,
        diagonal,
      });
    },

    async loadNextLevel() {
      if (this.pendingLevelTimeout !== null) {
        window.clearTimeout(this.pendingLevelTimeout);
        this.pendingLevelTimeout = null;
      }

      this.phase = 'loading';
      this.clearError();

      try {
        const puzzle = await loadRandomMiningPuzzle(this.currentPuzzleId, this.selectedFieldId);
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
        this.systemFlags = createBooleanGrid(board.size);
        this.foundGoldCount = 0;
        this.showDeathModal = false;
        this.deathMessage = null;
        this.currentLevel += 1;
        this.phase = 'playing';
        this.lastActionMessage = `Level ${this.currentLevel}: ${this.selectedFieldTitle}, ${this.depthTitle}. Each dig costs 1 gold.`;
        this.recomputeSystemFlags();
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
      this.progressionMenuOpen = false;
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
        this.setError('You need 1 gold to dig. Adjust the loadout or restart the contract.');
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
        this.recomputeSystemFlags();

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
      } else if (this.currentDepthLevel >= 3) {
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

    canBuyField(fieldId: MiningFieldId): boolean {
      const field = getFieldOption(fieldId);
      return (
        field.implemented && !this.ownedFieldIds.includes(fieldId) && this.goldTotal >= field.cost
      );
    },

    buyField(fieldId: MiningFieldId) {
      const field = getFieldOption(fieldId);

      if (this.ownedFieldIds.includes(fieldId)) {
        this.selectField(fieldId);
        return;
      }

      if (!field.implemented) {
        this.setError('That field profile is visible for testing, but not implemented yet.');
        return;
      }

      if (this.goldTotal < field.cost) {
        this.setError('Not enough gold for that field profile.');
        return;
      }

      this.goldTotal -= field.cost;
      this.ownedFieldIds.push(fieldId);
      this.selectedFieldId = fieldId;
      this.lastActionMessage = field.implemented
        ? `${field.title} unlocked and selected.`
        : `${field.title} unlocked. It still uses the current 5x5 board under the hood in this prototype.`;
      void this.loadNextLevel();
    },

    selectField(fieldId: MiningFieldId) {
      if (!this.ownedFieldIds.includes(fieldId)) {
        this.setError('Buy that field profile first.');
        return;
      }

      if (this.selectedFieldId === fieldId) {
        return;
      }

      this.selectedFieldId = fieldId;
      this.lastActionMessage = `${getFieldOption(fieldId).title} selected.`;
      void this.loadNextLevel();
    },

    canBuyAutomation(skillId: MiningMagpieSkillId): boolean {
      const skill = getAutomationOption(skillId);
      if (!skill.implemented) {
        return false;
      }

      if (skillId !== 'buy-magpie' && !this.magpieSkillIds.includes('buy-magpie')) {
        return false;
      }

      return !this.magpieSkillIds.includes(skillId) && this.goldTotal >= skill.cost;
    },

    buyAutomation(skillId: MiningMagpieSkillId) {
      const skill = getAutomationOption(skillId);

      if (this.magpieSkillIds.includes(skillId)) {
        this.setError('That magpie lesson is already owned.');
        return;
      }

      if (!skill.implemented) {
        this.setError('That magpie lesson is still a prototype placeholder.');
        return;
      }

      if (skillId !== 'buy-magpie' && !this.magpieSkillIds.includes('buy-magpie')) {
        this.setError('Buy the magpie before purchasing lessons.');
        return;
      }

      if (this.goldTotal < skill.cost) {
        this.setError('Not enough gold for that lesson.');
        return;
      }

      this.goldTotal -= skill.cost;

      if (skillId === 'buy-magpie') {
        this.hasMagpie = true;
      }

      this.magpieSkillIds.push(skillId);
      this.recomputeSystemFlags();
      this.lastActionMessage = `${skill.title} purchased. ${skill.effectSummary}`;
    },

    canBuyPermit(permitId: MiningPermitTierId): boolean {
      const permit = getPermitOption(permitId);
      return !this.ownedPermitTierIds.includes(permitId) && this.goldTotal >= permit.cost;
    },

    buyPermit(permitId: MiningPermitTierId) {
      const permit = getPermitOption(permitId);

      if (this.ownedPermitTierIds.includes(permitId)) {
        this.activatePermit(permitId);
        return;
      }

      if (this.goldTotal < permit.cost) {
        this.setError('Not enough gold for that permit.');
        return;
      }

      this.goldTotal -= permit.cost;
      this.ownedPermitTierIds.push(permitId);
      this.activePermitTierId = permitId;
      this.lastActionMessage = `${permit.title} activated. Payouts now run at ${permit.payoutMultiplier}x.`;
    },

    activatePermit(permitId: MiningPermitTierId) {
      if (!this.ownedPermitTierIds.includes(permitId)) {
        this.setError('Buy that permit first.');
        return;
      }

      this.activePermitTierId = permitId;
      this.lastActionMessage = `${getPermitOption(permitId).title} set as the active permit.`;
    },

    canBuyToolUpgrade(upgradeId: MiningToolUpgradeId): boolean {
      const upgrade = getToolUpgrade(upgradeId);
      return (
        upgrade.implemented &&
        !this.ownedToolUpgradeIds.includes(upgradeId) &&
        this.goldTotal >= upgrade.cost
      );
    },

    buyToolUpgrade(upgradeId: MiningToolUpgradeId) {
      const upgrade = getToolUpgrade(upgradeId);

      if (this.ownedToolUpgradeIds.includes(upgradeId)) {
        this.setError('That tool upgrade is already owned.');
        return;
      }

      if (!upgrade.implemented) {
        this.setError('That tool slot is visible for prototype planning, but not live yet.');
        return;
      }

      if (this.goldTotal < upgrade.cost) {
        this.setError('Not enough gold for that tool upgrade.');
        return;
      }

      this.goldTotal -= upgrade.cost;
      this.ownedToolUpgradeIds.push(upgradeId);

      if (upgrade.unlocksDepth) {
        this.highestUnlockedDepthLevel = Math.max(
          this.highestUnlockedDepthLevel,
          upgrade.unlocksDepth
        ) as MiningDepthLevel;
        this.currentDepthLevel = upgrade.unlocksDepth;
      }

      if (TOOL_EXPLANATIONS[upgradeId]) {
        this.upgradeExplanationTitle = `${upgrade.title} Purchased`;
        this.upgradeExplanationMessage = TOOL_EXPLANATIONS[upgradeId] ?? '';
        this.showUpgradeExplanation = true;
      }

      this.progressionMenuOpen = false;
      this.lastActionMessage = `${upgrade.title} purchased. ${upgrade.effectSummary}`;

      if (upgrade.unlocksDepth) {
        void this.loadNextLevel();
      }
    },

    restartAfterDeath() {
      const highestUnlockedDepthLevel = this.highestUnlockedDepthLevel;
      const hintUnlocked = this.hintUnlocked;
      const ownedFieldIds = [...this.ownedFieldIds];
      const selectedFieldId = this.selectedFieldId;
      const hasMagpie = this.hasMagpie;
      const magpieSkillIds = [...this.magpieSkillIds];
      const ownedPermitTierIds = [...this.ownedPermitTierIds];
      const activePermitTierId = this.activePermitTierId;
      const ownedToolUpgradeIds = [...this.ownedToolUpgradeIds];

      this.$patch({
        ...createInitialState(),
        highestUnlockedDepthLevel,
        currentDepthLevel: 1 as MiningDepthLevel,
        hintUnlocked,
        hasSeenIntroThisRun: true,
        ownedFieldIds,
        selectedFieldId,
        hasMagpie,
        magpieSkillIds,
        ownedPermitTierIds,
        activePermitTierId,
        ownedToolUpgradeIds,
      });

      void this.loadNextLevel();
    },

    resetRun() {
      this.$patch(createInitialState());
      void this.initialize();
    },
  },
});
