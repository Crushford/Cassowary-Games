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
  9: {
    7: 12,
    8: 11,
    9: 9,
  },
};

function effectiveDistancesForCounts(distanceMap: Record<number, number> | undefined): number[] {
  if (!distanceMap) return [];
  const entries = Object.entries(distanceMap)
    .map(([distance, maxQueens]) => ({
      distance: Number.parseInt(distance, 10),
      maxQueens,
    }))
    .sort((left, right) => left.distance - right.distance);
  const effective: number[] = [];
  let previousMaxQueens: number | null = null;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.maxQueens !== previousMaxQueens) {
      effective.push(entry.distance);
      previousMaxQueens = entry.maxQueens;
    }
  }
  return effective.sort((left, right) => left - right);
}

export function hasPrecomputedMaxQueenCount(size: number, orthogonalMinDistance: number): boolean {
  return QUEENS_MAX_QUEEN_COUNTS[size]?.[orthogonalMinDistance] != null;
}

export function hasEffectiveMaxQueenCount(size: number, orthogonalMinDistance: number): boolean {
  return supportedPrecomputedDistances(size).includes(orthogonalMinDistance);
}

export function rawPrecomputedDistances(size: number): number[] {
  return Object.keys(QUEENS_MAX_QUEEN_COUNTS[size] ?? {})
    .map((value) => Number.parseInt(value, 10))
    .sort((left, right) => left - right);
}

export function supportedPrecomputedDistances(size: number): number[] {
  return effectiveDistancesForCounts(QUEENS_MAX_QUEEN_COUNTS[size]);
}

export function isRedundantPrecomputedDistance(
  size: number,
  orthogonalMinDistance: number
): boolean {
  return (
    hasPrecomputedMaxQueenCount(size, orthogonalMinDistance) &&
    !hasEffectiveMaxQueenCount(size, orthogonalMinDistance)
  );
}
