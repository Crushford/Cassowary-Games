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
};

describe('useMiningStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetMiningPuzzleCacheForTests();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => puzzlesPayload,
    });

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', {
      setTimeout,
      clearTimeout,
    });

    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with bankroll and resolves a depth-1 dirt dig for 1 gold', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    await store.dig({ row: 0, col: 1 });

    expect(store.currentDepthLevel).toBe(1);
    expect(store.currentLevel).toBe(1);
    expect(store.goldTotal).toBe(24);
    expect(store.daysElapsed).toBe(1);
    expect(store.revealed[0][1]).toBe(true);
    expect(store.foundGoldCount).toBe(0);
  });

  it('unlocks the stone layer and pays the larger reward there', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    await store.dig({ row: 0, col: 0 });
    await store.dig({ row: 1, col: 2 });
    await store.dig({ row: 2, col: 4 });
    await store.dig({ row: 3, col: 1 });
    await store.dig({ row: 4, col: 3 });
    await vi.advanceTimersByTimeAsync(700);

    expect(store.goldTotal).toBe(45);

    store.buyUpgrade('basic-pick');

    expect(store.highestUnlockedDepthLevel).toBe(2);
    expect(store.currentDepthLevel).toBe(2);
    expect(store.goldTotal).toBe(25);
    expect(store.showUpgradeExplanation).toBe(true);

    await Promise.resolve();
    await Promise.resolve();

    await store.dig({ row: 0, col: 0 });

    expect(store.goldTotal).toBe(34);
    expect(store.foundGoldCount).toBe(1);
  });

  it('allows farming earlier depths after deeper levels are unlocked', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    store.goldTotal = 120;
    store.buyUpgrade('basic-pick');
    store.buyUpgrade('reinforced-pick');

    expect(store.highestUnlockedDepthLevel).toBe(3);
    expect(store.availableDepthLevels).toEqual([1, 2, 3]);

    store.setDepthLevel(1);

    expect(store.currentDepthLevel).toBe(1);
  });
});
