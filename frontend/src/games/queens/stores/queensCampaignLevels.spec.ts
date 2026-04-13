import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadQueensCatalogFixture, loadQueensStoryIndexFixture } from './testPuzzleCatalog';

const puzzlesJson = loadQueensCatalogFixture();
const storyIndexJson = loadQueensStoryIndexFixture();

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
    store.campaignBucketCache = storyIndexJson.map((entry: any) => ({
      levelIndex: entry.levelIndex,
      sizeKey: entry.sizeKey,
      difficulty: entry.difficulty,
      orthogonalMinDistance: entry.orthogonalMinDistance,
      chapterId: entry.chapterId ?? 'honey-pot-ant-farming',
      chapterName: entry.chapterName ?? 'Honey Pot Ant Farming',
      chapterLevelNumber: entry.chapterLevelNumber ?? entry.levelIndex,
      chapterIntroTitle: entry.chapterIntroTitle,
      chapterIntroBody: entry.chapterIntroBody,
    })) as typeof store.campaignBucketCache;

    const initialEntries = store.getCampaignLevelEntries();

    expect(initialEntries.length).toBeGreaterThan(0);
    expect(initialEntries[0]).toMatchObject({
      levelNumber: 1,
      chapterId: 'honey-pot-ant-farming',
      chapterName: 'Honey Pot Ant Farming',
      chapterLevelNumber: 1,
      boardSize: '4x4',
      difficulty: 'tutorial',
      isLocked: false,
      isCompleted: false,
      isCurrent: true,
    });
    expect(
      initialEntries.slice(0, 6).map((entry) => `${entry.boardSize}|${entry.difficulty}`)
    ).toEqual([
      '4x4|tutorial',
      '5x5|tutorial',
      '6x6|tutorial',
      '7x7|tutorial',
      '8x8|tutorial',
      '9x9|tutorial',
    ]);
    expect(
      initialEntries.some((entry) => entry.boardSize === '4x4' && entry.difficulty === 'extra-easy')
    ).toBe(true);
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
  }, 30000);

  it('groups levels into chapters and shows a locked future chapter teaser', async () => {
    const { useQueensStore } = await import('./queensStore');
    const store = useQueensStore();

    store.puzzleDatabase = puzzlesJson as typeof store.puzzleDatabase;
    store.campaignBucketCache = storyIndexJson.map((entry: any) => ({
      levelIndex: entry.levelIndex,
      sizeKey: entry.sizeKey,
      difficulty: entry.difficulty,
      orthogonalMinDistance: entry.orthogonalMinDistance,
      chapterId: entry.chapterId ?? 'honey-pot-ant-farming',
      chapterName: entry.chapterName ?? 'Honey Pot Ant Farming',
      chapterLevelNumber: entry.chapterLevelNumber ?? entry.levelIndex,
      chapterIntroTitle: entry.chapterIntroTitle,
      chapterIntroBody: entry.chapterIntroBody,
    })) as typeof store.campaignBucketCache;

    const chapters = store.getCampaignChapterEntries();

    expect(chapters[0]).toMatchObject({
      chapterId: 'honey-pot-ant-farming',
      chapterName: 'Honey Pot Ant Farming',
      isLocked: false,
      isCurrent: true,
    });
    expect(chapters[0]?.levels[0]).toMatchObject({
      chapterLevelNumber: 1,
      boardSize: '4x4',
      difficulty: 'tutorial',
    });
    expect(chapters[1]).toMatchObject({
      chapterId: 'coming-soon',
      chapterName: 'Next Chapter',
      isLocked: true,
    });
    expect(chapters[1]?.levels).toEqual([]);
  }, 30000);
});
