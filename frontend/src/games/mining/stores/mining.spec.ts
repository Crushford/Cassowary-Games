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

  it('loads a Queens-derived board and reveals dirt without awarding gold', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    await store.dig({ row: 0, col: 1 });

    expect(store.currentLevel).toBe(1);
    expect(store.revealed[0][1]).toBe(true);
    expect(store.goldTotal).toBe(-1);
    expect(store.daysElapsed).toBe(1);
    expect(store.foundGoldCount).toBe(0);
  });

  it('supports free flags, paid digs, and recomputes auto-flags only after the upgrade is bought', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    store.toggleFlag({ row: 0, col: 0 });

    expect(store.playerFlags[0][0]).toBe(true);

    await store.dig({ row: 0, col: 0 });

    expect(store.playerFlags[0][0]).toBe(false);
    expect(store.goldTotal).toBe(4);
    expect(store.foundGoldCount).toBe(1);
    expect(store.autoFlags.flat().some(Boolean)).toBe(false);

    await store.dig({ row: 1, col: 2 });

    expect(store.goldTotal).toBe(8);
    expect(store.foundGoldCount).toBe(2);

    store.buyAutoFlagUpgrade();

    expect(store.hasAutoFlagUpgrade).toBe(true);
    expect(store.goldTotal).toBe(3);
    expect(store.showUpgradeExplanation).toBe(true);
    expect(store.autoFlags[0][1]).toBe(true);
    expect(store.autoFlags[1][0]).toBe(true);
    expect(store.autoFlags[1][1]).toBe(true);

    await store.dig({ row: 2, col: 4 });

    expect(store.goldTotal).toBe(7);
    expect(store.foundGoldCount).toBe(3);
    expect(store.autoFlags[2][3]).toBe(true);
    expect(store.autoFlags[3][4]).toBe(true);
  });

  it('loads a fresh board after all five gold tiles are found while keeping upgrade state', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    await store.dig({ row: 0, col: 0 });
    await store.dig({ row: 1, col: 2 });
    store.buyAutoFlagUpgrade();

    await store.dig({ row: 2, col: 4 });
    await store.dig({ row: 3, col: 1 });
    await store.dig({ row: 4, col: 3 });

    expect(store.phase).toBe('level-complete');
    expect(store.currentLevel).toBe(1);
    expect(store.hasAutoFlagUpgrade).toBe(true);

    await vi.advanceTimersByTimeAsync(700);

    expect(store.currentLevel).toBe(2);
    expect(store.phase).toBe('playing');
    expect(store.hasAutoFlagUpgrade).toBe(true);
    expect(store.currentPuzzleId).toBe('pz-2-0');
    expect(store.foundGoldCount).toBe(0);
    expect(store.revealed.flat().some(Boolean)).toBe(false);
  });
});
