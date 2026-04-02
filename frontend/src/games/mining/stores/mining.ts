import { defineStore } from 'pinia';

import { AUTOMATION_OPTIONS } from '../game/progression/automation';
import { PLOT_PERMITS } from '../game/progression/plotPermits';
import { TOOL_UPGRADES } from '../game/progression/toolUpgrades';
import type {
  MiningAutomationDefinition,
  MiningExchangeLevelDefinition,
  MiningFlagType,
  MiningMagpieSkillId,
  MiningPlotPermitDefinition,
  MiningPlotPermitId,
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
  buyPlotPermit as buyPlotPermitInProgression,
  buyToolUpgrade as buyToolUpgradeInProgression,
  canBuyAutomation as canBuyAutomationInProgression,
  canBuyPlotPermit as canBuyPlotPermitInProgression,
  canBuyToolUpgrade as canBuyToolUpgradeInProgression,
  canExchangeGold as canExchangeGoldInProgression,
  exchangeGoldForCoins as exchangeGoldForCoinsInProgression,
} from './miningProgressionService';
import {
  canTravelToNextField as canTravelToNextFieldInRun,
  dig as digInRun,
  goToNextField as goToNextFieldInRun,
  loadNextLevel as loadNextLevelInRun,
  recomputeSystemFlags,
  toggleFlag as toggleFlagInRun,
} from './miningRunService';
import { cloneFlagGrid, createInitialMiningState } from './miningState';

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
    foundGoldCount: (state) => state.run.foundGoldCount,
    daysElapsed: (state) => state.run.daysElapsed,
    currentMonthLevel: (state) => state.run.currentMonthLevel,
    bestLevel: (state) => state.run.bestLevel,
    displayLevel: (state) => state.exchange.lastReachedLevel,
    townStep: (state) => state.progression.townStep,
    showPurchasedUpgrades: (state) => state.progression.showPurchasedUpgrades,
    magpieSkillIds: (state) => state.progression.magpieSkillIds,
    ownedToolUpgradeIds: (state) => state.progression.ownedToolUpgradeIds,
    maxPlotSize: (state) => state.progression.maxPlotSize,
    showSettingsModal: (state) => state.ui.showSettingsModal,
    showIntroModal: (state) => state.ui.showIntroModal,
    showFieldExhaustedModal: (state) => state.ui.showFieldExhaustedModal,
    levelCelebration: (state) => state.ui.levelCelebration,
    showHintModal: (state) => state.ui.showHintModal,
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

    visiblePlotPermitOptions(state): MiningPlotPermitDefinition[] {
      return PLOT_PERMITS.filter((option) => {
        if (option.requiredLevel > state.run.bestLevel) {
          return false;
        }

        if (state.progression.showPurchasedUpgrades) {
          return true;
        }

        return option.size > state.progression.maxPlotSize;
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
      return state.run.phase === 'playing';
    },

    canShowScannerRegions(state): boolean {
      return state.progression.ownedToolUpgradeIds.includes('scanner');
    },

    canUndoFlags(state): boolean {
      return state.system.flagHistory.length > 0;
    },

    hasPlayerFlags(state): boolean {
      return state.board.playerFlags.some((row) => row.some((flag) => flag !== null));
    },

    exchangeSummary(state) {
      const soldGold = state.exchange.lastSoldGold;
      const baseValue = state.exchange.lastBaseValue;
      const returnPercent = state.exchange.lastReturnPercent;

      return {
        soldGold,
        baseValue,
        returnPercent,
        bonus: state.exchange.lastBonus,
        payout: state.exchange.lastPayout,
        reachedLevel: state.exchange.lastReachedLevel,
        bestLevel: state.run.bestLevel,
        nextThreshold: state.exchange.nextThreshold,
        progressRatio: state.exchange.progressRatio,
        processed: state.progression.exchangeProcessedThisTown,
      };
    },

    showPermitOffice(state): boolean {
      return state.run.bestLevel >= 4;
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

    openSettingsModal() {
      this.ui.showSettingsModal = true;
    },

    closeSettingsModal() {
      this.ui.showSettingsModal = false;
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
        progressionMenuOpen: this.ui.progressionMenuOpen,
        showFieldExhaustedModal: this.ui.showFieldExhaustedModal,
        townStep: this.progression.townStep,
      });

      if (this.run.phase === 'playing') {
        return;
      }

      if (this.run.phase === 'town') {
        if (this.progression.townStep === 'none') {
          this.progression.townStep = 'exchange';
        }
        this.ui.progressionMenuOpen = true;
        return;
      }

      if (this.run.phase === 'level-complete') {
        this.ui.showFieldExhaustedModal = true;
        return;
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
      if (this.run.phase !== 'playing' && this.run.phase !== 'town') {
        return;
      }

      this.run.phase = 'town';
      if (this.progression.townStep === 'none') {
        this.progression.townStep = 'exchange';
      }
      this.progression.exchangeProcessedThisTown = false;
      this.ui.progressionMenuOpen = true;
    },

    closeProgressionMenu() {
      if (this.run.phase === 'town') {
        this.run.phase = 'playing';
      }
      this.ui.progressionMenuOpen = false;
    },

    toggleShowPurchasedUpgrades() {
      this.progression.showPurchasedUpgrades = !this.progression.showPurchasedUpgrades;
    },

    selectTownStep(step: Exclude<MiningTownStep, 'none'>) {
      if (step === 'permit-office' && !this.showPermitOffice) {
        return;
      }

      this.progression.townStep = step;
    },

    canExchangeGold(): boolean {
      return canExchangeGoldInProgression(this.$state);
    },

    exchangeGoldForCoins() {
      exchangeGoldForCoinsInProgression(this.$state, {
        setError: this.setError,
      });
    },

    returnToMine() {
      this.run.phase = 'playing';
      this.progression.exchangeProcessedThisTown = false;
      this.ui.progressionMenuOpen = false;
      this.ui.lastActionMessage = 'Back to the claim.';
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
      this.system.flagHistory = [];
      await loadNextLevelInRun(this.$state, {
        setError: this.setError,
        clearError: this.clearError,
      });
    },

    toggleFlag(position: PositionRef) {
      const previousFlags = cloneFlagGrid(this.board.playerFlags);
      toggleFlagInRun(this.$state, position);

      if (!areFlagGridsEqual(previousFlags, this.board.playerFlags)) {
        this.system.flagHistory.push(previousFlags);
      }
    },

    async dig(position: PositionRef) {
      this.system.flagHistory = [];
      await digInRun(this.$state, position, {
        setError: this.setError,
        clearError: this.clearError,
        goToNextField: (options) => this.goToNextField(options),
      });
    },

    undoFlags() {
      const previousFlags = this.system.flagHistory.pop();

      if (!previousFlags) {
        return;
      }

      this.board.playerFlags = cloneFlagGrid(previousFlags);
      this.ui.lastActionMessage = 'Previous flags restored.';
      this.clearError();
    },

    clearPlayerFlags() {
      if (!this.hasPlayerFlags) {
        return;
      }

      this.system.flagHistory.push(cloneFlagGrid(this.board.playerFlags));
      this.board.playerFlags = this.board.playerFlags.map((row) => row.map(() => null));
      this.ui.lastActionMessage = 'Cleared your flags.';
      this.clearError();
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

    canBuyPlotPermit(permitId: MiningPlotPermitId): boolean {
      return canBuyPlotPermitInProgression(this.$state, permitId);
    },

    buyPlotPermit(permitId: MiningPlotPermitId) {
      buyPlotPermitInProgression(this.$state, permitId, {
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

function areFlagGridsEqual(
  left: Array<Array<MiningFlagType | null>>,
  right: Array<Array<MiningFlagType | null>>
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (row, rowIndex) =>
      row.length === right[rowIndex]?.length &&
      row.every((flag, colIndex) => flag === right[rowIndex][colIndex])
  );
}
