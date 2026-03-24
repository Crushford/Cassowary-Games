import { defineStore } from 'pinia';

import { STARTING_CLAIM } from '../constants/claims';
import { getGroundDeck } from '../constants/groundDecks';
import { buildClaim } from '../game/board/buildClaim';
import { getTopTile, isBoardCleared } from '../game/board/access';
import {
  QUARTZ_TOOL_UPGRADE,
  ROCK_TOOL_UPGRADE,
  getPowerUpgrade,
  getToolTierLabel,
} from '../game/rules/upgrades';
import { digSquare } from '../game/turns/digSquare';
import { processQueue } from '../game/turns/processQueue';
import type {
  ClaimBoardState,
  FloatingResult,
  GroundStackState,
  MiningPhase,
  PositionRef,
  ProcessingLoad,
  ToolTier,
} from '../game/types';

function createBoard(): ClaimBoardState {
  return buildClaim(STARTING_CLAIM);
}

function createInitialState() {
  return {
    phase: 'idle' as MiningPhase,
    board: createBoard(),
    daysElapsed: 0,
    goldTotal: 0,
    tailingsTotal: 0,
    claimsLeased: 1,
    shovelPower: 1,
    toolTier: 'dirt' as ToolTier,
    processingLoad: null as ProcessingLoad | null,
    errorMessage: null as string | null,
    errorTick: 0,
    lastActionMessage: 'Start working the claim.' as string,
    floatingResult: null as FloatingResult | null,
    floatingResultTick: 0,
    shopOpen: false,
  };
}

