import type { PuzzleStringFormat } from './puzzleDatabase';

export type DiversityFeatureKey =
  | 'queenSymmetry'
  | 'queenSpread'
  | 'regionCountNorm'
  | 'regionSizeStdNorm'
  | 'regionCompactnessMean'
  | 'regionElongationNorm'
  | 'adjacencyDensity'
  | 'edgeCellFraction';

export interface DiversityFeatureDefinition {
  key: DiversityFeatureKey;
  label: string;
  meaning: string;
  weight: number;
}

export interface PuzzleDiversityFeatures {
  queenSymmetry: number;
  queenSpread: number;
  regionCountNorm: number;
  regionSizeStdNorm: number;
  regionCompactnessMean: number;
  regionElongationNorm: number;
  adjacencyDensity: number;
  edgeCellFraction: number;
}

export interface FeatureComparison {
  key: DiversityFeatureKey;
  label: string;
  meaning: string;
  weight: number;
  left: number;
  right: number;
  absDiff: number;
  weightedDiff: number;
}

export interface DiversityComparisonResult {
  distance: number;
  byFeature: FeatureComparison[];
}

const FEATURE_DEFINITIONS: DiversityFeatureDefinition[] = [
  {
    key: 'queenSymmetry',
    label: 'Queen Symmetry',
    meaning:
      'How many board symmetries keep queen positions unchanged (higher means more symmetric).',
    weight: 1.15,
  },
  {
    key: 'queenSpread',
    label: 'Queen Spread',
    meaning:
      'How spread out queen positions are on average (higher means queens are farther apart).',
    weight: 1.1,
  },
  {
    key: 'regionCountNorm',
    label: 'Region Count',
    meaning:
      'How many distinct regions exist, normalized by size (higher means more distinct groups).',
    weight: 1,
  },
  {
    key: 'regionSizeStdNorm',
    label: 'Region Size Variance',
    meaning: 'How uneven region sizes are (higher means larger size differences between regions).',
    weight: 1.2,
  },
  {
    key: 'regionCompactnessMean',
    label: 'Region Compactness',
    meaning:
      'Average compactness of region shapes (higher means blockier/rounder, lower means snakier).',
    weight: 1.25,
  },
  {
    key: 'regionElongationNorm',
    label: 'Region Elongation',
    meaning: 'Average elongation of regions (higher means more stretched, corridor-like shapes).',
    weight: 1.15,
  },
  {
    key: 'adjacencyDensity',
    label: 'Region Adjacency Density',
    meaning: 'How densely regions touch each other (higher means more interlocked region borders).',
    weight: 0.9,
  },
  {
    key: 'edgeCellFraction',
    label: 'Edge Occupancy',
    meaning: 'Fraction of cells on the board edge (higher means shapes lean more toward borders).',
    weight: 0.6,
  },
];

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function parseQueens(queens: string, size: number): Set<number> {
  const set = new Set<number>();
  for (let i = 0; i < queens.length; i++) {
    if (queens[i] === 'Q') {
      set.add(i);
    }
  }
  if (set.size !== size) {
    throw new Error(
      `Invalid queens string for ${size}x${size}: expected ${size} queens, got ${set.size}`
    );
  }
  return set;
}

function positionToIndex(row: number, col: number, size: number): number {
  return row * size + col;
}

function applyTransform(
  row: number,
  col: number,
  size: number,
  transformIndex: number
): [number, number] {
  switch (transformIndex) {
    case 0:
      return [row, col];
    case 1:
      return [col, size - 1 - row];
    case 2:
      return [size - 1 - row, size - 1 - col];
    case 3:
      return [size - 1 - col, row];
    case 4:
      return [size - 1 - row, col];
    case 5:
      return [row, size - 1 - col];
    case 6:
      return [col, row];
    case 7:
      return [size - 1 - col, size - 1 - row];
    default:
      return [row, col];
  }
}

function countQueenSymmetries(queensSet: Set<number>, size: number): number {
  let count = 0;
  for (let t = 0; t < 8; t++) {
    let matches = true;
    for (const index of queensSet) {
      const row = Math.floor(index / size);
      const col = index % size;
      const [nRow, nCol] = applyTransform(row, col, size, t);
      if (!queensSet.has(positionToIndex(nRow, nCol, size))) {
        matches = false;
        break;
      }
    }
    if (matches) {
      count++;
    }
  }
  return count;
}

type RegionData = {
  symbol: string;
  area: number;
  perimeter: number;
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
};

function getCellSymbol(layout: string, row: number, col: number, size: number): string {
  return layout[row * size + col];
}

function extractRegionData(layout: string, size: number): Map<string, RegionData> {
  const regions = new Map<string, RegionData>();

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const symbol = getCellSymbol(layout, row, col, size);
      if (!regions.has(symbol)) {
        regions.set(symbol, {
          symbol,
          area: 0,
          perimeter: 0,
          minRow: row,
          maxRow: row,
          minCol: col,
          maxCol: col,
        });
      }
      const region = regions.get(symbol)!;
      region.area++;
      region.minRow = Math.min(region.minRow, row);
      region.maxRow = Math.max(region.maxRow, row);
      region.minCol = Math.min(region.minCol, col);
      region.maxCol = Math.max(region.maxCol, col);
    }
  }

  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const symbol = getCellSymbol(layout, row, col, size);
      const region = regions.get(symbol)!;
      for (const [dr, dc] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
          region.perimeter++;
          continue;
        }
        if (getCellSymbol(layout, nr, nc, size) !== symbol) {
          region.perimeter++;
        }
      }
    }
  }

  return regions;
}

