export interface PuzzleForDiversity {
  id: string;
  layout: string;
  queens: string;
}

interface PuzzleFeatureVector {
  queenSpread: number;
  queenSymmetry: number;
  regionCountNormalized: number;
  regionSizeVarianceNormalized: number;
  regionCompactnessAverage: number;
  regionAdjacencyDensity: number;
}

interface PuzzleChoiceInput {
  currentPuzzle: PuzzleForDiversity | null;
  candidatePuzzles: PuzzleForDiversity[];
  minimumDifference: number;
  recentPuzzleIds: string[];
}

export interface PuzzleChoiceResult {
  selectedPuzzle: PuzzleForDiversity | null;
  selectedDifference: number;
  usedFallbackPool: boolean;
  candidatesAboveThreshold: number;
}

const DIFFERENCE_WEIGHTS = {
  queenSpread: 1.2,
  queenSymmetry: 1.1,
  regionCountNormalized: 0.8,
  regionSizeVarianceNormalized: 1.25,
  regionCompactnessAverage: 1.2,
  regionAdjacencyDensity: 1.0,
} as const;

const MAX_PAIR_SAMPLES = 2500;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function getPuzzleSize(puzzle: PuzzleForDiversity): number {
  return Math.sqrt(puzzle.layout.length);
}

function extractQueenPositions(puzzle: PuzzleForDiversity): Array<{ row: number; col: number }> {
  const size = getPuzzleSize(puzzle);
  const positions: Array<{ row: number; col: number }> = [];
  for (let i = 0; i < puzzle.queens.length; i++) {
    if (puzzle.queens[i] === 'Q') {
      positions.push({
        row: Math.floor(i / size),
        col: i % size,
      });
    }
  }
  return positions;
}

function calculateQueenSpreadScore(puzzle: PuzzleForDiversity): number {
  const size = getPuzzleSize(puzzle);
  const queens = extractQueenPositions(puzzle);
  if (queens.length < 2) return 0;

  let totalDistance = 0;
  let pairCount = 0;
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const a = queens[i];
      const b = queens[j];
      totalDistance += Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
      pairCount++;
    }
  }

  const maxDistancePerPair = Math.max(1, 2 * (size - 1));
  return clamp01(totalDistance / pairCount / maxDistancePerPair);
}

function calculateQueenSymmetryScore(puzzle: PuzzleForDiversity): number {
  const size = getPuzzleSize(puzzle);
  const queens = new Set<number>();
  for (let i = 0; i < puzzle.queens.length; i++) {
    if (puzzle.queens[i] === 'Q') queens.add(i);
  }

  const transforms = [
    (r: number, c: number) => [r, c],
    (r: number, c: number) => [c, size - 1 - r],
    (r: number, c: number) => [size - 1 - r, size - 1 - c],
    (r: number, c: number) => [size - 1 - c, r],
    (r: number, c: number) => [size - 1 - r, c],
    (r: number, c: number) => [r, size - 1 - c],
    (r: number, c: number) => [c, r],
    (r: number, c: number) => [size - 1 - c, size - 1 - r],
  ];

  let symmetryMatches = 0;
  for (const transform of transforms) {
    let isMatch = true;
    for (const index of queens) {
      const row = Math.floor(index / size);
      const col = index % size;
      const [nextRow, nextCol] = transform(row, col);
      const nextIndex = nextRow * size + nextCol;
      if (!queens.has(nextIndex)) {
        isMatch = false;
        break;
      }
    }
    if (isMatch) symmetryMatches++;
  }

  return clamp01(symmetryMatches / transforms.length);
}

function extractRegionCellMap(puzzle: PuzzleForDiversity): Map<string, number[]> {
  const size = getPuzzleSize(puzzle);
  const byRegion = new Map<string, number[]>();
  for (let i = 0; i < puzzle.layout.length; i++) {
    const symbol = puzzle.layout[i];
    if (!byRegion.has(symbol)) byRegion.set(symbol, []);
    byRegion.get(symbol)!.push(i);
  }
  if (!size) return byRegion;
  return byRegion;
}

function calculateRegionCountScore(puzzle: PuzzleForDiversity): number {
  const size = getPuzzleSize(puzzle);
  const regions = extractRegionCellMap(puzzle).size;
  return clamp01(regions / Math.max(1, size));
}

