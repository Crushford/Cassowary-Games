import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetMiningPuzzleCacheForTests } from '../game/puzzles/loadMiningPuzzle';
import { MINING_SAVE_KEY } from './miningConfig';

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

  it('starts with food and coins, then resolves a flagged dig for 1 food', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    expect(store.showIntroModal).toBe(true);
    expect(store.selectedFieldId).toBe('training-field');
    store.dismissIntro();
    store.toggleFlag({ row: 0, col: 1 });
    await store.dig({ row: 0, col: 1 });

    expect(store.currentDepthLevel).toBe(1);
    expect(store.currentLevel).toBe(1);
    expect(store.foodTotal).toBe(29);
    expect(store.coinsTotal).toBe(20);
    expect(store.goldTotal).toBe(0);
    expect(store.daysElapsed).toBe(1);
    expect(store.revealed[0][1]).toBe(true);
    expect(store.foundGoldCount).toBe(0);
  });

  it('opens the prototype progression structure and applies permit rewards', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    store.openProgressionMenu();
    store.buyPermit('premium-permit');

    expect(store.activePermitTierId).toBe('premium-permit');
    expect(store.coinsTotal).toBe(19);
    expect(store.goldRewardPerTile).toBe(8);

    store.toggleFlag({ row: 0, col: 0 });
    await store.dig({ row: 0, col: 0 });

    expect(store.goldTotal).toBe(8);
    expect(store.coinsTotal).toBe(19);
    expect(store.foodTotal).toBe(29);
    expect(store.foundGoldCount).toBe(1);
  });

  it('lets town convert gold into coins and coins into food', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    store.toggleFlag({ row: 0, col: 0 });
    await store.dig({ row: 0, col: 0 });

    expect(store.goldTotal).toBe(5);
    expect(store.coinsTotal).toBe(20);

    store.exchangeGoldForCoins();
    expect(store.goldTotal).toBe(4);
    expect(store.coinsTotal).toBe(21);

    store.buyFood();
    expect(store.coinsTotal).toBe(20);
    expect(store.foodTotal).toBe(59);
  });

  it('persists and restores the current mining run from local storage', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    store.dismissIntro();
    store.toggleFlag({ row: 0, col: 0 });
    await store.dig({ row: 0, col: 0 });
    store.buyFood();

    const savedPuzzleId = store.currentPuzzleId;
    const savedFood = store.foodTotal;
    const savedCoins = store.coinsTotal;
    const savedGold = store.goldTotal;
    const savedRevealed = store.revealed.map((row) => [...row]);
    const savedFlags = store.playerFlags.map((row) => [...row]);
    await Promise.resolve();

    setActivePinia(createPinia());
    const restoredStore = useMiningStore();

    await restoredStore.initialize();

    expect(restoredStore.currentPuzzleId).toBe(savedPuzzleId);
    expect(restoredStore.foodTotal).toBe(savedFood);
    expect(restoredStore.coinsTotal).toBe(savedCoins);
    expect(restoredStore.goldTotal).toBe(savedGold);
    expect(restoredStore.revealed).toEqual(savedRevealed);
    expect(restoredStore.playerFlags).toEqual(savedFlags);
    expect(restoredStore.showIntroModal).toBe(false);
  });

  it('restores older flat mining saves without crashing', async () => {
    window.localStorage.setItem(
      MINING_SAVE_KEY,
      JSON.stringify({
        currentPuzzleId: 'legacy-puzzle',
        boardSize: 5,
        truthGold: Array.from({ length: 5 }, () => Array(5).fill(false)),
        truthQuartz: Array.from({ length: 5 }, () => Array(5).fill(false)),
        regionIds: Array.from({ length: 5 }, () => Array(5).fill('.')),
        revealed: Array.from({ length: 5 }, () => Array(5).fill(false)),
        playerFlags: Array.from({ length: 5 }, () => Array(5).fill(false)),
        systemFlags: Array.from({ length: 5 }, () => Array(5).fill(false)),
        phase: 'playing',
        currentLevel: 4,
        foundGoldCount: 2,
        daysElapsed: 7,
        highestUnlockedDepthLevel: 2,
        currentDepthLevel: 2,
        deathMessage: null,
        hintUnlocked: false,
        shownHintDepths: [1],
        goldTotal: 9,
        coinsTotal: 3,
        foodTotal: 14,
        selectedProgressionTab: 'gold-exchange',
        ownedFieldIds: ['training-field', 'standard-field'],
        selectedFieldId: 'standard-field',
        magpieSkillIds: ['buy-magpie'],
        ownedPermitTierIds: ['better-permit'],
        activePermitTierId: 'better-permit',
        ownedToolUpgradeIds: ['stronger-pick'],
        hasSeenIntroThisRun: true,
        lastActionMessage: 'Legacy save restored.',
      })
    );

    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();

    expect(store.currentPuzzleId).toBe('legacy-puzzle');
    expect(store.currentLevel).toBe(4);
    expect(store.selectedFieldId).toBe('standard-field');
    expect(store.ownedFieldIds).toContain('standard-field');
    expect(store.selectedProgressionTab).toBe('gold-exchange');
    expect(store.coinsTotal).toBe(3);
    expect(store.goldTotal).toBe(9);
    expect(store.foodTotal).toBe(14);
    expect(store.showIntroModal).toBe(false);
  });

  it('moves to the next field only when requested and charges 1 coin', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    const startingPuzzleId = store.currentPuzzleId;
    const startingLevel = store.currentLevel;
    const startingCoins = store.coinsTotal;

    expect(store.canTravelToNextField()).toBe(true);

    await store.goToNextField();

    expect(store.currentLevel).toBe(startingLevel + 1);
    expect(store.coinsTotal).toBe(startingCoins - 1);
    expect(store.currentPuzzleId).not.toBe(startingPuzzleId);
    expect(store.phase).toBe('playing');
  });

  it('does not auto-advance on clear until the auto hauler upgrade is owned', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();

    const firstFieldGold = getGoldPositions(store.truthGold);

    for (const position of firstFieldGold) {
      store.toggleFlag(position);
      await store.dig(position);
    }

    expect(store.foundGoldCount).toBe(5);
    expect(store.phase).toBe('level-complete');

    vi.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();

    expect(store.currentLevel).toBe(1);

    store.buyToolUpgrade('auto-hauler');
    await store.goToNextField();
    const levelBeforeAutoClear = store.currentLevel;
    const coinsBeforeAutoClear = store.coinsTotal;
    const secondFieldGold = getGoldPositions(store.truthGold);

    for (const position of secondFieldGold) {
      store.toggleFlag(position);
      await store.dig(position);
    }

    expect(store.phase).toBe('level-complete');

    vi.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();

    expect(store.currentLevel).toBe(levelBeforeAutoClear + 1);
    expect(store.coinsTotal).toBeGreaterThanOrEqual(coinsBeforeAutoClear - 1);
    expect(store.phase).toBe('playing');
  });

  it('lets the magpie learn row and diagonal rules and surfaces system flags from found gold', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    store.buyAutomation('buy-magpie');
    store.buyAutomation('teach-row-rule');
    store.buyAutomation('teach-diagonal-rule');

    expect(store.hasMagpie).toBe(true);
    expect(store.magpieSkillIds).toContain('buy-magpie');
    expect(store.magpieSkillIds).toContain('teach-row-rule');
    expect(store.magpieSkillIds).toContain('teach-diagonal-rule');

    store.toggleFlag({ row: 0, col: 0 });
    await store.dig({ row: 0, col: 0 });

    expect(store.systemFlags[0][1]).toBe(true);
    expect(store.systemFlags[1][1]).toBe(true);
    expect(store.systemFlags[1][0]).toBe(false);
  });

  it('treats field profile and depth unlocks as separate prototype categories', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    store.buyField('standard-field');

    expect(store.selectedFieldId).toBe('standard-field');
    expect(store.ownedFieldIds).toContain('standard-field');
    expect(store.currentDepthLevel).toBe(1);

    store.buyToolUpgrade('scanner');

    expect(store.ownedToolUpgradeIds).toContain('scanner');
    expect(store.highestUnlockedDepthLevel).toBe(4);
    expect(store.currentDepthLevel).toBe(4);
  });

  it('keeps placeholder items visible but not purchasable', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();

    expect(store.canBuyField('large-field')).toBe(false);
    store.buyField('large-field');
    expect(store.errorMessage).toContain('not implemented yet');

    store.clearError();
    expect(store.canBuyAutomation('teach-pattern-recognition')).toBe(false);

    store.clearError();
    expect(store.canBuyToolUpgrade('drill')).toBe(false);
  });

  it('requires buying the magpie before lessons and keeps training field distinct from standard field', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();

    expect(store.canBuyAutomation('teach-column-rule')).toBe(false);
    store.buyAutomation('teach-column-rule');
    expect(store.errorMessage).toContain('Buy the magpie');

    store.clearError();
    store.buyField('standard-field');
    expect(store.selectedFieldTitle).toBe('Standard Field');

    store.selectField('training-field');
    expect(store.selectedFieldTitle).toBe('Training Field');
  });

  it('locks digging when food runs out until more food is bought in town', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    store.dismissIntro();
    store.economy.foodTotal = 1;
    store.toggleFlag({ row: 0, col: 2 });
    await store.dig({ row: 0, col: 2 });
    expect(store.foodTotal).toBe(0);

    store.buyField('standard-field');
    store.buyAutomation('buy-magpie');
    store.buyAutomation('teach-column-rule');
    store.buyPermit('better-permit');
    store.buyToolUpgrade('stronger-pick');

    expect(store.highestUnlockedDepthLevel).toBe(2);
    expect(store.selectedFieldId).toBe('standard-field');
    expect(store.activePermitTierId).toBe('better-permit');

    store.triggerDeath();

    expect(store.phase).toBe('out-of-food');
    expect(store.showDeathModal).toBe(true);
    expect(store.goldTotal).toBe(0);
    expect(store.foodTotal).toBe(0);

    store.toggleFlag({ row: 0, col: 0 });
    expect(store.playerFlags[0][0]).toBe(false);

    await store.dig({ row: 0, col: 0 });
    expect(store.revealed[0][0]).toBe(false);

    store.buyFood();

    expect(store.phase).toBe('playing');
    expect(store.showDeathModal).toBe(false);
    expect(store.foodTotal).toBe(30);

    store.economy.foodTotal = 0;
    store.toggleFlag({ row: 0, col: 0 });
    await store.dig({ row: 0, col: 0 });

    expect(store.showDeathModal).toBe(true);
    expect(store.deathMessage).toContain('buy more food');
    expect(store.deathMessage).toContain('convert your gold into coins');
    expect(store.errorMessage).toBe(null);
  });
});
