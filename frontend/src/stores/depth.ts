import { defineStore } from 'pinia';

import {
  getAccessiblePositions,
  getAccessiblePositionsForColumn,
  isBoardExhausted,
  isPositionSelectable,
} from '@/game/DepthGame/board/access';
import { buildBoard } from '@/game/DepthGame/board/buildBoard';
import {
  getBoardAverageAccessibleValue,
  getRowAverageAccessibleValue,
} from '@/game/DepthGame/board/summaries';
import { buildLevelDefinition } from '@/game/DepthGame/builder/buildLevelDefinition';
import { getDeckArchetype } from '@/game/DepthGame/constants/deckArchetypes';
import { getLevelDefinition } from '@/game/DepthGame/constants/levels';
import { clampBet, canAffordBet, getAllowedMaxBet } from '@/game/DepthGame/rules/payouts';
import { isLevelComplete } from '@/game/DepthGame/rules/progression';
import { resolveTurn } from '@/game/DepthGame/turns/resolveTurn';
import type {
  BuiltLevelDefinition,
  GameRunState,
  LevelInput,
  PositionRef,
  RevealRecord,
  RoundState,
} from '@/game/DepthGame/types';

export type { RiskProfile } from '@/game/DepthGame/types';
export type { BuiltLevelDefinition, LevelInput, PositionRef } from '@/game/DepthGame/types';

interface DeckDefinition {
  id: string;
  name: string;
  cards: number[];
  backingColor: string;
  riskProfile: 'forty' | 'twenty' | 'single';
}

interface RevealedCard {
  value: number;
  bet: number;
  payout: number;
  net: number;
}

interface SupportCard {
  value: number;
  isRevealed: boolean;
  idx: number;
}

type LevelSource = 'catalog' | 'custom';

function toPreviewPhase(): GameRunState['phase'] {
  return 'preview';
}

function createGameRunState(level: BuiltLevelDefinition, bank = level.startingBank): GameRunState {
  return {
    phase: 'idle',
    bank,
    currentLevel: level.id,
    currentRound: 1,
  };
}

function createRoundState(bank: number): RoundState {
  return {
    board: null,
    pendingBet: 1,
    selectedPosition: null,
    roundStartBank: bank,
    history: [],
    lastResolution: null,
  };
}

function getPrimaryDeck(level: BuiltLevelDefinition): DeckDefinition {
  const primaryDeckId = level.deckMatrix[0]?.[0];
  if (!primaryDeckId) {
    throw new Error(`Level ${level.id} does not have a primary deck assignment`);
  }
  return getDeckArchetype(primaryDeckId);
}

function toLegacyRevealedCard(record: RevealRecord): RevealedCard {
  return {
    value: record.cardValue,
    bet: record.bet,
    payout: record.payout,
    net: record.net,
  };
}

function getLegacyTopLayerCards(level: BuiltLevelDefinition, board: RoundState['board']): number[] {
  if (!board) {
    return [];
  }

  const cards: number[] = [];
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.columns; col += 1) {
      const stack = board.stacks[row][col];
      const topLayer = stack.cards[0];
      if (topLayer) {
        cards.push(topLayer.value);
      }
    }
  }

  if (cards.length > 0) {
    return cards;
  }

  return getPrimaryDeck(level).cards;
}

function getActiveColumnIndex(
  level: BuiltLevelDefinition,
  board: RoundState['board']
): number | null {
  if (!board) {
    return null;
  }

  if (level.turnRule !== 'column-choice-reveal') {
    const firstAccessible = getAccessiblePositions(board)[0];
    return firstAccessible?.col ?? null;
  }

  for (let col = 0; col < board.columns; col += 1) {
    if (getAccessiblePositionsForColumn(board, col).length > 0) {
      return col;
    }
  }

  return null;
}

