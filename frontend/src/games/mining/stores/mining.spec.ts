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

  async function createStore() {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();
    await store.initialize();
    store.dismissIntro();
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

  it('starts a month with 28 days and spends 1 day per dig', async () => {
    const store = await createStore();

    expect(store.daysPerMonth).toBe(28);
    expect(store.daysLeftInMonth).toBe(28);

    store.toggleFlag({ row: 0, col: 1 });
    await store.dig({ row: 0, col: 1 });

    expect(store.daysLeftInMonth).toBe(27);
    expect(store.daysElapsed).toBe(1);
    expect(store.revealed[0][1]).toBe(true);
    expect(store.coinsTotal).toBe(20);
  });

  it('moves to town when the month ends and opens the month-over modal', async () => {
    const store = await createStore();

    store.run.daysLeftInMonth = 1;
    store.toggleFlag({ row: 0, col: 1 });
    await store.dig({ row: 0, col: 1 });

    expect(store.daysLeftInMonth).toBe(0);
    expect(store.phase).toBe('town');
    expect(store.townStep).toBe('exchange');
    expect(store.showMonthOverModal).toBe(true);
    expect(store.progressionMenuOpen).toBe(false);

    store.dismissMonthOverModal();

    expect(store.showMonthOverModal).toBe(false);
    expect(store.progressionMenuOpen).toBe(true);
  });

  it('processes the exchange, updates month level and unlocks level-gated shops', async () => {
    const store = await createStore();

    store.run.phase = 'town';
    store.progression.townStep = 'exchange';
    store.ui.progressionMenuOpen = true;
    store.economy.goldTotal = 1;
    store.run.goldCollectedThisMonth = 1;

    store.exchangeGoldForCoins();

    expect(store.goldTotal).toBe(0);
    expect(store.coinsTotal).toBe(123);
    expect(store.currentMonthLevel).toBe(1);
    expect(store.bestLevel).toBe(1);
    expect(store.exchangeSummary.soldGold).toBe(1);
    expect(store.exchangeSummary.baseValue).toBe(100);
    expect(store.exchangeSummary.returnPercent).toBe(3);
    expect(store.exchangeSummary.payout).toBe(103);
    expect(store.levelCelebration).toEqual({
      level: 1,
      returnPercent: 3,
      scannerUnlocked: false,
    });
    expect(store.visibleAutomationOptions.map((option) => option.id)).toEqual([
      'buy-magpie',
      'auto-flag-row',
    ]);
    expect(store.visibleToolUpgradeOptions.map((option) => option.id)).toEqual(['auto-hauler']);
  });

  it('allows a zero-gold month to clear the exchange step', async () => {
    const store = await createStore();

    store.run.phase = 'town';
    store.progression.townStep = 'exchange';
    store.ui.progressionMenuOpen = true;
    store.economy.goldTotal = 0;
    store.run.bestLevel = 0;

    store.exchangeGoldForCoins();

    expect(store.exchangeSummary.processed).toBe(true);
    expect(store.currentMonthLevel).toBe(1);
    expect(store.bestLevel).toBe(1);
    expect(store.coinsTotal).toBe(20);
    expect(store.errorMessage).toBe(null);
    expect(store.canAdvanceTownStep).toBe(true);
  });

  it('runs the town sequence in order and starts a new month after upkeep is paid', async () => {
    const store = await createStore();

    store.run.phase = 'town';
    store.progression.townStep = 'exchange';
    store.ui.progressionMenuOpen = true;
    store.economy.goldTotal = 1;
    store.run.goldCollectedThisMonth = 1;

    store.exchangeGoldForCoins();
    store.continueTownSequence();
    expect(store.townStep).toBe('food-shop');

    store.continueTownSequence();
    expect(store.townStep).toBe('food-shop');

    store.buyFood();
    expect(store.progression.monthlyUpkeepPaid).toBe(true);
    expect(store.coinsTotal).toBe(122);

    store.continueTownSequence();
    expect(store.townStep).toBe('magpie-trainer');

    store.buyAutomation('buy-magpie');
    store.buyAutomation('auto-flag-row');
    expect(store.magpieSkillIds).toEqual(['buy-magpie', 'auto-flag-row']);

    store.continueTownSequence();
    expect(store.townStep).toBe('tool-store');

    store.buyToolUpgrade('auto-hauler');
    expect(store.ownedToolUpgradeIds).toContain('auto-hauler');

    store.continueTownSequence();
    expect(store.phase).toBe('playing');
    expect(store.daysLeftInMonth).toBe(28);
    expect(store.currentMonthLevel).toBe(0);
    expect(store.goldCollectedThisMonth).toBe(0);
    expect(store.townStep).toBe('none');
    expect(store.progressionMenuOpen).toBe(false);
  });

  it('unlocks higher-level magpie lessons, scanner, and pattern scaffolding by best level', async () => {
    const store = await createStore();

    store.run.bestLevel = 3;

    expect(store.visibleAutomationOptions.map((option) => option.id)).toEqual([
      'buy-magpie',
      'auto-flag-row',
      'auto-flag-column',
      'auto-flag-diagonal',
      'pattern-automation-1',
      'pattern-automation-2',
    ]);
    expect(store.canBuyAutomation('auto-flag-row')).toBe(false);

    store.buyAutomation('buy-magpie');
    expect(store.visibleAutomationOptions.map((option) => option.id)).toEqual([
      'auto-flag-row',
      'auto-flag-column',
      'auto-flag-diagonal',
      'pattern-automation-1',
      'pattern-automation-2',
    ]);
    expect(store.visibleToolUpgradeOptions.map((option) => option.id)).toEqual([
      'scanner',
      'auto-hauler',
    ]);

    expect(store.canBuyAutomation('pattern-automation-1')).toBe(true);
    expect(store.canBuyToolUpgrade('scanner')).toBe(true);

    store.buyToolUpgrade('scanner');

    expect(store.ownedToolUpgradeIds).toContain('scanner');
    expect(store.canShowScannerRegions).toBe(true);
  });

  it('keeps the field playable after all gold is found and only completes when fully dug', async () => {
    const store = await createStore();

    const goldPositions = getGoldPositions(store.truthGold);

    for (const position of goldPositions) {
      store.toggleFlag(position);
      await store.dig(position);
    }

    expect(store.foundGoldCount).toBe(goldPositions.length);
    expect(store.phase).toBe('playing');
    expect(store.showFieldExhaustedModal).toBe(false);

    let extraDug = false;
    for (let row = 0; row < store.boardSize && !extraDug; row += 1) {
      for (let col = 0; col < store.boardSize && !extraDug; col += 1) {
        if (!store.revealed[row][col]) {
          await store.dig({ row, col });
          expect(store.revealed[row][col]).toBe(true);
          extraDug = true;
        }
      }
    }

    for (let row = 0; row < store.boardSize; row += 1) {
      for (let col = 0; col < store.boardSize; col += 1) {
        if (!store.revealed[row][col]) {
          await store.dig({ row, col });
        }
      }
    }

    expect(store.phase).toBe('level-complete');
    expect(store.showFieldExhaustedModal).toBe(true);
  });

  it('shows purchased upgrades when the purchased toggle is enabled', async () => {
    const store = await createStore();

    store.run.bestLevel = 3;
    store.buyAutomation('buy-magpie');
    expect(store.visibleAutomationOptions.map((option) => option.id)).not.toContain('buy-magpie');
    store.buyAutomation('auto-flag-row');
    expect(store.visibleAutomationOptions.map((option) => option.id)).not.toContain(
      'auto-flag-row'
    );
    store.buyToolUpgrade('scanner');

    store.toggleShowPurchasedUpgrades();

    expect(store.visibleAutomationOptions.map((option) => option.id)).toContain('buy-magpie');
    expect(store.visibleAutomationOptions.map((option) => option.id)).toContain('auto-flag-row');
    expect(store.visibleToolUpgradeOptions.map((option) => option.id)).toContain('scanner');
  });

  it('restoring an old save drops removed placeholder upgrades', async () => {
    window.localStorage.setItem(
      MINING_SAVE_KEY,
      JSON.stringify({
        version: 1,
        progression: {
          magpieSkillIds: ['buy-magpie', 'gold-here-row', 'pattern-automation-1'],
          ownedToolUpgradeIds: ['scanner', 'drill'],
        },
      })
    );

    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();

    expect(store.magpieSkillIds).toEqual(['buy-magpie', 'pattern-automation-1']);
    expect(store.ownedToolUpgradeIds).toEqual(['scanner']);
  });

  it('persists and restores the current mining run from local storage', async () => {
    const store = await createStore();

    store.toggleFlag({ row: 0, col: 0 });
    await store.dig({ row: 0, col: 0 });
    store.run.phase = 'town';
    store.progression.townStep = 'exchange';

    const savedPuzzleId = store.currentPuzzleId;
    const savedCoins = store.coinsTotal;
    const savedGold = store.goldTotal;
    const savedDaysLeft = store.daysLeftInMonth;
    const savedRevealed = store.revealed.map((row) => [...row]);
    await Promise.resolve();

    setActivePinia(createPinia());
    const { useMiningStore } = await import('./mining');
    const restoredStore = useMiningStore();

    await restoredStore.initialize();

    expect(restoredStore.currentPuzzleId).toBe(savedPuzzleId);
    expect(restoredStore.coinsTotal).toBe(savedCoins);
    expect(restoredStore.goldTotal).toBe(savedGold);
    expect(restoredStore.daysLeftInMonth).toBe(savedDaysLeft);
    expect(restoredStore.revealed).toEqual(savedRevealed);
    expect(restoredStore.phase).toBe('town');
    expect(restoredStore.townStep).toBe('exchange');
    expect(restoredStore.progressionMenuOpen).toBe(true);
    expect(restoredStore.showIntroModal).toBe(false);
  });

  it('clears an older unversioned save and starts fresh with a beta reset message', async () => {
    window.localStorage.setItem(
      MINING_SAVE_KEY,
      JSON.stringify({
        // No `version` field — treated as incompatible
        currentPuzzleId: 'legacy-puzzle',
        phase: 'town',
        currentLevel: 4,
        bestLevel: 2,
        coinsTotal: 3,
        goldTotal: 9,
        hasSeenIntroThisRun: true,
      })
    );

    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();

    // Legacy save was discarded — player is on a fresh board
    expect(store.currentPuzzleId).not.toBe('legacy-puzzle');
    expect(store.phase).toBe('playing');
    expect(store.currentLevel).toBe(1);
    expect(store.bestLevel).toBe(0);
    expect(store.coinsTotal).toBe(20); // starting coins
    // Beta reset message is surfaced to the player
    expect(store.lastActionMessage).toContain('beta');
    // localStorage no longer contains the old save
    expect(window.localStorage.getItem(MINING_SAVE_KEY)).not.toContain('legacy-puzzle');
  });

  it('deleting the saved game returns to a fresh board with the instructions open', async () => {
    const store = await createStore();

    store.run.phase = 'town';
    store.progression.townStep = 'exchange';
    await Promise.resolve();

    store.deleteSavedGame();
    await Promise.resolve();
    await Promise.resolve();

    expect(store.phase).toBe('playing');
    expect(store.currentPuzzleId).toBeTruthy();
    expect(store.showIntroModal).toBe(true);
    expect(store.showMonthOverModal).toBe(false);
    expect(store.progressionMenuOpen).toBe(false);
  });
});
