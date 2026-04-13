import { describe, expect, it } from 'vitest';

import { restoreMiningState } from './miningPersistence';
import { createInitialMiningState } from './miningState';

function createBooleanGrid(size: number, fill = false): boolean[][] {
  return Array.from({ length: size }, () => Array<boolean>(size).fill(fill));
}

function createRegionGrid(size: number): string[][] {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => String.fromCharCode(65 + ((row * size + col) % 26)))
  );
}

describe('miningPersistence', () => {
  it('restores saved board grids using the saved board size instead of the default 5x5 fallback', () => {
    const state = createInitialMiningState();

    restoreMiningState(state, {
      version: 5,
      board: {
        boardSize: 6,
        currentPuzzleId: 'mining-6x6',
        truthGold: createBooleanGrid(6, false),
        regionIds: createRegionGrid(6),
        revealed: createBooleanGrid(6, false),
        playerFlags: Array.from({ length: 6 }, () => Array(6).fill(null)),
        systemFlags: Array.from({ length: 6 }, () => Array(6).fill(null)),
      },
      run: {
        phase: 'playing',
      },
    });

    expect(state.board.boardSize).toBe(6);
    expect(state.board.truthGold).toHaveLength(6);
    expect(state.board.regionIds).toHaveLength(6);
    expect(state.board.revealed).toHaveLength(6);
    expect(state.board.playerFlags).toHaveLength(6);
    expect(state.board.systemFlags).toHaveLength(6);
    expect(state.board.playerFlags[5]).toHaveLength(6);
    expect(state.board.systemFlags[5]).toHaveLength(6);
  });
});
