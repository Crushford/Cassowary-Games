import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LevelInput } from '@/games/depth/game/types';
import { useDepthStore } from './depth';

function singleStackLevel(overrides: Partial<LevelInput> = {}): LevelInput {
  return {
    metadata: { id: 950, name: 'Single Stack' },
    economy: { startingBank: 10, rounds: 1, minBet: 1, maxBet: 5 },
    board: { rows: 1, columns: 1, depth: 1 },
    decks: { mode: 'uniform', deckId: 'blue' },
    rules: { turnRule: 'basic-reveal' },
    support: { supportMode: 'exact' },
    testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
    ...overrides,
  };
}

describe('useDepthStore', () => {
  beforeEach(() => {
    const storage = (() => {
      const values = new Map<string, string>();
      return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
      };
    })();

    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {
      localStorage: storage,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
    });
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('builds a custom level input into a live round board', () => {
    const store = useDepthStore();
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
          ['blue', 'red'],
          ['red', 'blue'],
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
      ['blue', 'red'],
      ['red', 'blue'],
    ]);
  });

  it('persists and restores a saved depth session', () => {
    const store = useDepthStore();
    store.initializePersistence();
    store.startGame();
    store.beginRound();
    store.setPendingBet(3);
    store.selectPosition({ row: 0, col: 0 });
    store.persistSession();

    const saved = JSON.parse(localStorage.getItem('depth-save-v1') ?? 'null');

    expect(saved).toMatchObject({
      version: 1,
      game: {
        phase: 'playing',
        bank: 20,
        currentLevel: 1,
        currentRound: 1,
      },
      round: {
        pendingBet: 3,
        selectedPosition: { row: 0, col: 0 },
      },
    });

    setActivePinia(createPinia());
    const restoredStore = useDepthStore();
    restoredStore.initializePersistence();

    expect(restoredStore.savedSessionSummary).toMatchObject({
      levelId: 1,
      bank: 20,
      currentRound: 1,
      phase: 'playing',
      levelSource: 'catalog',
    });
    expect(restoredStore.continueSavedSession()).toBe(true);
    expect(restoredStore.phase).toBe('playing');
    expect(restoredStore.pendingBet).toBe(3);
    expect(restoredStore.round.selectedPosition).toEqual({ row: 0, col: 0 });
  });

  it('resolves a player reveal and completes the round when the board is exhausted', () => {
    const store = useDepthStore();
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
        deckId: 'blue',
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

  it('starts level 1 in preview state with the correct bank and board dimensions', () => {
    const store = useDepthStore();
    store.startGame();

    expect(store.phase).toBe('deck-preview');
    expect(store.currentLevel).toBe(1);
    expect(store.currentRound).toBe(1);
    expect(store.bank).toBe(20);
    expect(store.board?.rows).toBe(1);
    expect(store.board?.columns).toBe(5);
    expect(store.accessiblePositions).toHaveLength(5);
  });

  it('enters playing state after beginRound', () => {
    const store = useDepthStore();
    store.startGame();
    store.beginRound();

    expect(store.phase).toBe('playing');
  });

  it('reduces bank by bet amount when revealing a zero card', () => {
    const store = useDepthStore();
    store.loadLevelInput(
      singleStackLevel({
        board: { rows: 1, columns: 3, depth: 1 },
        testing: { forcedDeckOrder: [0, 3, 2, 0, 0] },
      }),
      { phase: 'preview' }
    );
    store.setupRound();
    store.beginRound();
    store.setPendingBet(2);
    store.selectPosition({ row: 0, col: 0 });
    store.revealSelected();

    expect(store.bank).toBe(8);
    expect(store.round.history).toHaveLength(1);
    expect(store.round.history[0].net).toBe(-2);
    expect(store.phase).toBe('playing');
  });

  it('increases bank correctly when revealing a value card', () => {
    const store = useDepthStore();
    store.loadLevelInput(
      singleStackLevel({
        board: { rows: 1, columns: 3, depth: 1 },
        testing: { forcedDeckOrder: [3, 0, 0, 0, 0] },
      }),
      { phase: 'preview' }
    );
    store.setupRound();
    store.beginRound();
    store.setPendingBet(2);
    store.selectPosition({ row: 0, col: 0 });
    store.revealSelected();

    expect(store.bank).toBe(14);
    expect(store.round.history[0].payout).toBe(6);
    expect(store.round.history[0].net).toBe(4);
  });

  it('enters game-over when bank reaches zero after revealing a zero card', () => {
    const store = useDepthStore();
    store.loadLevelInput(
      singleStackLevel({
        economy: { startingBank: 2, rounds: 1, minBet: 1, maxBet: 5 },
        board: { rows: 1, columns: 2, depth: 1 },
        testing: { forcedDeckOrder: [0, 3, 0, 0, 0] },
      }),
      { phase: 'preview' }
    );
    store.setupRound();
    store.beginRound();
    store.setPendingBet(2);
    store.selectPosition({ row: 0, col: 0 });
    store.revealSelected();

    expect(store.bank).toBe(0);
    expect(store.phase).toBe('game-over');
  });

  it('enters round-complete (not level-complete) when board is exhausted on round 1 of 3', () => {
    const store = useDepthStore();
    store.loadLevelInput(
      singleStackLevel({ economy: { startingBank: 10, rounds: 3, minBet: 1, maxBet: 5 } }),
      { phase: 'preview' }
    );
    store.setupRound();
    store.beginRound();
    store.setPendingBet(1);
    store.selectPosition({ row: 0, col: 0 });
    store.revealSelected();

    expect(store.phase).toBe('round-complete');
    expect(store.currentRound).toBe(1);
  });

  it('increments round, resets history, and preserves bank after nextRound', () => {
    const store = useDepthStore();
    store.loadLevelInput(
      singleStackLevel({ economy: { startingBank: 10, rounds: 3, minBet: 1, maxBet: 5 } }),
      { phase: 'preview' }
    );
    store.setupRound();
    store.beginRound();
    store.setPendingBet(2);
    store.selectPosition({ row: 0, col: 0 });
    store.revealSelected();

    const bankAfterRound1 = store.bank;
    store.nextRound();

    expect(store.currentRound).toBe(2);
    expect(store.phase).toBe('deck-preview');
    expect(store.bank).toBe(bankAfterRound1);
    expect(store.round.history).toHaveLength(0);
  });

  it('enters level-complete after exhausting the board on the final round', () => {
    const store = useDepthStore();
    store.loadLevelInput(
      singleStackLevel({ economy: { startingBank: 10, rounds: 3, minBet: 1, maxBet: 5 } }),
      { phase: 'preview' }
    );

    for (let round = 1; round <= 3; round++) {
      store.setupRound();
      store.beginRound();
      store.setPendingBet(1);
      store.selectPosition({ row: 0, col: 0 });
      store.revealSelected();

      if (round < 3) {
        store.nextRound();
      }
    }

    expect(store.phase).toBe('level-complete');
    expect(store.currentRound).toBe(3);
  });

  it('resets to idle state with fresh bank after restartGame', () => {
    const store = useDepthStore();
    store.startGame();
    store.beginRound();
    store.restartGame();

    expect(store.phase).toBe('idle');
    expect(store.currentLevel).toBe(1);
    expect(store.bank).toBe(20);
  });

  it('clamps pendingBet to the bank when the bet would exceed available funds', () => {
    const store = useDepthStore();
    store.loadLevelInput(
      singleStackLevel({
        economy: { startingBank: 3, rounds: 1, minBet: 1, maxBet: 5 },
        board: { rows: 1, columns: 2, depth: 1 },
      }),
      { phase: 'preview' }
    );
    store.setupRound();
    store.beginRound();
    store.setPendingBet(10);

    expect(store.pendingBet).toBe(3);
  });

  it('does nothing when revealSelected is called before beginRound', () => {
    const store = useDepthStore();
    store.loadLevelInput(singleStackLevel({ board: { rows: 1, columns: 2, depth: 1 } }), {
      phase: 'preview',
    });
    store.setupRound();
    store.revealSelected();

    expect(store.round.history).toHaveLength(0);
    expect(store.board?.stacks[0][0].cards[0].revealed).toBe(false);
  });

  it('exposes the next depth layer after revealing the top card of a stack', () => {
    const store = useDepthStore();
    store.loadLevelInput(
      {
        metadata: { id: 951, name: 'Depth Test' },
        economy: { startingBank: 10, rounds: 1, minBet: 1, maxBet: 5 },
        board: { rows: 1, columns: 2, depth: 2 },
        decks: { mode: 'by-depth', depthDeckIds: ['blue', 'blue'] },
        rules: { turnRule: 'basic-reveal' },
        support: { supportMode: 'exact' },
        testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
      },
      { phase: 'preview' }
    );
    store.setupRound();
    store.beginRound();
    store.setPendingBet(1);
    store.selectPosition({ row: 0, col: 0 });
    store.revealSelected();

    const stack = store.board!.stacks[0][0];
    expect(stack.cards[0].revealed).toBe(true);
    expect(stack.cards[1].revealed).toBe(false);
    expect(store.phase).toBe('playing');
    expect(store.accessiblePositions).toHaveLength(2);
  });

  it('level 8 builds a 5x5x10 board with 250 total cards and 25 accessible positions', () => {
    const store = useDepthStore();
    store.loadLevel(8);
    store.setupRound();

    expect(store.board?.rows).toBe(5);
    expect(store.board?.columns).toBe(5);
    expect(store.board?.depth).toBe(10);

    const totalCards = store
      .board!.stacks.flat()
      .reduce((sum, stack) => sum + stack.cards.length, 0);
    expect(totalCards).toBe(250);
    expect(store.accessiblePositions).toHaveLength(25);
  });

  it('applies dealer-follow-up reveals without changing player payout totals', () => {
    const store = useDepthStore();
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
        deckId: 'blue',
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
