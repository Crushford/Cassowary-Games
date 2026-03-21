import { describe, expect, it } from 'vitest';

import { canAffordBet, clampBet, getAllowedMaxBet, getPayout } from './payouts';

describe('clampBet', () => {
  it('clamps a value below the minimum up to minBet', () => {
    expect(clampBet(0, 1, 5)).toBe(1);
  });

  it('clamps a value above the maximum down to maxBet', () => {
    expect(clampBet(10, 1, 5)).toBe(5);
  });

  it('passes through a value within the valid range', () => {
    expect(clampBet(3, 1, 5)).toBe(3);
  });

  it('floors a decimal amount', () => {
    expect(clampBet(3.9, 1, 5)).toBe(3);
  });

  it('floors before clamping', () => {
    expect(clampBet(5.9, 1, 5)).toBe(5);
  });

  it('returns minBet when amount floors to below min', () => {
    expect(clampBet(0.9, 2, 5)).toBe(2);
  });
});

describe('getAllowedMaxBet', () => {
  it('returns maxBet when bank exceeds it', () => {
    expect(getAllowedMaxBet(20, 5)).toBe(5);
  });

  it('returns bank when bank is less than maxBet', () => {
    expect(getAllowedMaxBet(3, 5)).toBe(3);
  });

  it('returns 0 when bank is 0', () => {
    expect(getAllowedMaxBet(0, 5)).toBe(0);
  });

  it('returns 0 when bank is negative', () => {
    expect(getAllowedMaxBet(-1, 5)).toBe(0);
  });

  it('returns exact value when bank equals maxBet', () => {
    expect(getAllowedMaxBet(5, 5)).toBe(5);
  });
});

describe('canAffordBet', () => {
  it('returns true when bank equals the bet', () => {
    expect(canAffordBet(3, 3)).toBe(true);
  });

  it('returns true when bank exceeds the bet', () => {
    expect(canAffordBet(10, 3)).toBe(true);
  });

  it('returns false when bank is less than the bet', () => {
    expect(canAffordBet(2, 3)).toBe(false);
  });

  it('returns false when bank is 0', () => {
    expect(canAffordBet(0, 1)).toBe(false);
  });
});

describe('getPayout', () => {
  it('returns card value multiplied by bet', () => {
    expect(getPayout(3, 2)).toBe(6);
  });

  it('returns 0 for a zero-value card regardless of bet', () => {
    expect(getPayout(0, 5)).toBe(0);
  });

  it('returns 0 for a zero bet', () => {
    expect(getPayout(3, 0)).toBe(0);
  });

  it('returns the correct payout for a high-value card', () => {
    expect(getPayout(10, 5)).toBe(50);
  });
});