function calculateRegionSizeVarianceScore(puzzle: PuzzleForDiversity): number {
  const size = getPuzzleSize(puzzle);
  const sizes = Array.from(extractRegionCellMap(puzzle).values()).map((cells) => cells.length);
  if (sizes.length === 0) return 0;
  const mean = sizes.reduce((sum, value) => sum + value, 0) / sizes.length;
  const variance = sizes.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sizes.length;
  return clamp01(Math.sqrt(variance) / Math.max(1, size * size));
}

function calculateRegionCompactnessScore(puzzle: PuzzleForDiversity): number {
  const size = getPuzzleSize(puzzle);
  const layout = puzzle.layout;
  const regions = extractRegionCellMap(puzzle);
  const perimeters = new Map<string, number>();

  for (const regionId of regions.keys()) perimeters.set(regionId, 0);
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const index = row * size + col;
      const regionId = layout[index];

      for (const [dr, dc] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
          perimeters.set(regionId, (perimeters.get(regionId) || 0) + 1);
          continue;
        }
        const neighborRegionId = layout[nr * size + nc];
        if (neighborRegionId !== regionId) {
          perimeters.set(regionId, (perimeters.get(regionId) || 0) + 1);
        }
      }
    }
  }

  const compactnessValues: number[] = [];
  for (const [regionId, cells] of regions.entries()) {
    const area = cells.length;
    const perimeter = perimeters.get(regionId) || 0;
    if (perimeter === 0) {
      compactnessValues.push(0);
      continue;
    }
    compactnessValues.push(clamp01((4 * Math.PI * area) / (perimeter * perimeter)));
  }

  if (compactnessValues.length === 0) return 0;
  return compactnessValues.reduce((sum, value) => sum + value, 0) / compactnessValues.length;
}

function calculateRegionAdjacencyDensityScore(puzzle: PuzzleForDiversity): number {
  const size = getPuzzleSize(puzzle);
  const uniqueRegions = new Set(puzzle.layout.split(''));
  if (uniqueRegions.size < 2) return 0;

  const touchingPairs = new Set<string>();
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const index = row * size + col;
      const here = puzzle.layout[index];
      if (col + 1 < size) {
        const right = puzzle.layout[row * size + (col + 1)];
        if (right !== here) touchingPairs.add([here, right].sort().join('|'));
      }
      if (row + 1 < size) {
        const down = puzzle.layout[(row + 1) * size + col];
        if (down !== here) touchingPairs.add([here, down].sort().join('|'));
      }
    }
  }

  const maxPossiblePairs = (uniqueRegions.size * (uniqueRegions.size - 1)) / 2;
  return clamp01(touchingPairs.size / Math.max(1, maxPossiblePairs));
}

function buildFeatureVector(puzzle: PuzzleForDiversity): PuzzleFeatureVector {
  return {
    queenSpread: calculateQueenSpreadScore(puzzle),
    queenSymmetry: calculateQueenSymmetryScore(puzzle),
    regionCountNormalized: calculateRegionCountScore(puzzle),
    regionSizeVarianceNormalized: calculateRegionSizeVarianceScore(puzzle),
    regionCompactnessAverage: calculateRegionCompactnessScore(puzzle),
    regionAdjacencyDensity: calculateRegionAdjacencyDensityScore(puzzle),
  };
}

function calculateWeightedFeatureDifference(
  left: PuzzleFeatureVector,
  right: PuzzleFeatureVector
): number {
  const weightedSum =
    Math.abs(left.queenSpread - right.queenSpread) * DIFFERENCE_WEIGHTS.queenSpread +
    Math.abs(left.queenSymmetry - right.queenSymmetry) * DIFFERENCE_WEIGHTS.queenSymmetry +
    Math.abs(left.regionCountNormalized - right.regionCountNormalized) *
      DIFFERENCE_WEIGHTS.regionCountNormalized +
    Math.abs(left.regionSizeVarianceNormalized - right.regionSizeVarianceNormalized) *
      DIFFERENCE_WEIGHTS.regionSizeVarianceNormalized +
    Math.abs(left.regionCompactnessAverage - right.regionCompactnessAverage) *
      DIFFERENCE_WEIGHTS.regionCompactnessAverage +
    Math.abs(left.regionAdjacencyDensity - right.regionAdjacencyDensity) *
      DIFFERENCE_WEIGHTS.regionAdjacencyDensity;

  const totalWeight = Object.values(DIFFERENCE_WEIGHTS).reduce((sum, value) => sum + value, 0);
  return clamp01(weightedSum / Math.max(1, totalWeight));
}

