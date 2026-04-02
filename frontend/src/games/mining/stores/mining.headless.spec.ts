import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MINING_CAMPAIGN_LEVELS } from '../game/levels';
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

const PUZZLE_D = {
  id: 'headless-pz-d',
  layout: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklm',
  queens: ['Q......', '..Q....', '....Q..', '.Q.....', '......Q', '...Q...', '.....Q.'].join(''),
};

const PUZZLE_E = {
  id: 'headless-pz-e',
  layout: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  queens: [
    'Q.......',
    '..Q.....',
    '....Q...',
    '......Q.',
    '.Q......',
    '...Q....',
    '.....Q..',
    '.......Q',
  ].join(''),
};

const PUZZLE_F = {
  id: 'headless-pz-f',
  layout: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/!@#$%^&*()-_=',
  queens: [
    'Q........',
    '..Q......',
    '.....Q...',
    '.......Q.',
    '.Q.......',
    '...Q.....',
    '........Q',
    '......Q..',
    '....Q....',
  ].join(''),
};

const CAMPAIGN_PUZZLES = [
  PUZZLE_A,
  PUZZLE_B,
  PUZZLE_C,
  PUZZLE_D,
  PUZZLE_A,
  PUZZLE_C,
  PUZZLE_D,
  PUZZLE_E,
  PUZZLE_F,
];

const PUZZLES_BY_SIZE = {
  5: [PUZZLE_A, PUZZLE_B, PUZZLE_A, PUZZLE_B, PUZZLE_A, PUZZLE_B],
  6: [PUZZLE_C, PUZZLE_C, PUZZLE_C, PUZZLE_C],
  7: [PUZZLE_D, PUZZLE_D, PUZZLE_D, PUZZLE_D],
  8: [PUZZLE_E, PUZZLE_E, PUZZLE_E],
  9: [PUZZLE_F, PUZZLE_F, PUZZLE_F],
};

