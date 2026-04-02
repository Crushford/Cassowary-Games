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
    expect(board.regionIds[0]).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('accepts larger queens payloads for bigger mining plots', () => {
    const board = convertQueensPuzzleToMiningBoard({
      id: '6x6-test-0',
      layout: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      queens: ['Q.....', '..Q...', '....Q.', '.Q....', '...Q..', '.....Q'].join(''),
    });

    expect(board.size).toBe(6);
    expect(board.truthGold[5][5]).toBe(true);
    expect(board.regionIds[0]).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('rejects unsupported puzzle payloads', () => {
    expect(() =>
      convertQueensPuzzleToMiningBoard({
        id: '4x4-test-0',
        layout: 'ABCDEFGHIJKLMNOP',
        queens: 'Q....Q....Q....Q',
      })
    ).toThrow('Mining expects a 5x5 through 9x9 Queens puzzle');
  });
});
