import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetMiningPuzzleCacheForTests } from '../game/puzzles/loadMiningPuzzle';
import { createHeadlessGame } from '../testing/createHeadlessGame';
import { __resetPuzzleLoaderForTests } from './miningRunService';

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

const PUZZLE_C = {
  id: 'headless-pz-c',
  layout: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  queens: ['Q.....', '..Q...', '....Q.', '.Q....', '...Q..', '.....Q'].join(''),
};

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

describe('Mining headless E2E - campaign loop', () => {
  it('starts in playing phase on level 1 with 0 digs used and 0 total days', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A] });

    expect(game.store.phase).toBe('playing');
    expect(game.store.currentLevelNumber).toBe(1);
    expect(game.store.digsUsed).toBe(0);
    expect(game.store.daysElapsed).toBe(0);
    expect(game.store.currentPuzzleId).toBe('headless-pz-a');
    game.cleanup();
  });

  it('completes level 1 after finding all gold', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A] });
    const { store } = game;

    await game.digAllGold();

    expect(store.phase).toBe('level-complete');
    expect(store.levelResult?.passed).toBe(true);
    expect(store.foundGoldCount).toBe(5);
    game.cleanup();
  });

  it('fails level 2 if the player needs 15 digs', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A, PUZZLE_B] });
    const { store } = game;

    await game.digAllGold();
    await store.startNextLevel();
    store.dismissLevelIntro();

    await game.digEmptySquares(10);
    await game.digAllGold();

    expect(store.currentLevelNumber).toBe(2);
    expect(store.digsUsed).toBe(15);
    expect(store.daysElapsed).toBe(20);
    expect(store.levelResult?.passed).toBe(false);
    game.cleanup();
  });

  it('passing level 2 unlocks Raven row and column flags', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A, PUZZLE_B] });
    const { store } = game;

    await game.digAllGold();
    await store.startNextLevel();
    store.dismissLevelIntro();
    await game.digAllGold();

    expect(store.levelResult?.passed).toBe(true);
    expect(store.unlockedRavenSkillIds).toEqual(['auto-flag-row', 'auto-flag-column']);
    game.cleanup();
  });

  it('level 3 loads the larger 6x6 board', async () => {
    const game = await createHeadlessGame({ puzzles: [PUZZLE_A, PUZZLE_B, PUZZLE_C] });
    const { store } = game;

    await game.digAllGold();
    await store.startNextLevel();
    store.dismissLevelIntro();
    await game.digAllGold();
    await store.startNextLevel();

    expect(store.currentLevelNumber).toBe(3);
    expect(store.boardSize).toBe(6);
    expect(store.showLevelIntroModal).toBe(true);
    game.cleanup();
  });
});
