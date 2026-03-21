import { describe, expect, it } from 'vitest';
import type { GridSquare, MarkType } from '../types/types';
import { buildIncrementalAutomationPlan } from './incrementalAutomation';

function makeGrid(colors: string[][]): GridSquare[][] {
  return colors.map((row, r) =>
    row.map((groupColor, c) => ({
      position: { row: r, col: c },
      groupColor,
    }))
  );
}

describe('buildIncrementalAutomationPlan auto-queen', () => {
  it('auto-places by color only when one square is unmarked and all others in the group are flagged', () => {
    const grid = makeGrid([
      ['red', 'red', 'blue'],
      ['green', 'yellow', 'blue'],
      ['green', 'yellow', 'purple'],
    ]);
    const marks: MarkType[][] = [
      [null, 'flag', null],
      [null, null, null],
      [null, null, null],
    ];

    const result = buildIncrementalAutomationPlan({
      grid,
      initialMarks: marks,
      patternCards: [],
      autoQueenRules: { byColor: true, byRow: false, byColumn: false },
    });

    expect(result.actions).toContainEqual({ type: 'queen', row: 0, col: 0 });
  });

  it('does not auto-place by color when one of the other squares is not flagged', () => {
    const grid = makeGrid([
      ['red', 'red', 'blue'],
      ['green', 'yellow', 'blue'],
      ['green', 'yellow', 'purple'],
    ]);
    const marks: MarkType[][] = [
      [null, 'queen', null],
      [null, null, null],
      [null, null, null],
    ];

    const result = buildIncrementalAutomationPlan({
      grid,
      initialMarks: marks,
      patternCards: [],
      autoQueenRules: { byColor: true, byRow: false, byColumn: false },
    });

    expect(result.actions).not.toContainEqual({ type: 'queen', row: 0, col: 0 });
  });
});
