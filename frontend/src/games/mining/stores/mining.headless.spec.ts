/**
 * Headless end-to-end tests for the mining game.
 *
 * These tests simulate full player-facing loops (field play → town → next month)
 * without any UI. Puzzle fixtures are injected directly — no fetch required.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetMiningPuzzleCacheForTests } from '../game/puzzles/loadMiningPuzzle';
import { createHeadlessGame } from '../testing/createHeadlessGame';
import { __resetPuzzleLoaderForTests } from './miningRunService';

// ─── Fixture puzzles ─────────────────────────────────────────────────────────
// Valid 5x5 Queens puzzles (25-char layout + 25-char queens string).

const PUZZLE_A = {
  id: 'headless-pz-a',
  layout: 'ABCDEABCDEABCDEABCDEABCDE',
  queens: 'Q......Q......Q.Q......Q.',
};

const PUZZLE_B = {
  id: 'headless-pz-b',
  layout: 'ZYXWVUTSRQPONMLKJIHGFEDCB',
  queens: '.Q......Q.Q......Q......Q',
};

const PATTERN_PUZZLE = {
  id: 'headless-pattern',
  layout: 'BABBBBAABBBBBBBBBBBBBBBBB',
  queens: 'Q......Q......Q.Q......Q.',
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  __resetMiningPuzzleCacheForTests();

  const storage = (() => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
  })();

  vi.stubGlobal('window', { setTimeout, clearTimeout, localStorage: storage });
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  __resetPuzzleLoaderForTests();
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Mining headless E2E — monthly loop', () => {
  it('starts in playing phase with 28 days', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A] });
    expect(game.store.phase).toBe('playing');
    expect(game.store.daysLeftInMonth).toBe(28);
    expect(game.store.currentPuzzleId).toBe('headless-pz-a');
    game.cleanup();
  });

  it('completes a full month loop: play → town → exchange → food → next month', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A, PUZZLE_B] });
    const { store } = game;

    // Burn all but one day, then force month end
    store.run.daysLeftInMonth = 0;
    store.triggerMonthEnd();

    expect(store.phase).toBe('town');
    expect(store.showMonthOverModal).toBe(true);

    await game.completeTownSequence();

    expect(store.phase).toBe('playing');
    expect(store.daysLeftInMonth).toBe(28);
    expect(store.goldCollectedThisMonth).toBe(0);
    expect(store.townStep).toBe('none');
    expect(store.progression.exchangeProcessedThisTown).toBe(false);
    expect(store.progression.monthlyUpkeepPaid).toBe(false);
    game.cleanup();
  });

  it('digging all gold earns the correct reward and does not end the field early', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A] });
    const { store } = game;

    const startingCoins = store.coinsTotal;
    await game.digAllGold();

    expect(store.foundGoldCount).toBe(store.boardSize);
    expect(store.goldTotal).toBe(store.boardSize);
    // Field not complete yet (non-gold tiles remain)
    expect(store.phase).toBe('playing');
    expect(store.coinsTotal).toBe(startingCoins); // gold doesn't become coins until exchange
    game.cleanup();
  });

  it('digging the entire field transitions to level-complete', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A, PUZZLE_B] });
    const { store } = game;

    await game.digEntireField();

    expect(store.phase).toBe('level-complete');
    expect(store.showFieldExhaustedModal).toBe(true);
    game.cleanup();
  });
});

describe('Mining headless E2E — exchange progression', () => {
  it('exchanges gold for coins at a 3% payout rate at level 1 threshold', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A] });
    const { store } = game;

    store.run.phase = 'town';
    store.progression.townStep = 'exchange';
    store.economy.goldTotal = 1;

    store.exchangeGoldForCoins();

    expect(store.goldTotal).toBe(0);
    expect(store.bestLevel).toBe(1);
    expect(store.exchangeSummary.returnPercent).toBe(3);
    expect(store.exchangeSummary.payout).toBe(3);
    expect(store.levelCelebration?.level).toBe(1);
    game.cleanup();
  });

  it('a zero-gold month still clears the exchange step', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A] });
    const { store } = game;

    store.run.phase = 'town';
    store.progression.townStep = 'exchange';
    store.economy.goldTotal = 0;
    store.run.bestLevel = 0;

    store.exchangeGoldForCoins();

    expect(store.exchangeSummary.processed).toBe(true);
    expect(store.bestLevel).toBe(1);
    expect(store.canAdvanceTownStep).toBe(true);
    game.cleanup();
  });

  it('unlocks auto-hauler after reaching level 1 exchange', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A] });
    const { store } = game;

    store.run.bestLevel = 1;

    expect(store.visibleToolUpgradeOptions.map((o) => o.id)).toContain('auto-hauler');
    game.cleanup();
  });
});

describe('Mining headless E2E — magpie automation', () => {
  it('buying a row lesson immediately recomputes system flags', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A] });
    const { store } = game;

    store.run.bestLevel = 2;
    store.economy.coinsTotal = 20;
    store.buyAutomation('buy-magpie');
    store.buyAutomation('auto-flag-row');

    store.board.revealed[0][0] = true;
    store.recomputeSystemFlags();

    expect(store.systemFlags[0][1]).toBe('not-gold');
    expect(store.systemFlags[0][2]).toBe('not-gold');
    expect(store.systemFlags[0][3]).toBe('not-gold');
    expect(store.systemFlags[0][4]).toBe('not-gold');
    game.cleanup();
  });

  it('applies pattern auto-flags as part of field initialization', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A, PATTERN_PUZZLE] });
    const { store } = game;

    store.run.bestLevel = 4;
    store.economy.coinsTotal = 20;
    store.buyAutomation('buy-magpie');
    store.buyAutomation('pattern-automation-1');

    await store.loadNextLevel();

    expect(store.currentPuzzleId).toBe('headless-pattern');
    expect(store.systemFlags[0][2]).toBe('not-gold');
    expect(store.systemFlags[1][0]).toBe('not-gold');
    expect(store.systemFlags[2][1]).toBe('not-gold');
    game.cleanup();
  });

  it('visible magpie lessons still require owning the magpie before purchase', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A] });
    const { store } = game;

    store.run.bestLevel = 2;
    store.economy.coinsTotal = 20;

    expect(store.visibleAutomationOptions.map((option) => option.id)).toContain('auto-flag-row');
    expect(store.canBuyAutomation('auto-flag-row')).toBe(false);

    store.buyAutomation('buy-magpie');
    expect(store.canBuyAutomation('auto-flag-row')).toBe(true);
    game.cleanup();
  });
});

describe('Mining headless E2E — auto-hauler progression', () => {
  it('auto-hauler triggers field transition after full dig with enough coins', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A, PUZZLE_B] });
    const { store } = game;

    store.run.bestLevel = 1;
    store.economy.coinsTotal = 10;
    store.buyToolUpgrade('auto-hauler');
    expect(store.ownedToolUpgradeIds).toContain('auto-hauler');

    await game.digEntireField();

    // Field complete + auto-hauler pending timeout
    expect(store.phase).toBe('level-complete');
    expect(store.showFieldExhaustedModal).toBe(false); // auto-hauler suppresses modal

    await vi.runAllTimersAsync();

    // Now on the next puzzle
    expect(store.currentPuzzleId).toBe('headless-pz-b');
    expect(store.phase).toBe('playing');
    game.cleanup();
  });
});

describe('Mining headless E2E — scanner unlock', () => {
  it('buying the scanner reveals region IDs on the board', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A] });
    const { store } = game;

    store.run.bestLevel = 3;
    store.economy.coinsTotal = 10;

    expect(store.canShowScannerRegions).toBe(false);

    store.buyToolUpgrade('scanner');

    expect(store.canShowScannerRegions).toBe(true);
    expect(store.ownedToolUpgradeIds).toContain('scanner');
    game.cleanup();
  });
});
