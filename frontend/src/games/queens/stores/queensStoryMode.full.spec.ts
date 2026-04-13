import { describe, expect, it } from 'vitest';
import {
  createCampaignStore,
  preCompleteUpToLevel,
  registerQueensStoryTestHooks,
  runLevelSlice,
} from './queensStoryMode.testSupport';

describe('Queens story mode full campaign', () => {
  registerQueensStoryTestHooks();

  it('completes campaign levels 1-13 (tutorial + extra-easy) via hints', async () => {
    const { store, getOrderedApplicableQueensSolverSteps, campaignBuckets } =
      await createCampaignStore();

    await store.beginCampaignRun({ showIntroModal: false });
    expect(store.currentCampaignBucket).toEqual(campaignBuckets[0]);
    expect(store.isCampaignFullyComplete).toBe(false);

    await runLevelSlice(
      store,
      getOrderedApplicableQueensSolverSteps,
      campaignBuckets.slice(0, 13),
      false
    );
  }, 180000);

  it('completes campaign levels 14-25 (easy + medium) via hints', async () => {
    const { store, getOrderedApplicableQueensSolverSteps, campaignBuckets } =
      await createCampaignStore();

    preCompleteUpToLevel(campaignBuckets, 14);

    await store.beginCampaignRun({ showIntroModal: false });
    expect(store.currentCampaignBucket).toEqual(campaignBuckets[13]);
    expect(store.isCampaignFullyComplete).toBe(false);

    await runLevelSlice(
      store,
      getOrderedApplicableQueensSolverSteps,
      campaignBuckets.slice(13, 25),
      false
    );
  }, 180000);

  it('completes campaign levels 26-33 (hard) via hints', async () => {
    const { store, getOrderedApplicableQueensSolverSteps, campaignBuckets } =
      await createCampaignStore();

    preCompleteUpToLevel(campaignBuckets, 26);

    await store.beginCampaignRun({ showIntroModal: false });
    expect(store.currentCampaignBucket).toEqual(campaignBuckets[25]);
    expect(store.isCampaignFullyComplete).toBe(false);

    await runLevelSlice(
      store,
      getOrderedApplicableQueensSolverSteps,
      campaignBuckets.slice(25, 33),
      false
    );
  }, 180000);

  it('completes campaign levels 34-37 (extra-hard) to full completion', async () => {
    const { store, getOrderedApplicableQueensSolverSteps, campaignBuckets } =
      await createCampaignStore();

    preCompleteUpToLevel(campaignBuckets, 34);

    await store.beginCampaignRun({ showIntroModal: false });
    expect(store.currentCampaignBucket).toEqual(campaignBuckets[33]);
    expect(store.isCampaignFullyComplete).toBe(false);

    await runLevelSlice(
      store,
      getOrderedApplicableQueensSolverSteps,
      campaignBuckets.slice(33),
      true
    );

    expect(store.isCampaignFullyComplete).toBe(true);
    expect(store.nextCampaignBucket).toBe(null);
    expect(store.currentCampaignBucket).toEqual(campaignBuckets[campaignBuckets.length - 1]);
  }, 180000);
});
