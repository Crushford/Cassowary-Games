import { describe, expect, it } from 'vitest';

import { buildRegionColorClassMap } from './regionColor';

describe('buildRegionColorClassMap', () => {
  it('assigns a unique color to each unique region in first-seen order', () => {
    const colorMap = buildRegionColorClassMap([
      ['B', 'B', 'T'],
      ['I', 'T', 'K'],
      ['O', 'K', 'O'],
    ]);

    expect(colorMap).toEqual({
      B: 'bg-group-red-base',
      T: 'bg-group-blue-base',
      I: 'bg-group-green-base',
      K: 'bg-group-yellow-base',
      O: 'bg-group-purple-base',
    });
  });

  it('ignores blank region markers', () => {
    const colorMap = buildRegionColorClassMap([
      ['.', 'A'],
      ['', 'B'],
    ]);

    expect(colorMap).toEqual({
      A: 'bg-group-red-base',
      B: 'bg-group-blue-base',
    });
  });
});
