import { defineStore } from 'pinia';

import { AUTOMATION_OPTIONS } from '../game/progression/automation';
import { TOOL_UPGRADES } from '../game/progression/toolUpgrades';
import type {
  MiningAutomationDefinition,
  MiningExchangeLevelDefinition,
  MiningFlagType,
  MiningMagpieSkillId,
  MiningProgressionTab,
  MiningTownStep,
  MiningToolUpgradeDefinition,
  MiningToolUpgradeId,
  PositionRef,
} from '../game/types';
import { EXCHANGE_LEVELS, GOLD_REWARD_PER_TILE } from './miningConfig';
import {
  clearMiningSave,
  isSaveCompatible,
  readMiningSave,
  restoreMiningState,
  writeMiningSave,
} from './miningPersistence';
import {
  buyAutomation as buyAutomationInProgression,
  buyFood as buyFoodInProgression,
  buyToolUpgrade as buyToolUpgradeInProgression,
  canBuyAutomation as canBuyAutomationInProgression,
  canBuyFood as canBuyFoodInProgression,
  canBuyToolUpgrade as canBuyToolUpgradeInProgression,
  canExchangeGold as canExchangeGoldInProgression,
  exchangeGoldForCoins as exchangeGoldForCoinsInProgression,
  triggerFoodGameOverIfNeeded,
} from './miningProgressionService';
import {
  canTravelToNextField as canTravelToNextFieldInRun,
  dig as digInRun,
  endMonthAndGoToTown,
  goToNextField as goToNextFieldInRun,
  loadNextLevel as loadNextLevelInRun,
  recomputeSystemFlags,
  toggleFlag as toggleFlagInRun,
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
    daysLeftInMonth: (state) => state.run.daysLeftInMonth,
    daysPerMonth: (state) => state.run.daysPerMonth,
    foundGoldCount: (state) => state.run.foundGoldCount,
    daysElapsed: (state) => state.run.daysElapsed,
    currentMonthLevel: (state) => state.run.currentMonthLevel,
    bestLevel: (state) => state.run.bestLevel,
    displayLevel: (state) => state.exchange.lastReachedLevel,
    goldCollectedThisMonth: (state) => state.run.goldCollectedThisMonth,
    selectedProgressionTab: (state) => state.progression.selectedTab,
    townStep: (state) => state.progression.townStep,
    showPurchasedUpgrades: (state) => state.progression.showPurchasedUpgrades,
    magpieSkillIds: (state) => state.progression.magpieSkillIds,
    ownedToolUpgradeIds: (state) => state.progression.ownedToolUpgradeIds,
    showSettingsModal: (state) => state.ui.showSettingsModal,
    showIntroModal: (state) => state.ui.showIntroModal,
    showMonthOverModal: (state) => state.ui.showMonthOverModal,
    showDeathModal: (state) => state.ui.showDeathModal,
    showFieldExhaustedModal: (state) => state.ui.showFieldExhaustedModal,
    levelCelebration: (state) => state.ui.levelCelebration,
    deathMessage: (state) => state.run.deathMessage,
    showHintModal: (state) => state.ui.showHintModal,
    showUpgradeExplanation: (state) => state.ui.showUpgradeExplanation,
    upgradeExplanationTitle: (state) => state.ui.upgradeExplanationTitle,
    upgradeExplanationMessage: (state) => state.ui.upgradeExplanationMessage,
    errorMessage: (state) => state.ui.errorMessage,
    errorTick: (state) => state.ui.errorTick,
    lastActionMessage: (state) => state.ui.lastActionMessage,
    progressionMenuOpen: (state) => state.ui.progressionMenuOpen,
    hasSeenIntroThisRun: (state) => state.ui.hasSeenIntroThisRun,
    hasMagpie: (state) => state.progression.magpieSkillIds.includes('buy-magpie'),

    visibleFlags(state): Array<Array<MiningFlagType | null>> {
      return state.board.playerFlags.map((row, rowIndex) =>
        row.map((flagged, colIndex) => flagged ?? state.board.systemFlags[rowIndex][colIndex])
      );
    },

    exchangeLevels(): MiningExchangeLevelDefinition[] {
      return EXCHANGE_LEVELS;
    },

    visibleAutomationOptions(state): MiningAutomationDefinition[] {
      return AUTOMATION_OPTIONS.filter((option) => {
        if (option.requiredLevel > state.run.bestLevel) {
          return false;
        }

        if (state.progression.showPurchasedUpgrades) {
          return true;
        }

        return !state.progression.magpieSkillIds.includes(option.id);
      });
    },

    visibleToolUpgradeOptions(state): MiningToolUpgradeDefinition[] {
      return TOOL_UPGRADES.filter((option) => {
        if (option.requiredLevel > state.run.bestLevel) {
          return false;
        }

        if (state.progression.showPurchasedUpgrades) {
          return true;
        }

        return !state.progression.ownedToolUpgradeIds.includes(option.id);
      });
    },

    baseGoldRewardPerTile(state): number {
      return GOLD_REWARD_PER_TILE;
    },

    goldRewardPerTile(state): number {
      return GOLD_REWARD_PER_TILE;
    },

    totalGoldOnBoard(state): number {
      return state.board.truthGold.reduce(
        (count, row) => count + row.filter((hasGold) => hasGold).length,
        0
      );
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
      return state.run.phase === 'playing' && state.run.daysLeftInMonth > 0;
    },

    canShowScannerRegions(state): boolean {
      return state.progression.ownedToolUpgradeIds.includes('scanner');
    },

    exchangeSummary(state) {
      return {
        soldGold: state.exchange.lastSoldGold,
        baseValue: state.exchange.lastBaseValue,
        returnPercent: state.exchange.lastReturnPercent,
        bonus: state.exchange.lastBonus,
        payout: state.exchange.lastPayout,
        reachedLevel: state.exchange.lastReachedLevel,
        bestLevel: state.run.bestLevel,
        nextThreshold: state.exchange.nextThreshold,
        progressRatio: state.exchange.progressRatio,
        processed: state.progression.exchangeProcessedThisTown,
      };
    },

    canAdvanceTownStep(state): boolean {
      switch (state.progression.townStep) {
        case 'exchange':
          return state.progression.exchangeProcessedThisTown;
        case 'food-shop':
          return state.progression.monthlyUpkeepPaid;
        case 'magpie-trainer':
        case 'tool-store':
          return true;
        default:
          return false;
      }
    },

    currentHintText(state): string {
      if (state.run.hasSeenHint) {
        return 'No one has anything new to add. The hill expects you to listen to what it already told you.';
      }

      return 'Most miners break even. The clever ones notice which seams refuse to crowd each other.';
    },
  },

  actions: {
    async initialize() {
      if (!this.system.persistenceInitialized) {
        this.initializePersistence();
      }

      const restoreResult = this.restoreFromStorage();

      if (restoreResult === 'restored' && this.run.phase !== 'idle') {
        return;
      }

      if (restoreResult === 'restored' && this.run.phase === 'idle') {
        this.ui.showIntroModal = true;
        this.ui.hasSeenIntroThisRun = true;
      }

      if (this.run.phase !== 'idle') {
        return;
      }

      await this.loadNextLevel();

      if (restoreResult === 'beta-reset') {
        this.ui.lastActionMessage =
          'This game is in beta and your previous save was from an older version. ' +
          'Your progress has been reset — sorry for the inconvenience!';
      }

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

    dismissMonthOverModal() {
      this.ui.showMonthOverModal = false;
      this.ui.progressionMenuOpen = true;
      this.progression.townStep = 'exchange';
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
      if (this.run.hasSeenHint) {
        this.setError(
          'No one has anything new to add. The hill expects you to listen to what it already told you.'
        );
        return;
      }

      this.ui.showHintModal = true;
      this.run.hasSeenHint = true;
    },

    closeHints() {
      this.ui.showHintModal = false;
    },

    dismissDeathModal() {
      this.ui.showDeathModal = false;
    },

    dismissFieldExhaustedModal() {
      this.ui.showFieldExhaustedModal = false;
    },

    dismissLevelCelebration() {
      this.ui.levelCelebration = null;
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

    ensureVisibleBlockingUi() {
      console.log('[mining][ui-restore]', {
        phase: this.run.phase,
        showIntroModal: this.ui.showIntroModal,
        showMonthOverModal: this.ui.showMonthOverModal,
        progressionMenuOpen: this.ui.progressionMenuOpen,
        showFieldExhaustedModal: this.ui.showFieldExhaustedModal,
        showDeathModal: this.ui.showDeathModal,
        townStep: this.progression.townStep,
      });

      if (this.run.phase === 'playing') {
        return;
      }

      if (this.run.phase === 'town') {
        if (!this.ui.showMonthOverModal && !this.ui.progressionMenuOpen) {
          this.ui.progressionMenuOpen = true;
        }
        return;
      }

      if (this.run.phase === 'level-complete') {
        this.ui.showFieldExhaustedModal = true;
        return;
      }

      if (this.run.phase === 'out-of-food' || this.run.phase === 'dead') {
        this.ui.showDeathModal = true;
      }
    },

    restoreFromStorage(): 'restored' | 'beta-reset' | 'no-save' {
      const snapshot = readMiningSave();
      if (!snapshot) {
        return 'no-save';
      }

      if (!isSaveCompatible(snapshot)) {
        clearMiningSave();
        return 'beta-reset';
      }

      this.system.persistenceHydrating = true;
      this.$patch((state) => {
        restoreMiningState(state, snapshot);
      });
      this.ensureVisibleBlockingUi();

      return 'restored';
    },

    clearPersistedState() {
      clearMiningSave();
    },

    openProgressionMenu() {
      if (this.run.phase !== 'town') {
        return;
      }
      this.ui.progressionMenuOpen = true;
    },

    closeProgressionMenu() {
      this.ui.progressionMenuOpen = false;
    },

    setProgressionTab(tab: MiningProgressionTab) {
      this.progression.selectedTab = tab;
    },

    toggleShowPurchasedUpgrades() {
      this.progression.showPurchasedUpgrades = !this.progression.showPurchasedUpgrades;
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

    continueTownSequence() {
      const nextStep: Record<Exclude<MiningTownStep, 'none'>, MiningTownStep> = {
        exchange: 'food-shop',
        'food-shop': 'magpie-trainer',
        'magpie-trainer': 'tool-store',
        'tool-store': 'none',
      };

      if (!this.canAdvanceTownStep) {
        return;
      }

      if (this.progression.townStep === 'tool-store') {
        this.beginNextMonth();
        return;
      }

      const upcomingStep = nextStep[this.progression.townStep as Exclude<MiningTownStep, 'none'>];
      this.progression.townStep = upcomingStep;

      if (upcomingStep === 'food-shop') {
        triggerFoodGameOverIfNeeded(this.$state);
      }
    },

    beginNextMonth() {
      if (!this.progression.monthlyUpkeepPaid) {
        this.setError('Pay the monthly food bill before returning to the field.');
        return;
      }

      this.run.phase = 'playing';
      this.run.daysLeftInMonth = this.run.daysPerMonth;
      this.run.currentMonthLevel = 0;
      this.run.goldCollectedThisMonth = 0;
      this.progression.townStep = 'none';
      this.progression.exchangeProcessedThisTown = false;
      this.progression.monthlyUpkeepPaid = false;
      this.ui.progressionMenuOpen = false;
      this.ui.showMonthOverModal = false;
      this.ui.lastActionMessage = 'A new month begins underground.';
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
      this.ui.showFieldExhaustedModal = false;
      await loadNextLevelInRun(this.$state, {
        setError: this.setError,
        clearError: this.clearError,
      });
    },

    toggleFlag(position: PositionRef) {
      toggleFlagInRun(this.$state, position);
    },

    triggerMonthEnd() {
      endMonthAndGoToTown(this.$state);
    },

    async dig(position: PositionRef) {
      await digInRun(this.$state, position, {
        setError: this.setError,
        clearError: this.clearError,
        goToNextField: (options) => this.goToNextField(options),
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

    canBuyToolUpgrade(upgradeId: MiningToolUpgradeId): boolean {
      return canBuyToolUpgradeInProgression(this.$state, upgradeId);
    },

    buyToolUpgrade(upgradeId: MiningToolUpgradeId) {
      buyToolUpgradeInProgression(this.$state, upgradeId, {
        setError: this.setError,
      });
    },

    resetRun() {
      this.clearPersistedState();
      this.$patch(createInitialMiningState());
      this.ui.showIntroModal = true;
      this.ui.hasSeenIntroThisRun = true;
      void this.initialize();
    },

    deleteSavedGame() {
      this.clearPersistedState();
      this.$patch(createInitialMiningState());
      this.ui.showSettingsModal = false;
      this.ui.showIntroModal = true;
      this.ui.hasSeenIntroThisRun = true;
      void this.initialize();
    },
  },
});
