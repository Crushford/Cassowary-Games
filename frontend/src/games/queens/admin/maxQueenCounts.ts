export const QUEENS_MAX_QUEEN_COUNTS: Record<number, Record<number, number>> = {
  4: {
    3: 4,
    4: 4,
  },
  5: {
    3: 6,
    4: 5,
    5: 5,
  },
  6: {
    3: 8,
    4: 8,
    5: 8,
    6: 6,
  },
  7: {
    3: 10,
    4: 10,
    5: 10,
    6: 9,
    7: 7,
  },
  8: {
    3: 13,
    4: 13,
    5: 13,
    6: 11,
    7: 10,
    8: 8,
  },
};

export function hasPrecomputedMaxQueenCount(size: number, orthogonalMinDistance: number): boolean {
  return QUEENS_MAX_QUEEN_COUNTS[size]?.[orthogonalMinDistance] != null;
}

export function supportedPrecomputedDistances(size: number): number[] {
  return Object.keys(QUEENS_MAX_QUEEN_COUNTS[size] ?? {})
    .map((value) => Number.parseInt(value, 10))
    .sort((left, right) => left - right);
}
