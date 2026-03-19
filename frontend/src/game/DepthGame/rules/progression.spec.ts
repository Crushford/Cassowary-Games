import { describe, expect, it } from 'vitest';

import { isLevelComplete } from './progression';

describe('isLevelComplete', () => {
  it('returns true when currentRound equals the required rounds', () => {
    expect(isLevelComplete(3, 3)).toBe(true);
  });

  it('returns true when currentRound exceeds the required rounds', () => {
    expect(isLevelComplete(4, 3)).toBe(true);
  });

  it('returns false when currentRound is less than the required rounds', () => {
    expect(isLevelComplete(2, 3)).toBe(false);
  });

  it('returns false for round 1 of a 3-round level', () => {
    expect(isLevelComplete(1, 3)).toBe(false);
  });

  it('returns true for a single-round level after round 1', () => {
    expect(isLevelComplete(1, 1)).toBe(true);
  });
});
