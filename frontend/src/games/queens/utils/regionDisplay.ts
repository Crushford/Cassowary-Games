import type { GridSquare, QueensRegionColorMode, RegionAppearance } from '../types/types';
import { areQueensColorsTooSimilar, getRegionAppearanceTokens } from './colorPalette';

type RegionToken = Pick<RegionAppearance, 'color' | 'shade' | 'pattern'>;

function getRegionIds(grid: GridSquare[][]): string[] {
  const ids = new Set<string>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell.groupColor) {
        ids.add(cell.groupColor);
      }
    }
  }
  return Array.from(ids).sort();
}

function buildRegionAdjacency(grid: GridSquare[][]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  const ensureRegion = (regionId: string) => {
    if (!adjacency.has(regionId)) {
      adjacency.set(regionId, new Set());
    }
  };

  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex += 1) {
      const regionId = grid[rowIndex][colIndex].groupColor;
      if (!regionId) continue;
      ensureRegion(regionId);

      const neighbors = [grid[rowIndex]?.[colIndex + 1], grid[rowIndex + 1]?.[colIndex]];

      for (const neighbor of neighbors) {
        const neighborRegionId = neighbor?.groupColor;
        if (!neighborRegionId || neighborRegionId === regionId) continue;
        ensureRegion(neighborRegionId);
        adjacency.get(regionId)?.add(neighborRegionId);
        adjacency.get(neighborRegionId)?.add(regionId);
      }
    }
  }

  return adjacency;
}

function createAppearanceKey(token: RegionToken): string {
  return `${token.color}:${token.shade}:${token.pattern}`;
}

function chooseAppearanceForRegion(
  regionId: string,
  orderedTokens: RegionToken[],
  adjacency: Map<string, Set<string>>,
  assignedAppearances: Map<string, RegionAppearance>,
  tokenUsageCounts: Map<string, number>,
  colorUsageCounts: Map<string, number>
): RegionToken {
  const neighborTokens = Array.from(adjacency.get(regionId) ?? [])
    .map((neighborId) => assignedAppearances.get(neighborId))
    .filter((token): token is RegionAppearance => token !== undefined);

  const neighborAppearanceKeys = new Set(neighborTokens.map(createAppearanceKey));

  const scoreToken = (token: RegionToken): number => {
    const appearanceKey = createAppearanceKey(token);
    const appearanceUsage = tokenUsageCounts.get(appearanceKey) ?? 0;
    const colorUsage = colorUsageCounts.get(token.color) ?? 0;
    const sameColorAdjacencies = neighborTokens.filter(
      (neighbor) => neighbor.color === token.color
    ).length;
    const similarColorAdjacencies = neighborTokens.filter(
      (neighbor) =>
        neighbor.color !== token.color && areQueensColorsTooSimilar(token.color, neighbor.color)
    ).length;
    return (
      appearanceUsage * 1000 +
      colorUsage * 100 +
      sameColorAdjacencies * 10 +
      similarColorAdjacencies
    );
  };

  const availableWithoutAppearanceConflict = orderedTokens.filter(
    (token) => !neighborAppearanceKeys.has(createAppearanceKey(token))
  );
  const availableWithoutSameColorConflict = availableWithoutAppearanceConflict.filter(
    (token) => !neighborTokens.some((neighbor) => neighbor.color === token.color)
  );
  const availableWithoutSimilarColorConflict = availableWithoutSameColorConflict.filter(
    (token) =>
      !neighborTokens.some((neighbor) => areQueensColorsTooSimilar(token.color, neighbor.color))
  );
  const candidatePool =
    availableWithoutSimilarColorConflict.length > 0
      ? availableWithoutSimilarColorConflict
      : availableWithoutSameColorConflict.length > 0
        ? availableWithoutSameColorConflict
        : availableWithoutAppearanceConflict.length > 0
          ? availableWithoutAppearanceConflict
          : orderedTokens;

  let bestToken = candidatePool[0];
  let bestScore = scoreToken(bestToken);

  for (const token of candidatePool.slice(1)) {
    const score = scoreToken(token);
    if (score < bestScore) {
      bestToken = token;
      bestScore = score;
    }
  }

  return bestToken;
}

export function assignRegionPaletteColors(
  grid: GridSquare[][],
  mode: QueensRegionColorMode = 'repeat-base-colors'
): GridSquare[][] {
  const adjacency = buildRegionAdjacency(grid);
  const orderedRegionIds = getRegionIds(grid).sort((left, right) => {
    const leftDegree = adjacency.get(left)?.size ?? 0;
    const rightDegree = adjacency.get(right)?.size ?? 0;
    if (leftDegree !== rightDegree) return rightDegree - leftDegree;
    return left.localeCompare(right);
  });

  const orderedTokens = getRegionAppearanceTokens(mode);
  const regionToAppearance = new Map<string, RegionAppearance>();
  const tokenUsageCounts = new Map<string, number>();
  const colorUsageCounts = new Map<string, number>();

  for (const regionId of orderedRegionIds) {
    const token = chooseAppearanceForRegion(
      regionId,
      orderedTokens,
      adjacency,
      regionToAppearance,
      tokenUsageCounts,
      colorUsageCounts
    );
    const appearance: RegionAppearance = {
      ...token,
      mode,
    };

    regionToAppearance.set(regionId, appearance);

    const appearanceKey = createAppearanceKey(token);
    tokenUsageCounts.set(appearanceKey, (tokenUsageCounts.get(appearanceKey) ?? 0) + 1);
    colorUsageCounts.set(token.color, (colorUsageCounts.get(token.color) ?? 0) + 1);
  }

  return grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      groupAppearance: cell.groupColor ? regionToAppearance.get(cell.groupColor) : undefined,
    }))
  );
}
