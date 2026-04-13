import { describe, expect, it } from 'vitest';
import {
  createCampaignStore,
  preCompleteUpToLevel,
  registerQueensStoryTestHooks,
  runLevelSlice,
} from './queensStoryMode.testSupport';
import { loadQueensStoryIndexFixture } from './testPuzzleCatalog';

const storyIndexJson = loadQueensStoryIndexFixture();
const SMOKE_STORY_LEVEL_INDEXES = [1, 3, 6, 8, 12, 17, 22, 27, 32, 36] as const;

describe('Queens story mode smoke campaign', () => {
  registerQueensStoryTestHooks();

  async function solveSingleLevel(levelIndex: number) {
    const { store, getOrderedApplicableQueensSolverSteps, campaignBuckets } =
      await createCampaignStore();
    preCompleteUpToLevel(campaignBuckets, levelIndex);

    await store.beginCampaignRun({ showIntroModal: false });
    const bucket = campaignBuckets[levelIndex - 1];
    expect(bucket, `expected story level ${levelIndex} to exist`).toBeDefined();
    expect(store.currentCampaignBucket).toEqual(bucket);
    expect(store.isCampaignFullyComplete).toBe(false);

    await runLevelSlice(store, getOrderedApplicableQueensSolverSteps, [bucket], false);
  }

  it.each(
    SMOKE_STORY_LEVEL_INDEXES.map((levelIndex) => {
      const bucket = storyIndexJson[levelIndex - 1];
      return [levelIndex, `${bucket.sizeKey} ${bucket.difficulty}`] as const;
    })
  )(
    'solves smoke story level %i (%s) via hints',
    async (levelIndex) => {
      await solveSingleLevel(levelIndex);
    },
    60000
  );
});
