import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const puzzlesJson = JSON.parse(
  readFileSync(path.resolve(dirname, '../../../../public/queens/puzzles.json'), 'utf-8')
);

describe('Queens campaign level selector entries', () => {
  beforeEach(() => {
    const storage = (() => {
      const store = new Map<string, string>();
      return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      };
    })();

    const location = {
      pathname: '/',
      search: '',
      hash: '',
      host: 'localhost',
      protocol: 'http:',
    };
    const history = {
      state: null,
      replaceState: () => undefined,
      pushState: () => undefined,
    };

    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('location', location);
    vi.stubGlobal('history', history);
    vi.stubGlobal('window', {
      localStorage: storage,
      location,
      history,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
    });

    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('builds linear selector entries from campaign progression state', async () => {
    const { useQueensStore } = await import('./queensStore');
    const store = useQueensStore();

    store.puzzleDatabase = puzzlesJson as typeof store.puzzleDatabase;

    const initialEntries = store.getCampaignLevelEntries();

    expect(initialEntries.length).toBeGreaterThan(0);
    expect(initialEntries[0]).toMatchObject({
      levelNumber: 1,
      boardSize: '4x4',
      difficulty: 'tutorial',
      isLocked: false,
      isCompleted: false,
      isCurrent: true,
    });
    expect(initialEntries[1]?.isLocked).toBe(true);
    expect(initialEntries[1]?.isCurrent).toBe(false);

    const firstBucket = initialEntries[0].bucket;
    store.recordCampaignLevelResult(firstBucket, store.getCampaignTargetTime(firstBucket) - 1);

    const progressedEntries = store.getCampaignLevelEntries();

    expect(progressedEntries[0]).toMatchObject({
      isLocked: false,
      isCompleted: true,
      isCurrent: false,
    });
    expect(progressedEntries[1]).toMatchObject({
      levelNumber: 2,
      isLocked: false,
      isCompleted: false,
      isCurrent: true,
    });
    expect(progressedEntries[2]?.isLocked).toBe(true);
  });
});
