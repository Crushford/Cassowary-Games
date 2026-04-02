import { defineStore } from 'pinia';

import { MINING_CAMPAIGN_LEVELS } from '../game/levels';
import type { MiningCampaignLevel, MiningFlagType, PositionRef } from '../game/types';
import {
  clearMiningSave,
  isSaveCompatible,
  readMiningLeaderboard,
  readMiningSave,
  restoreMiningState,
  writeMiningLeaderboardEntry,
  writeMiningSave,
} from './miningPersistence';
import {
  dig as digInRun,
  loadCurrentLevel,
  recomputeSystemFlags,
  toggleFlag as toggleFlagInRun,
} from './miningRunService';
import { cloneFlagGrid, createInitialMiningState } from './miningState';

function areFlagGridsEqual(
  left: Array<Array<MiningFlagType | null>>,
  right: Array<Array<MiningFlagType | null>>
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((row, rowIndex) =>
    row.every((cell, colIndex) => cell === right[rowIndex]?.[colIndex])
  );
}

export const useMiningStore = defineStore('mining', {
  state: () => createInitialMiningState(),

  getters: {
    phase: (state) => state.run.phase,
    currentPuzzleId: (state) => state.board.currentPuzzleId,
    boardSize: (state) => state.board.boardSize,
    truthGold: (state) => state.board.truthGold,
    regionIds: (state) => state.board.regionIds,
    revealed: (state) => state.board.revealed,
    playerFlags: (state) => state.board.playerFlags,
    systemFlags: (state) => state.board.systemFlags,
    digsUsed: (state) => state.run.digsUsed,
    daysElapsed: (state) => state.run.daysElapsed,
    foundGoldCount: (state) => state.run.foundGoldCount,
    currentLevelIndex: (state) => state.run.currentLevelIndex,
    highestUnlockedLevelIndex: (state) => state.run.highestUnlockedLevelIndex,
    unlockedRavenSkillIds: (state) => state.progression.unlockedRavenSkillIds,
    unlockedToolUpgradeIds: (state) => state.progression.unlockedToolUpgradeIds,
    earnedRewardIds: (state) => state.progression.earnedRewardIds,
    leaderboardEntries: (state) => state.leaderboard.entries,
    showSettingsModal: (state) => state.ui.showSettingsModal,
    showLevelIntroModal: (state) => state.ui.showLevelIntroModal,
    showLevelResultModal: (state) => state.ui.showLevelResultModal,
    levelResult: (state) => state.ui.levelResult,
    errorMessage: (state) => state.ui.errorMessage,
    errorTick: (state) => state.ui.errorTick,
    lastActionMessage: (state) => state.ui.lastActionMessage,
    leaderboardName: (state) => state.ui.leaderboardName,
    scoreSubmitted: (state) => state.ui.scoreSubmitted,

    currentLevelDefinition(state): MiningCampaignLevel {
      return MINING_CAMPAIGN_LEVELS[state.run.currentLevelIndex] ?? MINING_CAMPAIGN_LEVELS[0];
    },

    currentLevelNumber(): number {
      return this.currentLevelDefinition.number;
    },

    currentLevelGoalText(): string {
      const maxDigs = this.currentLevelDefinition.winConditions.maxDigsExclusive;
      if (typeof maxDigs === 'number') {
        if (maxDigs === this.currentLevelDefinition.goldTarget + 1) {
          return `Find all ${this.currentLevelDefinition.goldTarget} gold in ${this.currentLevelDefinition.goldTarget} digs.`;
        }

        return `Find all ${this.currentLevelDefinition.goldTarget} gold in fewer than ${maxDigs} digs.`;
      }

      return `Find all ${this.currentLevelDefinition.goldTarget} gold.`;
    },

    visibleFlags(state): Array<Array<MiningFlagType | null>> {
      return state.board.playerFlags.map((row, rowIndex) =>
        row.map((flagged, colIndex) => flagged ?? state.board.systemFlags[rowIndex][colIndex])
      );
    },

    totalGoldOnBoard(state): number {
      return state.board.truthGold.reduce(
        (count, row) => count + row.filter((hasGold) => hasGold).length,
        0
      );
    },

    canShowScannerRegions(): boolean {
      return (
        this.currentLevelDefinition.scannerEnabled ||
        this.unlockedToolUpgradeIds.includes('scanner')
      );
    },

    canUndoFlags(state): boolean {
      return state.system.flagHistory.length > 0;
    },

    hasPlayerFlags(state): boolean {
      return state.board.playerFlags.some((row) => row.some((flag) => flag !== null));
    },

    currentRewardEarned(): boolean {
      const rewardId = this.currentLevelDefinition.reward?.id;
      return rewardId ? this.earnedRewardIds.includes(rewardId) : false;
    },

    levelResultPassed(): boolean {
      return this.levelResult?.passed === true;
    },

    levelResultFailed(): boolean {
      return this.levelResult?.passed === false;
    },

    canStartNextLevel(): boolean {
      return (
        this.levelResultPassed &&
        this.currentLevelIndex < MINING_CAMPAIGN_LEVELS.length - 1 &&
        this.highestUnlockedLevelIndex > this.currentLevelIndex
      );
    },

    isLastLevel(): boolean {
      return this.currentLevelIndex >= MINING_CAMPAIGN_LEVELS.length - 1;
    },

    isGameComplete(): boolean {
      return this.phase === 'game-complete' && this.levelResultPassed;
    },
  },

  actions: {
    async initialize() {
      if (!this.system.persistenceInitialized) {
        this.initializePersistence();
      }

      this.leaderboard.entries = readMiningLeaderboard();

      const restoreResult = this.restoreFromStorage();
      if (restoreResult === 'restored' && this.run.phase !== 'idle') {
        this.ensureVisibleBlockingUi();
        return;
      }

      if (this.run.phase !== 'idle') {
        return;
      }

      await this.loadCurrentLevel();

      if (restoreResult === 'beta-reset') {
        this.ui.lastActionMessage =
          'This game is in beta and your previous save was from an older version. Your progress has been reset.';
      }
    },

    setError(message: string) {
      this.ui.errorMessage = message;
      this.ui.errorTick += 1;
    },

    clearError() {
      this.ui.errorMessage = null;
    },

    dismissLevelIntro() {
      this.ui.showLevelIntroModal = false;
      this.ui.hasSeenIntroThisRun = true;
    },

    revealLevelClue() {
      if (!this.ui.levelResult) {
        return;
      }

      this.ui.levelResult.clueRevealed = true;
    },

    closeLevelResultModal() {
      if (this.isGameComplete) {
        return;
      }

      this.ui.showLevelResultModal = false;
    },

    openSettingsModal() {
      this.ui.showSettingsModal = true;
    },

    closeSettingsModal() {
      this.ui.showSettingsModal = false;
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
      if (this.run.phase === 'level-complete' || this.run.phase === 'game-complete') {
        this.ui.showLevelResultModal = true;
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

    async loadCurrentLevel() {
      this.system.flagHistory = [];
      await loadCurrentLevel(this.$state, {
        setError: this.setError,
        clearError: this.clearError,
      });
    },

    async retryLevel() {
      this.ui.showLevelResultModal = false;
      this.ui.levelResult = null;
      await this.loadCurrentLevel();
    },

    async startNextLevel() {
      if (!this.canStartNextLevel || this.isGameComplete) {
        return;
      }

      this.run.currentLevelIndex += 1;
      this.ui.showLevelResultModal = false;
      this.ui.levelResult = null;
      await this.loadCurrentLevel();
    },

    recomputeSystemFlags() {
      recomputeSystemFlags(this.$state);
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

    setLeaderboardName(value: string) {
      this.ui.leaderboardName = value;
    },

    submitLeaderboardScore() {
      if (!this.isGameComplete || this.scoreSubmitted) {
        return;
      }

      const name = this.ui.leaderboardName.trim() || 'Anonymous';
      this.leaderboard.entries = writeMiningLeaderboardEntry({
        name,
        daysElapsed: this.daysElapsed,
        completedAt: new Date().toISOString(),
      });
      this.ui.leaderboardName = name;
      this.ui.scoreSubmitted = true;
      this.ui.lastActionMessage = `Score saved for ${name}.`;
    },

    resetRun() {
      this.clearPersistedState();
      const leaderboardEntries = [...this.leaderboard.entries];
      const baseState = createInitialMiningState();
      this.$patch({
        ...baseState,
        leaderboard: {
          entries: leaderboardEntries,
        },
        system: {
          ...baseState.system,
          persistenceInitialized: true,
          persistenceHydrating: false,
        },
      });
      void this.initialize();
    },

    deleteSavedGame() {
      this.clearPersistedState();
      const leaderboardEntries = [...this.leaderboard.entries];
      const baseState = createInitialMiningState();
      this.$patch({
        ...baseState,
        leaderboard: {
          entries: leaderboardEntries,
        },
        system: {
          ...baseState.system,
          persistenceInitialized: true,
          persistenceHydrating: false,
        },
      });
      this.ui.showSettingsModal = false;
      void this.initialize();
    },
  },
});
