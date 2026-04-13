import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compareSharedSolverDifficulty } from '../solver/sharedSolverConfig';
import { loadQueensCatalogFixture } from './testPuzzleCatalog';

const puzzlesJson = loadQueensCatalogFixture();

describe('Queens story mode headless campaign', () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.restoreAllMocks();
  });

  it('completes_entire_story_mode_via_hints', async () => {
    const { useQueensStore } = await import('./queensStore');
    const { getOrderedApplicableQueensSolverSteps } = await import('../solver/stagedSolver');
    const store = useQueensStore();

    store.puzzleDatabase = puzzlesJson as typeof store.puzzleDatabase;
    store.allowCampaignHintPassForTesting = true;
    const campaignBuckets = store.getCampaignBuckets();

    expect(campaignBuckets.length).toBeGreaterThan(0);

    await store.beginCampaignRun({ showIntroModal: false });

    expect(store.isCampaignMode).toBe(true);
    expect(store.currentCampaignBucket).toEqual(campaignBuckets[0]);
    expect(store.isCampaignFullyComplete).toBe(false);
    expect(store.showCampaignIntroModal).toBe(false);

    for (const [index, bucket] of campaignBuckets.entries()) {
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
        // On the first hint of each level, verify requestHint returns the same
        // step as the ordered solver — checks the ordering contract once per level
        // without doubling solver calls on every subsequent hint.
        if (hintCount === 0) {
          const applicableSteps = getOrderedApplicableQueensSolverSteps(
            {
              grid: store.grid,
              playerMarks: store.playerMarks,
              gridSize: store.gridSize,
              targetQueenCount: store.targetQueenCount,
              orthogonalMinDistance: store.orthogonalMinDistance,
            },
            bucket.difficulty
          );
          expect(
            applicableSteps.length,
            `expected an applicable hint for level ${bucket.levelIndex}`
          ).toBeGreaterThan(0);
          const firstStep = await store.requestHint();
          expect(firstStep, `expected a hint step for level ${bucket.levelIndex}`).not.toBeNull();
          expect(firstStep?.stepId).toBe(applicableSteps[0]?.stepId);
          expect(
            compareSharedSolverDifficulty(firstStep!.difficultyTier, bucket.difficulty),
            `hint ${firstStep?.stepId} exceeded puzzle difficulty ${bucket.difficulty} on level ${bucket.levelIndex}`
          ).toBeLessThanOrEqual(0);
          hintCount += 1;
          continue;
        }

        const previousHistoryLength = store.moveHistory.length;
        const step = await store.requestHint();
        expect(step, `expected a hint step for level ${bucket.levelIndex}`).not.toBeNull();
        expect(
          compareSharedSolverDifficulty(step!.difficultyTier, bucket.difficulty),
          `hint ${step?.stepId} exceeded puzzle difficulty ${bucket.difficulty} on level ${bucket.levelIndex}`
        ).toBeLessThanOrEqual(0);
        expect(store.moveHistory.length).toBe(previousHistoryLength + 1);
        hintCount += 1;
        if (hintCount % 25 === 0) {
          console.log(
            `[story-test] level ${bucket.levelIndex} hints=${hintCount} lastStep=${step?.stepId ?? 'none'} difficulty=${step?.difficultyTier ?? 'none'}`
          );
        }
        expect(hintCount).toBeLessThan(512);
      }

      console.log(`[story-test] completed level ${bucket.levelIndex} with ${hintCount} hints`);
      expect(hintCount).toBeGreaterThan(0);
      expect(store.isComplete).toBe(true);
      expect(store.currentPuzzleId).not.toBeNull();
      expect(store.isPuzzleCompleted(String(store.currentPuzzleId))).toBe(true);
      expect(store.puzzleCompletionTime).not.toBeNull();

      const isLastLevel = index === campaignBuckets.length - 1;
      if (!isLastLevel) {
        expect(store.canAdvanceCampaign).toBe(true);
        await store.advanceCampaign({ showIntroModal: false });
        expect(store.currentCampaignBucket).toEqual(campaignBuckets[index + 1]);
        expect(store.isCampaignFullyComplete).toBe(false);
      } else {
        expect(store.nextCampaignBucket).toBe(null);
        const completionResult = await store.advanceCampaign({ showIntroModal: false });
        expect(completionResult).toBe(null);
      }
    }

    expect(store.isCampaignFullyComplete).toBe(true);
    expect(store.nextCampaignBucket).toBe(null);
    expect(store.currentCampaignBucket).toEqual(campaignBuckets[campaignBuckets.length - 1]);
  }, 180000);
});
