import { describe, expect, it } from 'vitest';
import {
  formatSolverDifficulty,
  isDifficultyAtOrBelow,
  normalizeSolverDifficulty,
  solverDifficultyRank,
} from './solverDifficulty';

describe('solverDifficulty', () => {
  it('normalizes invalid values to medium by default', () => {
    expect(normalizeSolverDifficulty('invalid')).toBe('medium');
  });

  it('supports custom fallback when normalizing', () => {
    expect(normalizeSolverDifficulty(undefined, 'hard')).toBe('hard');
  });

  it('formats stored values for UI labels', () => {
    expect(formatSolverDifficulty('easy')).toBe('Easy');
    expect(formatSolverDifficulty('medium')).toBe('Medium');
    expect(formatSolverDifficulty('hard')).toBe('Hard');
  });

  it('orders difficulty thresholds correctly', () => {
    expect(solverDifficultyRank('easy')).toBeLessThan(solverDifficultyRank('medium'));
    expect(solverDifficultyRank('medium')).toBeLessThan(solverDifficultyRank('hard'));
    expect(isDifficultyAtOrBelow('easy', 'hard')).toBe(true);
    expect(isDifficultyAtOrBelow('hard', 'easy')).toBe(false);
  });
});
