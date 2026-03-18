import { defineStore } from 'pinia';
import { generateDeckWithStyle, type RiskProfile } from '../utils/ballaratDeckGenerator';

// ── Types ─────────────────────────────────────────────────────────────────────

export type { RiskProfile };

export interface DeckDefinition {
  id: string;
  name: string;
  cards: number[];
  backingColor: string;
  riskProfile: RiskProfile;
}

export type GamePhase =
  | 'idle'
  | 'deck-preview'
  | 'playing'
  | 'round-complete'
  | 'level-complete'
  | 'game-over';

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

// ── Deck & level definitions ───────────────────────────────────────────────────
// Future versions can expand these arrays to add archetypes and levels.

function makeDeckDefinition(
  id: string,
  name: string,
  deckSize: number,
  average: number,
  riskProfile: RiskProfile
): DeckDefinition {
  const generated = generateDeckWithStyle({ deckSize, average, riskProfile });
  return { id, name, ...generated };
}

const LEVEL_1_DECK = makeDeckDefinition('level-1-deck', 'Blue Deck', 5, 1, 'forty');

const LEVEL_CONFIG: Array<{ rounds: number; deck: DeckDefinition }> = [
  { rounds: 3, deck: LEVEL_1_DECK },
];

const STARTING_BANK = 20;

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useBallaratStore = defineStore('ballarat', {
  state: () => ({
    phase: 'idle' as GamePhase,
    bank: STARTING_BANK,
    currentLevel: 1,
    currentRound: 1,
    roundsPerLevel: LEVEL_CONFIG[0].rounds,
    pendingBet: 1,
    shuffledCards: [] as number[],
    currentCardIndex: 0,
    revealedBets: [] as number[],
    lastPayoutDelta: null as number | null,
    roundStartBank: STARTING_BANK,
    deckDefinition: LEVEL_CONFIG[0].deck as DeckDefinition,
  }),

  getters: {
    revealedCards: (state): RevealedCard[] =>
      state.shuffledCards.slice(0, state.currentCardIndex).map((value, index) => {
        const bet = state.revealedBets[index] ?? 0;
        return { value, bet, payout: value * bet, net: (value - 1) * bet };
      }),

    averageRemainingValue: (state): number | null => {
      const remaining = state.shuffledCards.slice(state.currentCardIndex);
      if (remaining.length === 0) return null;
      return remaining.reduce((a, b) => a + b, 0) / remaining.length;
    },

    cardsRemaining: (state): number => state.shuffledCards.length - state.currentCardIndex,

    totalCardsInRound: (state): number => state.shuffledCards.length,

    maxBet: (state): number => Math.min(5, Math.max(0, state.bank)),

    canReveal: (state): boolean =>
      state.phase === 'playing' &&
      state.currentCardIndex < state.shuffledCards.length &&
      state.bank >= state.pendingBet &&
      state.pendingBet >= 1,

    isLastRound: (state): boolean => state.currentRound >= state.roundsPerLevel,

    roundProfit: (state): number => state.bank - state.roundStartBank,

    // For the support panel: sorted known deck values, each marked revealed or not.
    // Uses a greedy match (highest values marked revealed first).
    supportPanelCards: (state): SupportCard[] => {
      const sortedDeck = [...state.deckDefinition.cards].sort((a, b) => b - a);
      const revealedCounts = new Map<number, number>();
      for (let i = 0; i < state.currentCardIndex; i++) {
        const v = state.shuffledCards[i];
        revealedCounts.set(v, (revealedCounts.get(v) ?? 0) + 1);
      }
      return sortedDeck.map((value, idx) => {
        const count = revealedCounts.get(value) ?? 0;
        const isRevealed = count > 0;
        if (isRevealed) revealedCounts.set(value, count - 1);
        return { value, isRevealed, idx };
      });
    },
  },

  actions: {
    startGame() {
      this.bank = STARTING_BANK;
      this.currentLevel = 1;
      this.currentRound = 1;
      const config = LEVEL_CONFIG[this.currentLevel - 1];
      this.roundsPerLevel = config.rounds;
      this.deckDefinition = config.deck;
      this.phase = 'deck-preview';
      this._initRound();
    },

    _initRound() {
      this.shuffledCards = shuffle(this.deckDefinition.cards);
      this.currentCardIndex = 0;
      this.revealedBets = [];
      this.lastPayoutDelta = null;
      this.roundStartBank = this.bank;
      this.pendingBet = 1;
    },

    beginRound() {
      this.phase = 'playing';
    },

    setPendingBet(amount: number) {
      this.pendingBet = Math.max(1, Math.min(this.maxBet, Math.floor(amount)));
    },

    revealNext() {
      if (!this.canReveal) return;

      const bet = this.pendingBet;
      const cardValue = this.shuffledCards[this.currentCardIndex];
      const payout = cardValue * bet;

      this.bank = this.bank - bet + payout;
      this.revealedBets.push(bet);
      this.currentCardIndex++;
      this.lastPayoutDelta = payout - bet;

      if (this.bank <= 0) {
        this.bank = 0;
        this.phase = 'game-over';
        return;
      }

      if (this.currentCardIndex >= this.shuffledCards.length) {
        this.phase = this.isLastRound ? 'level-complete' : 'round-complete';
        return;
      }

      if (this.pendingBet > this.maxBet) {
        this.pendingBet = Math.max(1, this.maxBet);
      }
    },

    nextRound() {
      this.currentRound++;
      this.phase = 'deck-preview';
      this._initRound();
    },

    restartGame() {
      this.phase = 'idle';
    },
  },
});
