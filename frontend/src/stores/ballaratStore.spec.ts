import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import type { LevelInput } from '@/game/ballarat/types';
import { useBallaratStore } from './ballaratStore';

describe('useBallaratStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('builds a custom level input into a live round board', () => {
    const store = useBallaratStore();
    const levelInput: LevelInput = {
      metadata: {
        id: 900,
        name: 'Builder Level',
      },
      economy: {
        startingBank: 12,
        rounds: 1,
        minBet: 1,
        maxBet: 4,
      },
      board: {
        rows: 2,
        columns: 5,
        depth: 2,
      },
      decks: {
        mode: 'row-depth-matrix',
        matrix: [
          ['blue-starter', 'red-spike'],
          ['red-spike', 'blue-starter'],
        ],
      },
      rules: {
        turnRule: 'basic-reveal',
      },
      support: {
        supportMode: 'debug',
        showExactRemainingValues: true,
        showRowAverages: true,
        showBoardAverage: true,
      },
      testing: {
        forcedDeckOrder: [3, 2, 0, 0, 0],
      },
    };

    store.loadLevelInput(levelInput, { phase: 'preview' });
    store.setupRound();

    expect(store.levelSource).toBe('custom');
    expect(store.board?.rows).toBe(2);
    expect(store.board?.columns).toBe(5);
    expect(store.board?.depth).toBe(2);
    expect(store.deckMatrix).toEqual([
      ['blue-starter', 'red-spike'],
      ['red-spike', 'blue-starter'],
    ]);
  });

  it('resolves a player reveal and completes the round when the board is exhausted', () => {
    const store = useBallaratStore();
    const levelInput: LevelInput = {
      metadata: {
        id: 901,
        name: 'Single Stack',
      },
      economy: {
        startingBank: 10,
        rounds: 1,
        minBet: 1,
        maxBet: 5,
      },
      board: {
        rows: 1,
        columns: 1,
        depth: 1,
      },
      decks: {
        mode: 'uniform',
        deckId: 'blue-starter',
      },
      rules: {
        turnRule: 'basic-reveal',
      },
      support: {
        supportMode: 'exact',
      },
      testing: {
        forcedDeckOrder: [3, 2, 0, 0, 0],
      },
    };

    store.loadLevelInput(levelInput, { phase: 'preview' });
    store.setupRound();
    store.beginRound();
    store.setPendingBet(2);
    store.selectPosition({ row: 0, col: 0 });
    store.revealSelected();

    expect(store.bank).toBe(14);
    expect(store.round.history).toHaveLength(1);
    expect(store.round.history[0]).toMatchObject({
      row: 0,
      col: 0,
      cardValue: 3,
      bet: 2,
      payout: 6,
      net: 4,
      revealedBy: 'player',
    });
    expect(store.phase).toBe('level-complete');
  });

  it('applies dealer-follow-up reveals without changing player payout totals', () => {
    const store = useBallaratStore();
    const levelInput: LevelInput = {
      metadata: {
        id: 902,
        name: 'Dealer Follow Up',
      },
      economy: {
        startingBank: 10,
        rounds: 1,
        minBet: 1,
        maxBet: 5,
      },
      board: {
        rows: 1,
        columns: 2,
        depth: 1,
      },
      decks: {
        mode: 'uniform',
        deckId: 'blue-starter',
      },
      rules: {
        turnRule: 'dealer-follow-up',
      },
      support: {
        supportMode: 'exact',
      },
      testing: {
        forcedDeckOrder: [3, 2, 0, 0, 0],
      },
    };

    store.loadLevelInput(levelInput, { phase: 'preview' });
    store.setupRound();
    store.beginRound();
    store.selectPosition({ row: 0, col: 0 });
    store.revealSelected();

    expect(store.round.lastResolution?.playerReveals).toHaveLength(1);
    expect(store.round.lastResolution?.dealerReveals).toHaveLength(1);
    expect(store.round.lastResolution?.totalNet).toBe(2);
    expect(store.bank).toBe(12);
    expect(store.round.history.map((item) => item.revealedBy)).toEqual(['player', 'dealer']);
  });
});