export const useDepthStore = defineStore('depth', {
  state: () => {
    const level = getLevelDefinition(1);

    return {
      level,
      levelSource: 'catalog' as LevelSource,
      game: createGameRunState(level),
      round: createRoundState(level.startingBank),
    };
  },

  getters: {
    phase: (state) => (state.game.phase === 'preview' ? 'deck-preview' : state.game.phase),

    bank: (state) => state.game.bank,

    currentLevel: (state) => state.game.currentLevel,

    currentRound: (state) => state.game.currentRound,

    roundsPerLevel: (state) => state.level.rounds,

    minBet: (state) => state.level.minBet,

    pendingBet: (state) => state.round.pendingBet,

    maxBet: (state) => getAllowedMaxBet(state.game.bank, state.level.maxBet),

    board: (state) => state.round.board,

    accessiblePositions: (state) =>
      state.round.board ? getAccessiblePositions(state.round.board) : [],

    activeColumnIndex: (state) => getActiveColumnIndex(state.level, state.round.board),

    activeColumnPositions(state): PositionRef[] {
      if (!state.round.board) {
        return [];
      }

      const activeColumn = getActiveColumnIndex(state.level, state.round.board);
      if (activeColumn === null) {
        return [];
      }

      return getAccessiblePositionsForColumn(state.round.board, activeColumn);
    },

    boardAverageAccessibleValue: (state) =>
      state.round.board ? getBoardAverageAccessibleValue(state.round.board) : null,

    rowAverageAccessibleValue: (state) => {
      return (row: number) => {
        if (!state.round.board) {
          return null;
        }
        return getRowAverageAccessibleValue(state.round.board, row);
      };
    },

    canReveal(state): boolean {
      if (state.game.phase !== 'playing') return false;
      if (!state.round.board) return false;
      if (state.round.pendingBet < state.level.minBet) return false;
      if (!canAffordBet(state.game.bank, state.round.pendingBet)) return false;

      const fallbackSelection =
        state.level.turnRule === 'column-choice-reveal'
          ? (this.activeColumnPositions[0] ?? null)
          : (getAccessiblePositions(state.round.board)[0] ?? null);

      const selected = state.round.selectedPosition ?? fallbackSelection;
      if (!selected) return false;

      if (
        state.level.turnRule === 'column-choice-reveal' &&
        selected.col !== this.activeColumnIndex
      ) {
        return false;
      }

      return isPositionSelectable(state.round.board, selected);
    },

    roundProfit: (state) => state.game.bank - state.round.roundStartBank,

    deckDefinition: (state): DeckDefinition => getPrimaryDeck(state.level),

    shuffledCards(): number[] {
      return getLegacyTopLayerCards(this.level, this.round.board);
    },

    totalCardsInRound(): number {
      return this.shuffledCards.length;
    },

    currentCardIndex: (state) => state.round.history.length,

    cardsRemaining(): number {
      return this.accessiblePositions.length;
    },

    averageRemainingValue(): number | null {
      return this.boardAverageAccessibleValue;
    },

    revealedCards: (state): RevealedCard[] =>
      state.round.history.filter((item) => item.revealedBy === 'player').map(toLegacyRevealedCard),

    lastPayoutDelta: (state) => state.round.lastResolution?.totalNet ?? null,

    supportPanelCards(state): SupportCard[] {
      const sortedDeck = [...getPrimaryDeck(state.level).cards].sort((a, b) => b - a);
      const revealedCounts = new Map<number, number>();

      for (const record of state.round.history) {
        if (record.revealedBy !== 'player') {
          continue;
        }
        revealedCounts.set(record.cardValue, (revealedCounts.get(record.cardValue) ?? 0) + 1);
      }

      return sortedDeck.map((value, idx) => {
        const count = revealedCounts.get(value) ?? 0;
        const isRevealed = count > 0;

        if (isRevealed) {
          revealedCounts.set(value, count - 1);
        }

        return {
          value,
          isRevealed,
          idx,
        };
      });
    },

    supportMode: (state) => state.level.supportMode,

    deckMatrix: (state) => state.level.deckMatrix,

    levelInspectorSnapshot(state) {
      return {
        id: state.level.id,
        name: state.level.name,
        source: state.levelSource,
        board: {
          rows: state.level.rows,
          columns: state.level.columns,
          depth: state.level.depth,
        },
        economy: {
          startingBank: state.level.startingBank,
          currentBank: state.game.bank,
          minBet: state.level.minBet,
          maxBet: state.level.maxBet,
        },
        rules: {
          turnRule: state.level.turnRule,
          dealerEnabled: state.level.dealerEnabled,
          dealerAfterPlayer: state.level.dealerAfterPlayer,
          supportMode: state.level.supportMode,
        },
        testing: state.level.testing ?? null,
      };
    },
  },

  actions: {
    loadBuiltLevel(
      level: BuiltLevelDefinition,
      options?: { bank?: number; source?: LevelSource; phase?: GameRunState['phase'] }
    ) {
      const bank = options?.bank ?? level.startingBank;
      this.level = level;
      this.levelSource = options?.source ?? 'catalog';
      this.game = createGameRunState(level, bank);
      this.round = createRoundState(bank);
      this.game.phase = options?.phase ?? 'idle';
    },

    loadLevel(levelNumber: number, options?: { bank?: number; phase?: GameRunState['phase'] }) {
      this.loadBuiltLevel(getLevelDefinition(levelNumber), {
        bank: options?.bank,
        source: 'catalog',
        phase: options?.phase,
      });
    },

    loadLevelInput(
      levelInput: LevelInput,
      options?: { bank?: number; phase?: GameRunState['phase'] }
    ) {
      this.loadBuiltLevel(buildLevelDefinition(levelInput), {
        bank: options?.bank,
        source: 'custom',
        phase: options?.phase,
      });
    },

    startGame() {
      this.loadLevel(1);
      this.setupRound();
      this.game.phase = toPreviewPhase();
    },

    previewLevel(levelNumber: number) {
      this.loadLevel(levelNumber, { phase: toPreviewPhase() });
      this.setupRound();
    },

    previewLevelInput(levelInput: LevelInput) {
      this.loadLevelInput(levelInput, { phase: toPreviewPhase() });
      this.setupRound();
    },

    setupRound() {
      this.round = {
        board: buildBoard(this.level),
        pendingBet: this.level.minBet,
        selectedPosition: null,
        roundStartBank: this.game.bank,
        history: [],
        lastResolution: null,
      };
    },

    beginRound() {
      if (this.game.phase !== 'preview') {
        return;
      }
      this.game.phase = 'playing';
    },

    setPendingBet(amount: number) {
      this.round.pendingBet = clampBet(amount, this.level.minBet, this.maxBet);
    },

    selectPosition(position: PositionRef | null) {
      if (!this.round.board || !position) {
        this.round.selectedPosition = null;
        return;
      }

      if (
        this.level.turnRule === 'column-choice-reveal' &&
        this.activeColumnIndex !== null &&
        position.col !== this.activeColumnIndex
      ) {
        this.round.selectedPosition = null;
        return;
      }

      if (!isPositionSelectable(this.round.board, position)) {
        this.round.selectedPosition = null;
        return;
      }

      this.round.selectedPosition = position;
    },

    revealSelected() {
      if (!this.round.board) {
        return;
      }

      const position =
        this.round.selectedPosition ??
        (this.level.turnRule === 'column-choice-reveal'
          ? (this.activeColumnPositions[0] ?? null)
          : (getAccessiblePositions(this.round.board)[0] ?? null));
      if (!position || !this.canReveal) {
        return;
      }

      const resolution = resolveTurn(
        this.level,
        this.round.board,
        position,
        this.game.bank,
        this.round.pendingBet
      );

      this.round.board = resolution.board;
      this.round.history.push(...resolution.playerReveals, ...resolution.dealerReveals);
      this.round.lastResolution = resolution;
      this.game.bank = resolution.nextBank;

      if (this.level.testing?.debugLogging) {
        console.debug('[Depth]', {
          levelId: this.level.id,
          turnRule: this.level.turnRule,
          position,
          resolution,
        });
      }

      if (this.game.bank <= 0) {
        this.game.bank = 0;
        this.game.phase = 'game-over';
        return;
      }

      if (isBoardExhausted(this.round.board)) {
        this.game.phase = isLevelComplete(this.game.currentRound, this.level.rounds)
          ? 'level-complete'
          : 'round-complete';
        return;
      }

      if (this.round.pendingBet > this.maxBet) {
        this.round.pendingBet = Math.max(this.level.minBet, this.maxBet);
      }

      if (
        this.round.selectedPosition &&
        !isPositionSelectable(this.round.board, this.round.selectedPosition)
      ) {
        this.round.selectedPosition = null;
      }
    },

    revealNext() {
      this.revealSelected();
    },

    nextRound() {
      if (this.game.phase !== 'round-complete') {
        return;
      }

      this.game.currentRound += 1;
      this.setupRound();
      this.game.phase = toPreviewPhase();
    },

    nextLevel() {
      if (this.game.phase !== 'level-complete') {
        return;
      }

      const nextLevelNumber = this.game.currentLevel + 1;

      try {
        this.loadLevel(nextLevelNumber, {
          bank: this.game.bank,
          phase: toPreviewPhase(),
        });
        this.setupRound();
      } catch {
        this.game.phase = 'game-complete';
      }
    },

    restartLevel() {
      const currentLevel = this.level;
      const currentSource = this.levelSource;
      const bank = currentLevel.startingBank;

      this.loadBuiltLevel(currentLevel, {
        bank,
        source: currentSource,
        phase: toPreviewPhase(),
      });
      this.setupRound();
    },

    restartGame() {
      this.loadLevel(1, { phase: 'idle' });
    },
  },
});
