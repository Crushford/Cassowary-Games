import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadQueensCatalogFixture, loadQueensStoryIndexFixture } from './testPuzzleCatalog';

const puzzlesJson = loadQueensCatalogFixture();
const storyIndexJson = loadQueensStoryIndexFixture();

describe('Queens campaign story progress', () => {
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

  it('persists passed story levels and only unlocks the next level after a passing time', async () => {
    const { useQueensStore } = await import('./queensStore');
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

    const [firstEntry, secondEntry] = store.getCampaignLevelEntries();
    expect(firstEntry?.isLocked).toBe(false);
    expect(secondEntry?.isLocked).toBe(true);

    const firstTargetTime = store.getCampaignTargetTime(firstEntry.bucket);
    store.recordCampaignLevelResult(firstEntry.bucket, firstTargetTime + 5);

    let entries = store.getCampaignLevelEntries();
    expect(entries[0]).toMatchObject({
      isCompleted: false,
      isLocked: false,
      isCurrent: true,
      bestTime: firstTargetTime + 5,
    });
    expect(entries[1]?.isLocked).toBe(true);

    store.recordCampaignLevelResult(firstEntry.bucket, firstTargetTime - 1);

    entries = store.getCampaignLevelEntries();
    expect(entries[0]).toMatchObject({
      isCompleted: true,
      isLocked: false,
      isCurrent: false,
      bestTime: firstTargetTime - 1,
    });
    expect(entries[1]).toMatchObject({
      isLocked: false,
      isCurrent: true,
    });

    const reloadedStore = useQueensStore();
    expect(reloadedStore.getCampaignLevelEntries()[1]).toMatchObject({
      isLocked: false,
      isCurrent: true,
    });
  }, 30000);

  it('does not allow hints to count as a passing story attempt unless test override is enabled', async () => {
    const { useQueensStore } = await import('./queensStore');
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

    expect(store.currentCampaignBucket).not.toBeNull();

    const hintedStep = await store.requestHint();
    expect(hintedStep).not.toBeNull();
    expect(store.hasUsedCampaignHintThisAttempt).toBe(true);
    expect(store.hasPassedCurrentCampaignLevel).toBe(false);

    const targetTime = store.getCampaignTargetTime(store.currentCampaignBucket!);
    const recordedWithoutOverride = store.recordCampaignLevelResult(
      store.currentCampaignBucket!,
      targetTime - 1
    );
    expect(recordedWithoutOverride).toBe(false);

    store.allowCampaignHintPassForTesting = true;
    const recordedWithOverride = store.recordCampaignLevelResult(
      store.currentCampaignBucket!,
      targetTime - 1
    );
    expect(recordedWithOverride).toBe(true);
  }, 20000);
});