export const useMiningStore = defineStore('mining', {
  state: () => createInitialState(),

  getters: {
    claim: () => STARTING_CLAIM,

    gridRows: (state): GroundStackState[][] => state.board.stacks,

    processingButtonLabel: (state): string => {
      if (!state.processingLoad) {
        return 'No load to process';
      }

      return `Process ${state.processingLoad.label}`;
    },

    nextClaimCost: (state): number => {
      if (state.claimsLeased <= 1) {
        return 5;
      }

      const paidClaims = state.claimsLeased - 1;
      return 5 + (paidClaims * (paidClaims + 3)) / 2;
    },

    canLeaseNextClaim(): boolean {
      return this.goldTotal >= this.nextClaimCost;
    },

    toolLabel: (state): string => getToolTierLabel(state.toolTier),

    powerUpgrade: (state) => getPowerUpgrade(state.shovelPower),

    canBuyRockTool(state): boolean {
      return state.toolTier === 'dirt' && state.goldTotal >= ROCK_TOOL_UPGRADE.cost;
    },

    canBuyQuartzTool(state): boolean {
      return state.toolTier !== 'quartz' && state.goldTotal >= QUARTZ_TOOL_UPGRADE.cost;
    },

    canBuyPowerUpgrade(state): boolean {
      return state.goldTotal >= this.powerUpgrade.cost;
    },
  },

  actions: {
    initialize() {
      if (this.phase === 'idle') {
        this.startFirstClaim();
      }
    },

    startFirstClaim() {
      this.$patch({
        ...createInitialState(),
        phase: 'playing',
      });
    },

    leaseNewClaim() {
      if (this.phase === 'idle') {
        this.startFirstClaim();
        return;
      }

      if (!this.canLeaseNextClaim) {
        this.setError(`You need ${this.nextClaimCost} gold to lease a new claim.`);
        return;
      }

      this.goldTotal -= this.nextClaimCost;
      this.board = createBoard();
      this.phase = 'playing';
      this.daysElapsed = 0;
      this.tailingsTotal = 0;
      this.processingLoad = null;
      this.claimsLeased += 1;
      this.clearError();
      this.lastActionMessage = `Leased a new claim for ${this.nextClaimCost} gold.`;
    },

    clearError() {
      this.errorMessage = null;
    },

    clearFloatingResult() {
      this.floatingResult = null;
    },

    setError(message: string) {
      this.errorMessage = message;
      this.errorTick += 1;
    },

    setFloatingResult(result: FloatingResult) {
      this.floatingResult = result;
      this.floatingResultTick += 1;
    },

    dig(position: PositionRef) {
      if (this.phase !== 'playing') {
        return;
      }

      const originalStack = this.board.stacks[position.row]?.[position.col] ?? null;
      const originalTile = originalStack ? getTopTile(originalStack) : null;
      const originalLabel = originalTile ? getGroundDeck(originalTile.groundType).label : 'ground';
      const result = digSquare(
        this.board,
        position,
        this.shovelPower,
        this.toolTier,
        this.processingLoad
      );

      if (!result.ok) {
        this.setError(result.message ?? 'That ground cannot be worked right now.');
        this.lastActionMessage = result.message ?? 'That ground cannot be worked right now.';
        this.setFloatingResult({
          row: position.row,
          col: position.col,
          message: 'Blocked',
          tone: 'warning',
        });
        return;
      }

      const previousProcessingLoad = this.processingLoad;
      this.board = result.board ?? this.board;
      this.processingLoad = result.processingLoad ?? null;
      this.goldTotal += result.goldAwarded ?? 0;
      this.tailingsTotal += result.tailingsAdded ?? 0;
      this.daysElapsed += result.daysSpent ?? 0;
      this.clearError();
      this.updatePhase();

      if (result.goldAwarded && result.goldAwarded > 0) {
        this.lastActionMessage = `Day ${this.daysElapsed}: Worked ${originalLabel.toLowerCase()} and found ${result.goldAwarded} gold.`;
        this.setFloatingResult({
          row: position.row,
          col: position.col,
          message: `+${result.goldAwarded} gold`,
          tone: 'success',
        });
        return;
      }

      if (!previousProcessingLoad && this.processingLoad) {
        this.lastActionMessage = `Day ${this.daysElapsed}: Broke ${this.processingLoad.label.toLowerCase()} and sent it to processing.`;
        this.setFloatingResult({
          row: position.row,
          col: position.col,
          message: 'To cradle',
          tone: 'neutral',
        });
        return;
      }

      this.lastActionMessage = `Day ${this.daysElapsed}: Cut into ${originalLabel.toLowerCase()}.`;
      this.setFloatingResult({
        row: position.row,
        col: position.col,
        message: '0',
        tone: 'neutral',
      });
    },

    processCurrentLoad() {
      if (this.phase !== 'playing') {
        return;
      }

      const result = processQueue(this.processingLoad);

      if (!result.ok) {
        this.setError(result.message ?? 'There is nothing to process.');
        this.lastActionMessage = result.message ?? 'There is nothing to process.';
        return;
      }

      this.processingLoad = result.processingLoad ?? null;
      this.goldTotal += result.goldAwarded ?? 0;
      this.tailingsTotal += result.tailingsAdded ?? 0;
      this.daysElapsed += result.daysSpent ?? 0;
      this.clearError();
      this.updatePhase();

      if (result.goldAwarded && result.goldAwarded > 0) {
        this.lastActionMessage = `Day ${this.daysElapsed}: Finished processing and recovered ${result.goldAwarded} gold.`;
        return;
      }

      if (this.processingLoad) {
        this.lastActionMessage = `Day ${this.daysElapsed}: Processing ${this.processingLoad.label.toLowerCase()} continues.`;
      }
    },

    openShop() {
      this.shopOpen = true;
    },

    closeShop() {
      this.shopOpen = false;
    },

    buyRockTool() {
      if (this.toolTier !== 'dirt') {
        this.setError('You already have a tool that can work rock.');
        return;
      }

      if (this.goldTotal < ROCK_TOOL_UPGRADE.cost) {
        this.setError('Not enough gold for that upgrade.');
        return;
      }

      this.goldTotal -= ROCK_TOOL_UPGRADE.cost;
      this.toolTier = 'rock';
      this.clearError();
    },

    buyQuartzTool() {
      if (this.toolTier === 'quartz') {
        this.setError('You already have a quartz-grade tool.');
        return;
      }

      if (this.goldTotal < QUARTZ_TOOL_UPGRADE.cost) {
        this.setError('Not enough gold for that upgrade.');
        return;
      }

      this.goldTotal -= QUARTZ_TOOL_UPGRADE.cost;
      this.toolTier = 'quartz';
      this.clearError();
    },

    buyPowerUpgrade() {
      const upgrade = getPowerUpgrade(this.shovelPower);

      if (this.goldTotal < upgrade.cost) {
        this.setError('Not enough gold for that upgrade.');
        return;
      }

      this.goldTotal -= upgrade.cost;
      this.shovelPower += 1;
      this.clearError();
    },

    updatePhase() {
      if (isBoardCleared(this.board) && !this.processingLoad) {
        this.phase = 'claim-complete';
      }
    },

    topTileForStack(stack: GroundStackState) {
      return getTopTile(stack);
    },

    groundLabelForStack(stack: GroundStackState): string {
      const tile = getTopTile(stack);
      if (!tile) {
        return 'Worked';
      }

      return getGroundDeck(tile.groundType).label;
    },
  },
});
