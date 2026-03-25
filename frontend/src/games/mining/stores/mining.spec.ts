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
    expect(store.showIntroModal).toBe(true);
    expect(store.selectedFieldId).toBe('training-field');
    store.dismissIntro();
    await store.dig({ row: 0, col: 1 });

    expect(store.currentDepthLevel).toBe(1);
    expect(store.currentLevel).toBe(1);
    expect(store.goldTotal).toBe(19);
    expect(store.daysElapsed).toBe(1);
    expect(store.revealed[0][1]).toBe(true);
    expect(store.foundGoldCount).toBe(0);
  });

  it('opens the prototype progression structure and applies permit rewards', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    store.openProgressionMenu();
    store.setProgressionTab('permits');
    store.buyPermit('premium-permit');

    expect(store.activePermitTierId).toBe('premium-permit');
    expect(store.goldTotal).toBe(19);
    expect(store.goldRewardPerTile).toBe(8);

    await store.dig({ row: 0, col: 0 });

    expect(store.goldTotal).toBe(26);
    expect(store.foundGoldCount).toBe(1);
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

  it('warns on low gold and restarts after death while preserving prototype progression', async () => {
    const { useMiningStore } = await import('./mining');
    const store = useMiningStore();

    await store.initialize();
    store.dismissIntro();
    store.goldTotal = 11;

    await store.dig({ row: 0, col: 1 });
    expect(store.goldTotal).toBe(10);
    expect(store.warningMessage).toContain('Supplies are running low');

    store.clearWarning();
    store.goldTotal = 6;
    await store.dig({ row: 0, col: 2 });
    expect(store.goldTotal).toBe(5);
    expect(store.warningMessage).toContain("You're digging on borrowed time");

    store.buyField('standard-field');
    store.buyAutomation('buy-magpie');
    store.buyAutomation('teach-column-rule');
    store.buyPermit('better-permit');
    store.buyToolUpgrade('stronger-pick');

    expect(store.highestUnlockedDepthLevel).toBe(2);
    expect(store.selectedFieldId).toBe('standard-field');
    expect(store.activePermitTierId).toBe('better-permit');

    store.triggerDeath();

    expect(store.phase).toBe('dead');
    expect(store.showDeathModal).toBe(true);
    expect(store.hintUnlocked).toBe(true);
    expect(store.goldTotal).toBe(0);

    store.restartAfterDeath();
    await Promise.resolve();
    await Promise.resolve();

    expect(store.phase).toBe('playing');
    expect(store.highestUnlockedDepthLevel).toBe(2);
    expect(store.currentDepthLevel).toBe(1);
    expect(store.goldTotal).toBe(20);
    expect(store.selectedFieldId).toBe('standard-field');
    expect(store.activePermitTierId).toBe('better-permit');
    expect(store.magpieSkillIds).toContain('teach-column-rule');
    expect(store.ownedToolUpgradeIds).toContain('stronger-pick');
    expect(store.shownHintDepths).toEqual([]);
  });
});