function getRegionAdjacencyDensity(layout: string, size: number): number {
  const regions = new Set(layout.split(''));
  if (regions.size <= 1) return 0;

  const edges = new Set<string>();
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const current = getCellSymbol(layout, row, col, size);
      if (col + 1 < size) {
        const right = getCellSymbol(layout, row, col + 1, size);
        if (current !== right) {
          const key = [current, right].sort().join('|');
          edges.add(key);
        }
      }
      if (row + 1 < size) {
        const down = getCellSymbol(layout, row + 1, col, size);
        if (current !== down) {
          const key = [current, down].sort().join('|');
          edges.add(key);
        }
      }
    }
  }

  const maxEdges = (regions.size * (regions.size - 1)) / 2;
  if (maxEdges === 0) return 0;
  return clamp01(edges.size / maxEdges);
}

function getQueenSpread(queensSet: Set<number>, size: number): number {
  const positions = Array.from(queensSet).map((index) => ({
    row: Math.floor(index / size),
    col: index % size,
  }));
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i];
      const b = positions[j];
      sum += Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
      pairs++;
    }
  }
  if (pairs === 0) return 0;
  const maxDistance = Math.max(1, 2 * (size - 1));
  return clamp01(sum / pairs / maxDistance);
}

function getEdgeCellFraction(size: number): number {
  const totalCells = size * size;
  if (totalCells === 0) return 0;
  const edgeCells = size === 1 ? 1 : size * 4 - 4;
  return clamp01(edgeCells / totalCells);
}

export function extractPuzzleDiversityFeatures(
  puzzle: Pick<PuzzleStringFormat, 'layout' | 'queens'>
): PuzzleDiversityFeatures {
  const size = Math.sqrt(puzzle.layout.length);
  if (!Number.isInteger(size) || puzzle.queens.length !== puzzle.layout.length) {
    throw new Error('Invalid puzzle strings: layout and queens must represent an NxN grid');
  }

  const queensSet = parseQueens(puzzle.queens, size);
  const regions = extractRegionData(puzzle.layout, size);
  const regionSizes = Array.from(regions.values()).map((region) => region.area);
  const meanRegionSize =
    regionSizes.reduce((sum, value) => sum + value, 0) / Math.max(1, regionSizes.length);
  const regionSizeVariance =
    regionSizes.reduce((sum, value) => sum + (value - meanRegionSize) ** 2, 0) /
    Math.max(1, regionSizes.length);
  const regionSizeStdNorm = clamp01(Math.sqrt(regionSizeVariance) / (size * size));

  const compactnessValues = Array.from(regions.values()).map((region) => {
    if (region.perimeter === 0) return 0;
    return clamp01((4 * Math.PI * region.area) / (region.perimeter * region.perimeter));
  });
  const regionCompactnessMean =
    compactnessValues.reduce((sum, value) => sum + value, 0) /
    Math.max(1, compactnessValues.length);

  const elongationValues = Array.from(regions.values()).map((region) => {
    const width = region.maxCol - region.minCol + 1;
    const height = region.maxRow - region.minRow + 1;
    const ratio = Math.max(width / Math.max(1, height), height / Math.max(1, width));
    return clamp01((ratio - 1) / Math.max(1, size - 1));
  });
  const regionElongationNorm =
    elongationValues.reduce((sum, value) => sum + value, 0) / Math.max(1, elongationValues.length);

  return {
    queenSymmetry: clamp01(countQueenSymmetries(queensSet, size) / 8),
    queenSpread: getQueenSpread(queensSet, size),
    regionCountNorm: clamp01(regions.size / Math.max(1, size)),
    regionSizeStdNorm,
    regionCompactnessMean: clamp01(regionCompactnessMean),
    regionElongationNorm: clamp01(regionElongationNorm),
    adjacencyDensity: getRegionAdjacencyDensity(puzzle.layout, size),
    edgeCellFraction: getEdgeCellFraction(size),
  };
}

export function comparePuzzleFeatures(
  left: PuzzleDiversityFeatures,
  right: PuzzleDiversityFeatures
): DiversityComparisonResult {
  const byFeature: FeatureComparison[] = FEATURE_DEFINITIONS.map((def) => {
    const leftValue = left[def.key];
    const rightValue = right[def.key];
    const absDiff = Math.abs(leftValue - rightValue);
    const weightedDiff = absDiff * def.weight;
    return {
      key: def.key,
      label: def.label,
      meaning: def.meaning,
      weight: def.weight,
      left: leftValue,
      right: rightValue,
      absDiff,
      weightedDiff,
    };
  });

  const totalWeight = FEATURE_DEFINITIONS.reduce((sum, def) => sum + def.weight, 0);
  const weightedSum = byFeature.reduce((sum, feature) => sum + feature.weightedDiff, 0);

  return {
    distance: totalWeight === 0 ? 0 : clamp01(weightedSum / totalWeight),
    byFeature,
  };
}

export function getDiversityFeatureDefinitions(): DiversityFeatureDefinition[] {
  return FEATURE_DEFINITIONS;
}
