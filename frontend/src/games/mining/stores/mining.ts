import { defineStore } from 'pinia';

import { AUTOMATION_OPTIONS } from '../game/progression/automation';
import { FIELD_OPTIONS, getFieldOption } from '../game/progression/fields';
import { getPermitOption, PERMIT_OPTIONS } from '../game/progression/permits';
import { TOOL_UPGRADES } from '../game/progression/toolUpgrades';
import type {
  MiningAutomationDefinition,
  MiningDepthLevel,
  MiningFieldDefinition,
  MiningFieldId,
  MiningMagpieSkillId,
  MiningPermitDefinition,
  MiningPermitTierId,
  MiningProgressionTab,
  MiningToolUpgradeDefinition,
  MiningToolUpgradeId,
  PositionRef,
} from '../game/types';
import { getGoldRewardForDepth } from '../game/upgrades/miningUpgrades';
import { getDepthSummary, getDepthTitle } from './miningConfig';
import {
  clearMiningSave,
  readMiningSave,
  restoreMiningState,
  writeMiningSave,
} from './miningPersistence';
import {
  activatePermit as activatePermitInProgression,
  buyAutomation as buyAutomationInProgression,
  buyField as buyFieldInProgression,
  buyFood as buyFoodInProgression,
  buyPermit as buyPermitInProgression,
  buyToolUpgrade as buyToolUpgradeInProgression,
  canBuyAutomation as canBuyAutomationInProgression,
  canBuyField as canBuyFieldInProgression,
  canBuyFood as canBuyFoodInProgression,
  canBuyPermit as canBuyPermitInProgression,
  canBuyToolUpgrade as canBuyToolUpgradeInProgression,
  canExchangeGold as canExchangeGoldInProgression,
  exchangeGoldForCoins as exchangeGoldForCoinsInProgression,
  selectField as selectFieldInProgression,
} from './miningProgressionService';
import {
  canTravelToNextField as canTravelToNextFieldInRun,
  dig as digInRun,
  goToNextField as goToNextFieldInRun,
  loadNextLevel as loadNextLevelInRun,
  recomputeSystemFlags,
  setDepthLevel as setDepthLevelInRun,
  toggleFlag as toggleFlagInRun,
  triggerOutOfFood,
} from './miningRunService';
import { createInitialMiningState } from './miningState';

