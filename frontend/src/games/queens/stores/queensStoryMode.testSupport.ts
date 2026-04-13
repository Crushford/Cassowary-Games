import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { loadQueensCatalogFixture, loadQueensStoryIndexFixture } from './testPuzzleCatalog';

const puzzlesJson = loadQueensCatalogFixture();
const storyIndexJson = loadQueensStoryIndexFixture();

const STORY_PROGRESS_KEY = 'queens-story-progress-v1';

function snapshotBoardGroups(
  grid: Awaited<ReturnType<typeof import('./queensStore').useQueensStore>>['grid']
): string[] {
  return grid.map((row) => row.map((cell) => cell.groupColor ?? '.').join(''));
}

function snapshotPlayerMarks(
  playerMarks: Awaited<ReturnType<typeof import('./queensStore').useQueensStore>>['playerMarks']
): string[] {
  return playerMarks.map((row) =>
    row
      .map((mark) => {
        if (mark === 'queen') return 'Q';
        if (mark === 'flag') return 'F';
        if (mark === 'invalid') return 'X';
        return '.';
      })
      .join('')
  );
}

function collectMarkedPositions(
  playerMarks: Awaited<ReturnType<typeof import('./queensStore').useQueensStore>>['playerMarks'],
  markType: 'queen' | 'flag'
) {
  const positions: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < playerMarks.length; row++) {
    for (let col = 0; col < (playerMarks[row]?.length ?? 0); col++) {
      if (playerMarks[row]?.[col] === markType) {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

function buildHeadlessNoHintDebugPayload(
  store: Awaited<ReturnType<typeof import('./queensStore').useQueensStore>>,
  bucket: { levelIndex: number; sizeKey: string; difficulty: string },
  hintCount: number,
  orderedApplicableSteps: Awaited<
    ReturnType<typeof import('../solver/stagedSolver').getOrderedApplicableQueensSolverSteps>
  >
) {
  return {
    storyLevel: {
      levelIndex: bucket.levelIndex,
      sizeKey: bucket.sizeKey,
      difficulty: bucket.difficulty,
    },
    hintCount,
    puzzleId: store.currentPuzzleId,
    puzzleDifficulty: store.currentPuzzle?.difficulty ?? null,
    gridSize: store.gridSize,
    targetQueenCount: store.targetQueenCount,
    orthogonalMinDistance: store.orthogonalMinDistance,
    isComplete: store.isComplete,
    boardGroups: snapshotBoardGroups(store.grid),
    boardMarks: snapshotPlayerMarks(store.playerMarks),
    placedQueens: collectMarkedPositions(store.playerMarks, 'queen'),
    flaggedSquares: collectMarkedPositions(store.playerMarks, 'flag'),
    orderedApplicableSteps: orderedApplicableSteps.map((step) => ({
      stepId: step.stepId,
      difficultyTier: step.difficultyTier,
      outputCells: step.outputCells,
      evidenceCells: step.evidenceCells,
      changeCount: step.changes.length,
      hasPatternPreview: !!step.patternPreview,
    })),
  };
}

export function registerQueensStoryTestHooks(): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'performance'] });
    vi.spyOn(Math, 'random').mockReturnValue(0);

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

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
}

export function buildStoryBuckets() {
  return storyIndexJson.map((entry: any) => ({
    levelIndex: entry.levelIndex,
    sizeKey: entry.sizeKey,
    difficulty: entry.difficulty,
    orthogonalMinDistance: entry.orthogonalMinDistance,
    chapterId: entry.chapterId,
    chapterName: entry.chapterName,
    chapterLevelNumber: entry.chapterLevelNumber,
    chapterIntroTitle: entry.chapterIntroTitle,
    chapterIntroBody: entry.chapterIntroBody,
  }));
}

export function preCompleteUpToLevel(
  buckets: { levelIndex: number; sizeKey: string; difficulty: string }[],
  startFromLevelIndex: number
) {
  const passedLevelBestTimes: Record<string, number> = {};
  for (const bucket of buckets) {
    if (bucket.levelIndex < startFromLevelIndex) {
      passedLevelBestTimes[`${bucket.sizeKey}|${bucket.difficulty}`] = 10;
    }
  }

  localStorage.setItem(
    STORY_PROGRESS_KEY,
    JSON.stringify({
      unlockedLevelIndex: startFromLevelIndex,
      passedLevelBestTimes,
      levelBestTimes: {},
    })
  );
}

