import { describe, expect, it } from 'vitest';

import { buildQuartzTruthGrid } from './quartzTruth';

describe('buildQuartzTruthGrid', () => {
  it('marks row, column, and adjacent diagonal exclusions for the full hidden gold layout', () => {
    const quartz = buildQuartzTruthGrid(
      [
        { row: 0, col: 0 },
        { row: 1, col: 2 },
      ],
      5
    );

    expect(quartz[0][0]).toBe(false);
    expect(quartz[1][2]).toBe(false);
    expect(quartz[0][1]).toBe(true);
    expect(quartz[1][0]).toBe(true);
    expect(quartz[1][1]).toBe(true);
    expect(quartz[2][3]).toBe(true);
  });
});