export const useMiningStore = defineStore('mining', {
  state: () => createInitialMiningState(),

  getters: {
    phase: (state) => state.run.phase,
    currentLevel: (state) => state.run.currentLevel,
    currentPuzzleId: (state) => state.board.currentPuzzleId,
    boardSize: (state) => state.board.boardSize,
    truthGold: (state) => state.board.truthGold,
    truthQuartz: (state) => state.board.truthQuartz,
    regionIds: (state) => state.board.regionIds,
    revealed: (state) => state.board.revealed,
    playerFlags: (state) => state.board.playerFlags,
    systemFlags: (state) => state.board.systemFlags,
    goldTotal: (state) => state.economy.goldTotal,
    coinsTotal: (state) => state.economy.coinsTotal,
    foodTotal: (state) => state.economy.foodTotal,
    foundGoldCount: (state) => state.run.foundGoldCount,
    daysElapsed: (state) => state.run.daysElapsed,
    highestUnlockedDepthLevel: (state) => state.run.highestUnlockedDepthLevel,
    currentDepthLevel: (state) => state.run.currentDepthLevel,
    selectedProgressionTab: (state) => state.progression.selectedTab,
    ownedFieldIds: (state) => state.progression.ownedFieldIds,
    selectedFieldId: (state) => state.progression.selectedFieldId,
    magpieSkillIds: (state) => state.progression.magpieSkillIds,
    ownedPermitTierIds: (state) => state.progression.ownedPermitTierIds,
    activePermitTierId: (state) => state.progression.activePermitTierId,
    ownedToolUpgradeIds: (state) => state.progression.ownedToolUpgradeIds,
    showSettingsModal: (state) => state.ui.showSettingsModal,
    showIntroModal: (state) => state.ui.showIntroModal,
    showDeathModal: (state) => state.ui.showDeathModal,
    deathMessage: (state) => state.run.deathMessage,
    hintUnlocked: (state) => state.run.hintUnlocked,
    showHintModal: (state) => state.ui.showHintModal,
    shownHintDepths: (state) => state.run.shownHintDepths,
    showUpgradeExplanation: (state) => state.ui.showUpgradeExplanation,
    upgradeExplanationTitle: (state) => state.ui.upgradeExplanationTitle,
    upgradeExplanationMessage: (state) => state.ui.upgradeExplanationMessage,
    errorMessage: (state) => state.ui.errorMessage,
    errorTick: (state) => state.ui.errorTick,
    lastActionMessage: (state) => state.ui.lastActionMessage,
    progressionMenuOpen: (state) => state.ui.progressionMenuOpen,
    hasSeenIntroThisRun: (state) => state.ui.hasSeenIntroThisRun,
    hasMagpie: (state) => state.progression.magpieSkillIds.includes('buy-magpie'),

    visibleFlags(state): boolean[][] {
      return state.board.playerFlags.map((row, rowIndex) =>
        row.map((flagged, colIndex) => flagged || state.board.systemFlags[rowIndex][colIndex])
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
        (depthLevel) => depthLevel <= state.run.highestUnlockedDepthLevel
      ) as MiningDepthLevel[];
    },

    permitMultiplier(state): number {
      if (!state.progression.activePermitTierId) {
        return 1;
      }

      return getPermitOption(state.progression.activePermitTierId).payoutMultiplier;
    },

    baseGoldRewardPerTile(state): number {
      return getGoldRewardForDepth(state.run.currentDepthLevel);
    },

    goldRewardPerTile(state): number {
      return Math.round(getGoldRewardForDepth(state.run.currentDepthLevel) * this.permitMultiplier);
    },

    depthTitle(state): string {
      return getDepthTitle(state.run.currentDepthLevel);
    },

    depthSummary(state): string {
      return getDepthSummary(state.run.currentDepthLevel);
    },

    selectedFieldTitle(state): string {
      return getFieldOption(state.progression.selectedFieldId).title;
    },

    activePermitTitle(state): string {
      return state.progression.activePermitTierId
        ? getPermitOption(state.progression.activePermitTierId).title
        : 'None';
    },

    magpieSummary(state): string {
      if (!state.progression.magpieSkillIds.includes('buy-magpie')) {
        return 'No magpie hired yet.';
      }

      const lessonCount = state.progression.magpieSkillIds.filter(
        (skillId) => skillId !== 'buy-magpie'
      ).length;
      return lessonCount > 0
        ? `Magpie trained with ${lessonCount} lesson${lessonCount === 1 ? '' : 's'}.`
        : 'Magpie hired, waiting for lessons.';
    },

    canAffordDig(state): boolean {
      return state.economy.foodTotal > 0;
    },

    currentHintText(state): string {
      const alreadySeen = state.run.shownHintDepths.includes(state.run.currentDepthLevel);
      if (alreadySeen) {
        return 'No one has anything new to add. The hill expects you to listen to what it already told you.';
      }

      switch (state.run.currentDepthLevel) {
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
      if (!this.system.persistenceInitialized) {
        this.initializePersistence();
      }

      if (this.restoreFromStorage()) {
        return;
      }

      if (this.run.phase !== 'idle') {
        return;
      }

      await this.loadNextLevel();
      if (!this.ui.hasSeenIntroThisRun) {
        this.ui.showIntroModal = true;
        this.ui.hasSeenIntroThisRun = true;
      }
    },

    setError(message: string) {
      this.ui.errorMessage = message;
      this.ui.errorTick += 1;
    },

    clearError() {
      this.ui.errorMessage = null;
    },

    dismissIntro() {
      this.ui.showIntroModal = false;
    },

    openSettingsModal() {
      this.ui.showSettingsModal = true;
    },

    closeSettingsModal() {
      this.ui.showSettingsModal = false;
    },

    hideUpgradeExplanation() {
      this.ui.showUpgradeExplanation = false;
    },

    openHints() {
      if (!this.run.hintUnlocked) {
        this.setError(
          'No one is offering advice yet. Survive a bad run and the town starts talking.'
        );
        return;
      }

      this.ui.showHintModal = true;
      if (!this.run.shownHintDepths.includes(this.run.currentDepthLevel)) {
        this.run.shownHintDepths.push(this.run.currentDepthLevel);
      }
    },

    closeHints() {
      this.ui.showHintModal = false;
    },

    dismissDeathModal() {
      this.ui.showDeathModal = false;
    },

    initializePersistence() {
      if (this.system.persistenceInitialized) {
        return;
      }

      this.system.persistenceInitialized = true;
      this.$subscribe(
        () => {
          if (this.system.persistenceHydrating) {
            return;
          }

          writeMiningSave(this.$state);
        },
        { detached: true }
      );
    },

    restoreFromStorage(): boolean {
      const snapshot = readMiningSave();
      if (!snapshot) {
        return false;
      }

      this.system.persistenceHydrating = true;
      this.$patch((state) => {
        restoreMiningState(state, snapshot);
      });

      return true;
    },

    clearPersistedState() {
      clearMiningSave();
    },

    openProgressionMenu() {
      this.ui.progressionMenuOpen = true;
    },

    closeProgressionMenu() {
      this.ui.progressionMenuOpen = false;
    },

    setProgressionTab(tab: MiningProgressionTab) {
      this.progression.selectedTab = tab;
    },

    canBuyFood(): boolean {
      return canBuyFoodInProgression(this.$state);
    },

    buyFood() {
      buyFoodInProgression(this.$state, {
        setError: this.setError,
      });
    },

    canExchangeGold(): boolean {
      return canExchangeGoldInProgression(this.$state);
    },

    exchangeGoldForCoins() {
      exchangeGoldForCoinsInProgression(this.$state, {
        setError: this.setError,
      });
    },

    canTravelToNextField(): boolean {
      return canTravelToNextFieldInRun(this.$state);
    },

    async goToNextField(options?: { automatic?: boolean }) {
      await goToNextFieldInRun(
        this.$state,
        {
          setError: this.setError,
          loadNextLevel: () => this.loadNextLevel(),
        },
        options
      );
    },

    recomputeSystemFlags() {
      recomputeSystemFlags(this.$state);
    },

    async loadNextLevel() {
      await loadNextLevelInRun(this.$state, {
        setError: this.setError,
        clearError: this.clearError,
      });
    },

    setDepthLevel(depthLevel: MiningDepthLevel) {
      setDepthLevelInRun(this.$state, depthLevel, {
        setError: this.setError,
        loadNextLevel: () => this.loadNextLevel(),
      });
    },

    toggleFlag(position: PositionRef) {
      toggleFlagInRun(this.$state, position);
    },

    triggerDeath() {
      triggerOutOfFood(this.$state);
    },

    async dig(position: PositionRef) {
      await digInRun(this.$state, position, {
        setError: this.setError,
        clearError: this.clearError,
        goToNextField: (options) => this.goToNextField(options),
      });
    },

    canBuyField(fieldId: MiningFieldId): boolean {
      return canBuyFieldInProgression(this.$state, fieldId);
    },

    buyField(fieldId: MiningFieldId) {
      buyFieldInProgression(this.$state, fieldId, {
        setError: this.setError,
        loadNextLevel: () => this.loadNextLevel(),
      });
    },

    selectField(fieldId: MiningFieldId) {
      selectFieldInProgression(this.$state, fieldId, {
        setError: this.setError,
        loadNextLevel: () => this.loadNextLevel(),
      });
    },

    canBuyAutomation(skillId: MiningMagpieSkillId): boolean {
      return canBuyAutomationInProgression(this.$state, skillId);
    },

    buyAutomation(skillId: MiningMagpieSkillId) {
      buyAutomationInProgression(this.$state, skillId, {
        setError: this.setError,
      });
    },

    canBuyPermit(permitId: MiningPermitTierId): boolean {
      return canBuyPermitInProgression(this.$state, permitId);
    },

    buyPermit(permitId: MiningPermitTierId) {
      buyPermitInProgression(this.$state, permitId, {
        setError: this.setError,
      });
    },

    activatePermit(permitId: MiningPermitTierId) {
      activatePermitInProgression(this.$state, permitId, {
        setError: this.setError,
      });
    },

    canBuyToolUpgrade(upgradeId: MiningToolUpgradeId): boolean {
      return canBuyToolUpgradeInProgression(this.$state, upgradeId);
    },

    buyToolUpgrade(upgradeId: MiningToolUpgradeId) {
      buyToolUpgradeInProgression(this.$state, upgradeId, {
        setError: this.setError,
        loadNextLevel: () => this.loadNextLevel(),
      });
    },

    resetRun() {
      this.clearPersistedState();
      this.$patch(createInitialMiningState());
      void this.initialize();
    },

    deleteSavedGame() {
      this.clearPersistedState();
      this.$patch(createInitialMiningState());
      this.ui.showSettingsModal = false;
      void this.initialize();
    },
  },
});
