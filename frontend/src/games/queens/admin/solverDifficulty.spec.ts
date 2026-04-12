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
    expect(formatSolverDifficulty('extra-easy')).toBe('Extra Easy');
    expect(formatSolverDifficulty('easy')).toBe('Easy');
    expect(formatSolverDifficulty('medium')).toBe('Medium');
    expect(formatSolverDifficulty('hard')).toBe('Hard');
    expect(formatSolverDifficulty('extra-hard')).toBe('Extra Hard');
    expect(formatSolverDifficulty('unsolvable')).toBe('Unsolvable');
  });

  it('orders difficulty thresholds correctly', () => {
    expect(solverDifficultyRank('extra-easy')).toBeLessThan(solverDifficultyRank('easy'));
    expect(solverDifficultyRank('easy')).toBeLessThan(solverDifficultyRank('medium'));
    expect(solverDifficultyRank('medium')).toBeLessThan(solverDifficultyRank('hard'));
    expect(solverDifficultyRank('hard')).toBeLessThan(solverDifficultyRank('extra-hard'));
    expect(solverDifficultyRank('extra-hard')).toBeLessThan(solverDifficultyRank('unsolvable'));
    expect(isDifficultyAtOrBelow('extra-easy', 'easy')).toBe(true);
    expect(isDifficultyAtOrBelow('easy', 'extra-easy')).toBe(false);
    expect(isDifficultyAtOrBelow('easy', 'hard')).toBe(true);
    expect(isDifficultyAtOrBelow('hard', 'easy')).toBe(false);
    expect(isDifficultyAtOrBelow('extra-hard', 'hard')).toBe(false);
    expect(isDifficultyAtOrBelow('hard', 'extra-hard')).toBe(true);
    expect(isDifficultyAtOrBelow('unsolvable', 'hard')).toBe(false);
    expect(isDifficultyAtOrBelow('hard', 'unsolvable')).toBe(true);
  });
});