export async function createCampaignStore() {
  const { useQueensStore } = await import('./queensStore');
  const { getOrderedApplicableQueensSolverSteps } = await import('../solver/stagedSolver');
  const store = useQueensStore();

  store.puzzleDatabase = puzzlesJson as typeof store.puzzleDatabase;
  store.campaignBucketCache = buildStoryBuckets() as typeof store.campaignBucketCache;
  store.allowCampaignHintPassForTesting = true;
  const campaignBuckets = store.getCampaignBuckets();

  expect(campaignBuckets).toHaveLength(37);
  expect(
    campaignBuckets.slice(0, 6).map((bucket) => `${bucket.sizeKey}|${bucket.difficulty}`)
  ).toEqual([
    '4x4|tutorial',
    '5x5|tutorial',
    '6x6|tutorial',
    '7x7|tutorial',
    '8x8|tutorial',
    '9x9|tutorial',
  ]);
  expect(
    campaignBuckets.some((bucket) => bucket.sizeKey === '4x4' && bucket.difficulty === 'extra-easy')
  ).toBe(true);

  return { store, getOrderedApplicableQueensSolverSteps, campaignBuckets };
}

export async function runLevelSlice(
  store: Awaited<ReturnType<typeof import('./queensStore').useQueensStore>>,
  getOrderedApplicableQueensSolverSteps: typeof import('../solver/stagedSolver').getOrderedApplicableQueensSolverSteps,
  bucketSlice: ReturnType<typeof store.getCampaignBuckets>,
  isLastSlice: boolean
) {
  for (const [index, bucket] of bucketSlice.entries()) {
    console.log(
      `[story-test] entering level ${bucket.levelIndex}: ${bucket.sizeKey} ${bucket.difficulty}`
    );
    expect(store.currentCampaignBucket).toEqual(bucket);
    expect(store.isCampaignMode).toBe(true);
    expect(store.isCampaignFullyComplete).toBe(false);
    expect(store.currentPuzzle).not.toBeNull();
    expect(store.gridSize).toBe(Number.parseInt(bucket.sizeKey, 10));
    expect(store.currentPuzzle?.difficulty).toBe(bucket.difficulty);

    let hintCount = 0;
    while (!store.isComplete) {
      if (hintCount === 0) {
        const solverState = {
          grid: store.grid,
          playerMarks: store.playerMarks,
          gridSize: store.gridSize,
          targetQueenCount: store.targetQueenCount,
          orthogonalMinDistance: store.orthogonalMinDistance,
        };
        const applicableSteps = getOrderedApplicableQueensSolverSteps(
          solverState,
          bucket.difficulty
        );
        expect(
          applicableSteps.length,
          `expected an applicable hint for level ${bucket.levelIndex}`
        ).toBeGreaterThan(0);
        const firstStep = await store.requestHint();
        if (!firstStep) {
          console.error(
            '[story-test] requestHint returned null',
            buildHeadlessNoHintDebugPayload(store, bucket, hintCount, applicableSteps)
          );
        }
        expect(firstStep, `expected a hint step for level ${bucket.levelIndex}`).not.toBeNull();
        expect(firstStep?.stepId).toBe(applicableSteps[0]?.stepId);
        hintCount += 1;
        continue;
      }

      const previousHistoryLength = store.moveHistory.length;
      const step = await store.requestHint();
      expect(step, `expected a hint step for level ${bucket.levelIndex}`).not.toBeNull();
      expect(store.moveHistory.length).toBe(previousHistoryLength + 1);
      hintCount += 1;
      if (hintCount % 10 === 0) {
        console.log(
          `[story-test] level ${bucket.levelIndex} hints=${hintCount} lastStep=${step?.stepId ?? 'none'} difficulty=${step?.difficultyTier ?? 'none'}`
        );
        await new Promise((r) => setTimeout(r, 0));
      }
      expect(hintCount).toBeLessThan(512);
    }

    console.log(`[story-test] completed level ${bucket.levelIndex} with ${hintCount} hints`);
    expect(hintCount).toBeGreaterThan(0);
    expect(store.isComplete).toBe(true);
    expect(store.currentPuzzleId).not.toBeNull();
    expect(store.isPuzzleCompleted(String(store.currentPuzzleId))).toBe(true);
    expect(store.puzzleCompletionTime).not.toBeNull();

    const isLastInSlice = index === bucketSlice.length - 1;
    const isLastLevelOverall = isLastSlice && isLastInSlice;

    if (!isLastLevelOverall) {
      const advanceResult = await store.advanceCampaign({ showIntroModal: false });
      expect(advanceResult).not.toBe(null);
      if (!isLastInSlice) {
        expect(store.currentCampaignBucket).toEqual(bucketSlice[index + 1]);
        expect(store.isCampaignFullyComplete).toBe(false);
      }
    } else {
      expect(store.nextCampaignBucket).toBe(null);
      const completionResult = await store.advanceCampaign({ showIntroModal: false });
      expect(completionResult).toBe(null);
    }
  }
}
