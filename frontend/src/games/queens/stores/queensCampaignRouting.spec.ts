import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const puzzlesJson = JSON.parse(
  readFileSync(path.resolve(dirname, '../../../../public/queens/puzzles.json'), 'utf-8')
);

describe('Queens campaign routing', () => {
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

  it('updates the route when the player advances to the next story level', async () => {
    const { useQueensStore } = await import('./queensStore');
    const { default: router } = await import('@/router');
    const store = useQueensStore();
    store.puzzleDatabase = puzzlesJson as typeof store.puzzleDatabase;

    await store.beginCampaignRun({ showIntroModal: false });
    const currentBucket = store.currentCampaignBucket!;
    const currentTargetTime = store.getCampaignTargetTime(currentBucket);
    store.puzzleCompletionTime = currentTargetTime - 1;
    store.recordCampaignLevelResult(currentBucket, currentTargetTime - 1);
    store.isComplete = true;

    const pushSpy = vi.spyOn(router, 'push').mockResolvedValue(undefined as never);

    await store.startNextPuzzle();

    expect(pushSpy).toHaveBeenCalledWith(
      `/queens/campaign/${store.getCampaignBuckets()[1].sizeKey}/${store.getCampaignBuckets()[1].difficulty}`
    );
  });
});
