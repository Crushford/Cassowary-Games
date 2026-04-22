import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadQueensCatalogFixture, loadQueensStoryIndexFixture } from './testPuzzleCatalog';

const puzzlesJson = loadQueensCatalogFixture();
const storyIndexJson = loadQueensStoryIndexFixture();

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
    store.campaignBucketCache = storyIndexJson.map((entry: any) => ({
      levelIndex: entry.levelIndex,
      sizeKey: entry.sizeKey,
      difficulty: entry.difficulty,
      orthogonalMinDistance: entry.orthogonalMinDistance,
      chapterId: entry.chapterId,
      chapterName: entry.chapterName,
      chapterLevelNumber: entry.chapterLevelNumber,
      chapterIntroTitle: entry.chapterIntroTitle,
      chapterIntroBody: entry.chapterIntroBody,
    })) as typeof store.campaignBucketCache;

    await store.beginCampaignRun({ showIntroModal: false });
    const currentBucket = store.currentCampaignBucket!;
    const currentTargetTime = store.getCampaignTargetTime(currentBucket);
    store.puzzleCompletionTime = currentTargetTime - 1;
    store.recordCampaignLevelResult(currentBucket, currentTargetTime - 1);
    store.isComplete = true;

    const pushSpy = vi.spyOn(router, 'push').mockResolvedValue(undefined as never);

    await store.startNextPuzzle();

    expect(pushSpy).toHaveBeenCalledWith(
      `/queens/level/${store.getCampaignBuckets()[1].levelIndex}`
    );
  }, 30000);

  it('skips missing max-distance sizes instead of routing into another puzzle family', async () => {
    const { useQueensStore } = await import('./queensStore');
    const { default: router } = await import('@/router');
    const store = useQueensStore();
    store.puzzleDatabase = puzzlesJson as typeof store.puzzleDatabase;
    store.campaignBucketCache = storyIndexJson.map((entry: any) => ({
      levelIndex: entry.levelIndex,
      sizeKey: entry.sizeKey,
      difficulty: entry.difficulty,
      orthogonalMinDistance: entry.orthogonalMinDistance,
      chapterId: entry.chapterId,
      chapterName: entry.chapterName,
      chapterLevelNumber: entry.chapterLevelNumber,
      chapterIntroTitle: entry.chapterIntroTitle,
      chapterIntroBody: entry.chapterIntroBody,
    })) as typeof store.campaignBucketCache;

    const tutorialBuckets = store
      .getCampaignBuckets()
      .filter((bucket) => bucket.difficulty === 'tutorial');
    const finalTutorialBucket = tutorialBuckets[tutorialBuckets.length - 1]!;
    const targetTime = store.getCampaignTargetTime(finalTutorialBucket);

    store.currentCampaignBucket = finalTutorialBucket;
    store.isCampaignMode = true;
    store.isComplete = true;
    store.puzzleCompletionTime = targetTime - 1;
    store.recordCampaignLevelResult(finalTutorialBucket, targetTime - 1);

    const pushSpy = vi.spyOn(router, 'push').mockResolvedValue(undefined as never);

    await store.startNextPuzzle();

    expect(pushSpy).toHaveBeenCalledWith('/queens/level/7');
  }, 30000);
});
