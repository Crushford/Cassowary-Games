import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const puzzlesJson = JSON.parse(
  readFileSync(path.resolve(dirname, '../../../../public/queens/puzzles.json'), 'utf-8')
);

describe('Queens shared level best times', () => {
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

  it('shares the same best time between story mode and single puzzle mode for the same size and difficulty', async () => {
    const { useQueensStore } = await import('./queensStore');
    const store = useQueensStore();
    store.puzzleDatabase = puzzlesJson as typeof store.puzzleDatabase;

    const levelEntries = store.getCampaignLevelEntries();
    const firstEntry = levelEntries[0];
    const storyTime = store.getCampaignTargetTime(firstEntry.bucket) - 2;

    store.recordCampaignLevelResult(firstEntry.bucket, storyTime);

    expect(store.getCampaignLevelEntries()[0]?.bestTime).toBe(storyTime);
    expect(store.getBestTimeForSizeAndDifficulty('4x4', 'tutorial')).toBe(storyTime);

    const sameLevelPuzzle = store.getPuzzlesForSelection(
      firstEntry.bucket.sizeKey,
      firstEntry.bucket.orthogonalMinDistance,
      firstEntry.bucket.difficulty
    )[0];

    store.parsePuzzleData(sameLevelPuzzle);

    expect(store.puzzleBestTime).toBe(storyTime);
  });
});
