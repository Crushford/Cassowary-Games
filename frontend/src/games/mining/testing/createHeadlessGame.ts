/**
 * Headless game factory for use in integration tests.
 *
 * Injects puzzle fixtures directly instead of going through fetch, so tests
 * run without any I/O and the puzzle sequence is fully deterministic.
 *
 * Usage:
 *   const game = await createHeadlessGame({ puzzles: [PUZZLE_A, PUZZLE_B] });
 *   await game.digAllGold();
 *   await game.completeTownSequence();
 *   expect(game.store.phase).toBe('playing');
 *   game.cleanup();
 */

import { createPinia, setActivePinia } from 'pinia';

import type { MiningPuzzleRecord } from '../game/types';
import { __resetPuzzleLoaderForTests, __setPuzzleLoaderForTests } from '../stores/miningRunService';

export interface HeadlessGameOptions {
  /** Puzzles to serve in order. After the queue is exhausted, loops back to the first. */
  puzzles: MiningPuzzleRecord[];
}

export async function createHeadlessGame(opts: HeadlessGameOptions) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const fixtureQueue = [...opts.puzzles];
  __setPuzzleLoaderForTests(async () => {
    return fixtureQueue.length > 0 ? (fixtureQueue.shift() as MiningPuzzleRecord) : opts.puzzles[0];
  });

  const { useMiningStore } = await import('../stores/mining');
  const store = useMiningStore();

  await store.initialize();
  store.dismissIntro();

  function getGoldPositions() {
    const positions: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < store.boardSize; row += 1) {
      for (let col = 0; col < store.boardSize; col += 1) {
        if (store.truthGold[row][col]) {
          positions.push({ row, col });
        }
      }
    }
    return positions;
  }

  return {
    store,

    /** Flag and dig every gold tile. Does not complete the field (non-gold tiles remain). */
    async digAllGold() {
      const positions = getGoldPositions();
      for (const pos of positions) {
        if (!store.revealed[pos.row][pos.col]) {
          store.toggleFlag(pos);
          await store.dig(pos);
        }
      }
    },

    /**
     * Dig every tile on the board, completing the field.
     * Digs gold first (requires flags), then non-gold freely once all gold is found.
     */
    async digEntireField() {
      await this.digAllGold();
      if (store.foundGoldCount === store.boardSize) {
        for (let row = 0; row < store.boardSize; row += 1) {
          for (let col = 0; col < store.boardSize; col += 1) {
            if (!store.revealed[row][col] && store.phase === 'playing') {
              await store.dig({ row, col });
            }
          }
        }
      }
    },

    /**
     * Run the standard town sequence in order:
     * dismiss modal → exchange gold → pay food → skip trainer → skip tools → begin next month.
     *
     * Requires at least 1 coin for food upkeep. Override individual steps if needed.
     */
    async completeTownSequence() {
      store.dismissMonthOverModal();
      store.exchangeGoldForCoins();
      store.continueTownSequence(); // exchange → food-shop
      store.buyFood();
      store.continueTownSequence(); // food-shop → magpie-trainer
      store.continueTownSequence(); // magpie-trainer → tool-store
      store.continueTownSequence(); // tool-store → begin next month
    },

    /** Reset puzzle loader to the real implementation. Call in afterEach. */
    cleanup() {
      __resetPuzzleLoaderForTests();
    },
  };
}