beforeEach(() => {
  vi.useFakeTimers();
  __resetMiningPuzzleCacheForTests();
  vi.spyOn(console, 'log').mockImplementation(() => {});

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

async function advanceToLevel(
  game: Awaited<ReturnType<typeof createHeadlessGame>>,
  levelNumber: number
) {
  const { store } = game;

  while (store.currentLevelNumber < levelNumber) {
    await game.digAllGold();
    expect(
      store.canStartNextLevel,
      `expected level ${store.currentLevelNumber} to unlock the next level`
    ).toBe(true);
    await store.startNextLevel();
    store.dismissLevelIntro();
  }
}

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

  it('loads every campaign level with the expected board size and scanner visibility', async () => {
    const game = await createHeadlessGame({ puzzles: CAMPAIGN_PUZZLES });
    const { store } = game;

    for (const level of MINING_CAMPAIGN_LEVELS) {
      expect(store.currentLevelNumber).toBe(level.number);
      expect(store.boardSize).toBe(level.boardSize);
      expect(store.foundGoldCount).toBe(0);
      expect(store.digsUsed).toBe(0);
      expect(store.canShowScannerRegions).toBe(level.number >= 5);

      if (level.number === MINING_CAMPAIGN_LEVELS.length) {
        break;
      }

      await game.digAllGold();
      expect(store.levelResult?.passed).toBe(true);
      await store.startNextLevel();
      expect(store.showLevelIntroModal).toBe(true);
      store.dismissLevelIntro();
    }

    game.cleanup();
  });

  it('unlocks Raven and scanner rewards at the correct campaign milestones', async () => {
    const game = await createHeadlessGame({ puzzles: CAMPAIGN_PUZZLES });
    const { store } = game;

    await advanceToLevel(game, 2);
    await game.digAllGold();
    expect(store.levelResult?.passed).toBe(true);
    expect(store.unlockedRavenSkillIds).toEqual(['auto-flag-row', 'auto-flag-column']);
    expect(store.unlockedToolUpgradeIds).toEqual([]);

    await store.startNextLevel();
    store.dismissLevelIntro();
    await game.digAllGold();
    expect(store.unlockedRavenSkillIds).toEqual([
      'auto-flag-row',
      'auto-flag-column',
      'auto-flag-diagonal',
    ]);
    expect(store.unlockedToolUpgradeIds).toEqual([]);

    await store.startNextLevel();
    store.dismissLevelIntro();
    await game.digAllGold();
    expect(store.unlockedToolUpgradeIds).toEqual(['scanner']);
    expect(store.canShowScannerRegions).toBe(true);

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
    expect(store.showLevelResultModal).toBe(true);

    store.revealLevelClue();

    expect(store.levelResult?.clueRevealed).toBe(true);
    game.cleanup();
  });

  it('retries a failed scanner level by resetting the board state but keeping unlocked scanner progress', async () => {
    const game = await createHeadlessGame({ puzzles: CAMPAIGN_PUZZLES });
    const { store } = game;

    await advanceToLevel(game, 5);

    expect(store.currentLevelNumber).toBe(5);
    expect(store.canShowScannerRegions).toBe(true);
    expect(store.unlockedToolUpgradeIds).toContain('scanner');

    await game.digEmptySquares(1);
    await game.digAllGold();

    expect(store.levelResult?.passed).toBe(false);
    expect(store.digsUsed).toBe(6);

    store.revealLevelClue();
    expect(store.levelResult?.clueRevealed).toBe(true);

    await store.retryLevel();
    store.dismissLevelIntro();

    expect(store.phase).toBe('playing');
    expect(store.currentLevelNumber).toBe(5);
    expect(store.digsUsed).toBe(0);
    expect(store.foundGoldCount).toBe(0);
    expect(store.showLevelResultModal).toBe(false);
    expect(store.levelResult).toBe(null);
    expect(store.canShowScannerRegions).toBe(true);
    expect(store.unlockedToolUpgradeIds).toContain('scanner');

    game.cleanup();
  });

  it('passes every scanner level with a perfect dig count', async () => {
    const game = await createHeadlessGame({ puzzles: CAMPAIGN_PUZZLES });
    const { store } = game;

    for (let levelNumber = 5; levelNumber <= 9; levelNumber += 1) {
      await advanceToLevel(game, levelNumber);

      const expectedGoldCount = store.currentLevelDefinition.goldTarget;

      await game.digAllGold();

      expect(store.levelResult?.passed).toBe(true);
      expect(store.digsUsed).toBe(expectedGoldCount);

      if (levelNumber < 9) {
        await store.startNextLevel();
        store.dismissLevelIntro();
      }
    }

    game.cleanup();
  });

  it('fails every scanner level when one empty square is dug before finding all gold', async () => {
    const game = await createHeadlessGame({ puzzlesBySize: PUZZLES_BY_SIZE });
    const { store } = game;

    for (let levelNumber = 5; levelNumber <= 9; levelNumber += 1) {
      await advanceToLevel(game, levelNumber);

      const expectedFailureDigs = store.currentLevelDefinition.goldTarget + 1;

      await game.digEmptySquares(1);
      await game.digAllGold();

      expect(store.levelResult?.passed).toBe(false);
      expect(store.digsUsed).toBe(expectedFailureDigs);

      if (levelNumber < 9) {
        await store.retryLevel();
        store.dismissLevelIntro();
      }
    }

    game.cleanup();
  });

  it('finishes the campaign on the 9x9 scanner level and records a score', async () => {
    const game = await createHeadlessGame({ puzzles: CAMPAIGN_PUZZLES });
    const { store } = game;

    while (store.currentLevelNumber < 9) {
      await game.digAllGold();
      await store.startNextLevel();
      store.dismissLevelIntro();
    }

    await game.digAllGold();

    expect(store.phase).toBe('game-complete');
    expect(store.isGameComplete).toBe(true);

    store.setLeaderboardName('Headless');
    store.submitLeaderboardScore();

    expect(store.scoreSubmitted).toBe(true);
    expect(store.leaderboardEntries[0]?.name).toBe('Headless');
    expect(store.leaderboardEntries[0]?.daysElapsed).toBe(store.daysElapsed);
    game.cleanup();
  });
});
