import { describe, expect, it } from 'vitest';

import { convertQueensPuzzleToMiningBoard } from './convertQueensPuzzleToMiningBoard';

describe('convertQueensPuzzleToMiningBoard', () => {
  it('maps queen positions to hidden gold cells on a 5x5 board', () => {
    const board = convertQueensPuzzleToMiningBoard({
      id: '5x5-test-0',
      layout: 'ABCDEFGHIJKLMNOPQRSTUVWXY',
      queens: 'Q......Q......Q.Q......Q.',
    });

    expect(board.size).toBe(5);
    expect(board.truthGold).toEqual([
      [true, false, false, false, false],
      [false, false, true, false, false],
      [false, false, false, false, true],
      [false, true, false, false, false],
      [false, false, false, true, false],
    ]);
  });

  it('rejects non-5x5 puzzle payloads', () => {
    expect(() =>
      convertQueensPuzzleToMiningBoard({
        id: '4x4-test-0',
        layout: 'ABCDEFGHIJKLMNOP',
        queens: 'Q....Q....Q....Q',
      })
    ).toThrow('Mining expects a 5x5 Queens puzzle');
  });
});
