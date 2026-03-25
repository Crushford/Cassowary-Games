import { describe, expect, it } from 'vitest';

import { buildAutoFlagGrid } from './autoFlag';

describe('buildAutoFlagGrid', () => {
  it('flags same row, same column, and immediate diagonals while leaving found gold untouched', () => {
    const revealed = Array.from({ length: 5 }, () => Array(5).fill(false));
    revealed[2][2] = true;

    const flagged = buildAutoFlagGrid([{ row: 2, col: 2 }], revealed, 5);

    expect(flagged).toEqual([
      [false, false, true, false, false],
      [false, true, true, true, false],
      [true, true, false, true, true],
      [false, true, true, true, false],
      [false, false, true, false, false],
    ]);
  });

  it('does not flag already revealed cells', () => {
    const revealed = Array.from({ length: 5 }, () => Array(5).fill(false));
    revealed[1][1] = true;
    revealed[1][3] = true;

    const flagged = buildAutoFlagGrid([{ row: 1, col: 2 }], revealed, 5);

    expect(flagged[1][1]).toBe(false);
    expect(flagged[1][3]).toBe(false);
    expect(flagged[1][2]).toBe(false);
  });
});