export function keepOnlyOriginalPuzzleVariants<T extends { id: string }>(puzzles: T[]): T[] {
  return puzzles.filter((puzzle) => puzzle.id.endsWith('-0'));
}

export function measurePuzzleDifference(
  left: PuzzleForDiversity,
  right: PuzzleForDiversity
): number {
  return calculateWeightedFeatureDifference(buildFeatureVector(left), buildFeatureVector(right));
}

function chooseSampledUniquePuzzlePairs(puzzles: PuzzleForDiversity[]): Array<[number, number]> {
  const allPairs: Array<[number, number]> = [];
  for (let i = 0; i < puzzles.length; i++) {
    for (let j = i + 1; j < puzzles.length; j++) {
      allPairs.push([i, j]);
    }
  }

  if (allPairs.length <= MAX_PAIR_SAMPLES) return allPairs;

  const sampled: Array<[number, number]> = [];
  for (let i = 0; i < MAX_PAIR_SAMPLES; i++) {
    const randomIndex = Math.floor(Math.random() * allPairs.length);
    sampled.push(allPairs[randomIndex]);
    allPairs[randomIndex] = allPairs[allPairs.length - 1];
    allPairs.pop();
  }
  return sampled;
}

export function estimateAverageDifferenceBetweenPuzzles(puzzles: PuzzleForDiversity[]): number {
  if (puzzles.length < 2) return 0;
  const pairs = chooseSampledUniquePuzzlePairs(puzzles);
  let totalDifference = 0;

  for (const [leftIndex, rightIndex] of pairs) {
    totalDifference += measurePuzzleDifference(puzzles[leftIndex], puzzles[rightIndex]);
  }

  return clamp01(totalDifference / Math.max(1, pairs.length));
}

export function convertAverageIntoRequiredDifference(averageDifference: number): number {
  return clamp01(averageDifference + 0.001);
}

function pickRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function chooseHighDifferenceFallbackPool(
  scoredCandidates: Array<{ puzzle: PuzzleForDiversity; difference: number }>
): Array<{ puzzle: PuzzleForDiversity; difference: number }> {
  const sorted = [...scoredCandidates].sort((a, b) => b.difference - a.difference);
  const poolSize = Math.max(3, Math.ceil(sorted.length * 0.2));
  return sorted.slice(0, poolSize);
}

export function chooseRandomPuzzleThatIsMeaningfullyDifferent(
  input: PuzzleChoiceInput
): PuzzleChoiceResult {
  const blockedIds = new Set<string>(input.recentPuzzleIds);

  const eligible = input.candidatePuzzles.filter((candidate) => {
    if (blockedIds.has(candidate.id)) return false;
    if (!input.currentPuzzle) return true;
    return candidate.id !== input.currentPuzzle.id;
  });

  if (eligible.length === 0) {
    return {
      selectedPuzzle: null,
      selectedDifference: 0,
      usedFallbackPool: false,
      candidatesAboveThreshold: 0,
    };
  }

  if (!input.currentPuzzle) {
    const picked = pickRandomItem(eligible);
    return {
      selectedPuzzle: picked,
      selectedDifference: 0,
      usedFallbackPool: false,
      candidatesAboveThreshold: eligible.length,
    };
  }

  const scoredCandidates = eligible.map((candidate) => ({
    puzzle: candidate,
    difference: measurePuzzleDifference(input.currentPuzzle!, candidate),
  }));

  const aboveThreshold = scoredCandidates.filter(
    ({ difference }) => difference > input.minimumDifference
  );

  const pool = aboveThreshold.length > 0 ? aboveThreshold : chooseHighDifferenceFallbackPool(scoredCandidates);
  const picked = pickRandomItem(pool);

  return {
    selectedPuzzle: picked.puzzle,
    selectedDifference: picked.difference,
    usedFallbackPool: aboveThreshold.length === 0,
    candidatesAboveThreshold: aboveThreshold.length,
  };
}
