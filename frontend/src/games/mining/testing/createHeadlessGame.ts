import { createPinia, setActivePinia } from 'pinia';

import type { MiningPuzzleRecord } from '../game/types';
import { __resetPuzzleLoaderForTests, __setPuzzleLoaderForTests } from '../stores/miningRunService';

export interface HeadlessGameOptions {
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
  store.dismissLevelIntro();

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

  function getEmptyPositions() {
    const positions: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < store.boardSize; row += 1) {
      for (let col = 0; col < store.boardSize; col += 1) {
        if (!store.truthGold[row][col]) {
          positions.push({ row, col });
        }
      }
    }
    return positions;
  }

  return {
    store,

    async digAllGold() {
      const positions = getGoldPositions();
      for (const pos of positions) {
        if (!store.revealed[pos.row][pos.col]) {
          store.toggleFlag(pos);
          await store.dig(pos);
        }
      }
    },

    async digEmptySquares(count: number) {
      const positions = getEmptyPositions().slice(0, count);
      for (const pos of positions) {
        if (!store.revealed[pos.row][pos.col]) {
          store.toggleFlag(pos);
          await store.dig(pos);
        }
      }
    },

    cleanup() {
      __resetPuzzleLoaderForTests();
    },
  };
}
