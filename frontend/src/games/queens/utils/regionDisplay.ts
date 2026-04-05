import type { ColorName, GridSquare } from '../types/types';
import { COLOR_PALETTE } from './colorPalette';

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

export function assignRegionPaletteColors(grid: GridSquare[][]): GridSquare[][] {
  const adjacency = buildRegionAdjacency(grid);
  const orderedRegionIds = getRegionIds(grid).sort((left, right) => {
    const leftDegree = adjacency.get(left)?.size ?? 0;
    const rightDegree = adjacency.get(right)?.size ?? 0;
    if (leftDegree !== rightDegree) return rightDegree - leftDegree;
    return left.localeCompare(right);
  });

  const regionToPaletteColor = new Map<string, ColorName>();
  const usedPaletteColors = new Set<ColorName>();

  for (const regionId of orderedRegionIds) {
    const touchingColors = new Set(
      Array.from(adjacency.get(regionId) ?? [])
        .map((neighborId) => regionToPaletteColor.get(neighborId))
        .filter((color): color is ColorName => Boolean(color))
    );

    const unusedAvailableColor = COLOR_PALETTE.find(
      (color) => !usedPaletteColors.has(color) && !touchingColors.has(color)
    );
    const reusableAvailableColor = COLOR_PALETTE.find((color) => !touchingColors.has(color));
    const nextColor = unusedAvailableColor ?? reusableAvailableColor ?? COLOR_PALETTE[0];

    regionToPaletteColor.set(regionId, nextColor);
    usedPaletteColors.add(nextColor);
  }

  return grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      groupTint: cell.groupColor ? regionToPaletteColor.get(cell.groupColor) : undefined,
    }))
  );
}
