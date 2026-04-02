import { describe, expect, it } from 'vitest';

import { buildRegionColorClassMap } from './regionColor';

describe('buildRegionColorClassMap', () => {
  it('assigns a unique color to each unique region in first-seen order', () => {
    const colorMap = buildRegionColorClassMap([
      ['B', 'B', 'T'],
      ['I', 'T', 'K'],
      ['O', 'K', 'O'],
    ]);

    expect(colorMap.B).toBe('bg-group-red-base');
    expect(colorMap.T).toBe('bg-group-blue-base');
    expect(colorMap.I).toBe('bg-group-green-base');
    expect(colorMap.K).toBe('bg-group-yellow-base');
    expect(colorMap.O).toBe('bg-group-purple-base');
  });

  it('skips blank and placeholder regions', () => {
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
