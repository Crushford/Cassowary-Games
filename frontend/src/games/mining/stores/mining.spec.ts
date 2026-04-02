import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetMiningPuzzleCacheForTests } from '../game/puzzles/loadMiningPuzzle';

const puzzlesPayload = {
  '5x5': [
    {
      id: 'pz-1-0',
      layout: 'ABCDEFGHIJKLMNOPQRSTUVWXY',
      queens: 'Q......Q......Q.Q......Q.',
    },
    {
      id: 'pz-2-0',
      layout: 'ZYXWVUTSRQPONMLKJIHGFEDCB',
      queens: '.Q......Q.Q......Q......Q',
    },
  ],
  '6x6': [
    {
      id: 'pz-6-0',
      layout: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      queens: ['Q.....', '..Q...', '....Q.', '.Q....', '...Q..', '.....Q'].join(''),
    },
  ],
  '7x7': [
    {
      id: 'pz-7-0',
      layout: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklm',
      queens: ['Q......', '..Q....', '....Q..', '.Q.....', '......Q', '...Q...', '.....Q.'].join(
        ''
      ),
    },
  ],
  '8x8': [
    {
      id: 'pz-8-0',
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
    },
  ],
  '9x9': [
    {
      id: 'pz-9-0',
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
    },
  ],
};

describe('useMiningStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetMiningPuzzleCacheForTests();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const storage = (() => {
      const store = new Map<string, string>();
      return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      };
    })();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => puzzlesPayload,
    });

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', {
      setTimeout,
      clearTimeout,
      localStorage: storage,
    });
    vi.stubGlobal('localStorage', storage);

    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function createStore() {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();
    await store.initialize();
    store.dismissLevelIntro();
    return store;
  }

  function getGoldPositions(grid: boolean[][]) {
    const positions: Array<{ row: number; col: number }> = [];

    for (let row = 0; row < grid.length; row += 1) {
      for (let col = 0; col < grid[row].length; col += 1) {
        if (grid[row][col]) {
          positions.push({ row, col });
        }
      }
    }

    return positions;
  }

  function getEmptyPositions(grid: boolean[][]) {
    const positions: Array<{ row: number; col: number }> = [];

    for (let row = 0; row < grid.length; row += 1) {
      for (let col = 0; col < grid[row].length; col += 1) {
        if (!grid[row][col]) {
          positions.push({ row, col });
        }
      }
    }

    return positions;
  }

  async function completeLevel(store: Awaited<ReturnType<typeof createStore>>) {
    for (const position of getGoldPositions(store.truthGold)) {
      if (store.revealed[position.row][position.col]) {
        continue;
      }

      store.toggleFlag(position);
      await store.dig(position);
    }
  }

  async function advanceToLevel(
    store: Awaited<ReturnType<typeof createStore>>,
    levelNumber: number
  ) {
    while (store.currentLevelNumber < levelNumber) {
      await completeLevel(store);
      expect(
        store.canStartNextLevel,
        `expected level ${store.currentLevelNumber} to unlock the next level`
      ).toBe(true);
      await store.startNextLevel();
      store.dismissLevelIntro();
    }
  }

  it('starts on level 1 with the intro modal open', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();

    expect(store.currentLevelNumber).toBe(1);
    expect(store.boardSize).toBe(5);
    expect(store.showLevelIntroModal).toBe(true);
  });

  it('adds 1 dig per excavation and tracks total days across the run', async () => {
    const store = await createStore();

    expect(store.digsUsed).toBe(0);
    expect(store.daysElapsed).toBe(0);

    store.toggleFlag({ row: 0, col: 1 });
    await store.dig({ row: 0, col: 1 });

    expect(store.digsUsed).toBe(1);
    expect(store.daysElapsed).toBe(1);
    expect(store.revealed[0][1]).toBe(true);
  });

  it('allows the player to override automatic not-gold flags and dig anyway', async () => {
    const store = await createStore();

    store.progression.unlockedRavenSkillIds = ['auto-flag-row'];
    store.revealed[0][0] = true;
    store.run.foundGoldCount = 1;
    store.recomputeSystemFlags();

    expect(store.systemFlags[0][1]).toBe('not-gold');
    expect(store.visibleFlags[0][1]).toBe('not-gold');

    store.toggleFlag({ row: 0, col: 1 });

    expect(store.playerFlags[0][1]).toBe('gold-here');
    expect(store.visibleFlags[0][1]).toBe('gold-here');

    await store.dig({ row: 0, col: 1 });

    expect(store.revealed[0][1]).toBe(true);
  });

  it('allows digging an unrevealed tile without placing a gold flag first', async () => {
    const store = await createStore();

    await store.dig({ row: 0, col: 1 });

    expect(store.revealed[0][1]).toBe(true);
    expect(store.digsUsed).toBe(1);
    expect(store.daysElapsed).toBe(1);
  });

  it('completes the level when all gold is found', async () => {
    const store = await createStore();

    await completeLevel(store);

    expect(store.phase).toBe('level-complete');
    expect(store.showLevelResultModal).toBe(true);
    expect(store.levelResult?.passed).toBe(true);
  });

  it('fails level 2 when all gold is found in 15 digs or more and reveals its clue', async () => {
    const store = await createStore();

    await completeLevel(store);
    await store.startNextLevel();
    store.dismissLevelIntro();

    for (const position of getEmptyPositions(store.truthGold).slice(0, 10)) {
      store.toggleFlag(position);
      await store.dig(position);
    }

    await completeLevel(store);

    expect(store.currentLevelNumber).toBe(2);
    expect(store.digsUsed).toBe(15);
    expect(store.daysElapsed).toBe(20);
    expect(store.levelResult?.passed).toBe(false);

    store.revealLevelClue();

    expect(store.levelResult?.clueRevealed).toBe(true);
  });

  it('passing level 2 unlocks the Raven row and column skills and opens level 3', async () => {
    const store = await createStore();

    await completeLevel(store);
    await store.startNextLevel();
    store.dismissLevelIntro();
    await completeLevel(store);

    expect(store.currentLevelNumber).toBe(2);
    expect(store.levelResult?.passed).toBe(true);
    expect(store.unlockedRavenSkillIds).toEqual(['auto-flag-row', 'auto-flag-column']);
    expect(store.highestUnlockedLevelIndex).toBe(2);
    expect(store.canStartNextLevel).toBe(true);
  });

  it('loads a 6x6 board on level 3', async () => {
    const store = await createStore();

    await completeLevel(store);
    await store.startNextLevel();
    store.dismissLevelIntro();
    await completeLevel(store);
    await store.startNextLevel();

    expect(store.currentLevelNumber).toBe(3);
    expect(store.boardSize).toBe(6);
    expect(store.showLevelIntroModal).toBe(true);
  });

  it('completes the full scanner campaign and saves a leaderboard score', async () => {
    const store = await createStore();

    await advanceToLevel(store, 9);
    await completeLevel(store);

    expect(store.isGameComplete).toBe(true);
    expect(store.phase).toBe('game-complete');
    expect(store.daysElapsed).toBeGreaterThan(0);
    expect(store.showLevelResultModal).toBe(true);

    store.setLeaderboardName('James');
    store.submitLeaderboardScore();

    expect(store.scoreSubmitted).toBe(true);
    expect(store.leaderboardEntries[0]).toMatchObject({
      name: 'James',
      daysElapsed: store.daysElapsed,
    });
  });
});
