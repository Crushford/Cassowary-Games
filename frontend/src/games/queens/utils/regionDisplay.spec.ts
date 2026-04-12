import { describe, expect, it } from 'vitest';

import type { GridSquare, RegionAppearance } from '../types/types';
import { areQueensColorsTooSimilar } from './colorPalette';
import { assignRegionPaletteColors } from './regionDisplay';

function buildUniqueRegionGrid(rows: number, cols: number): GridSquare[][] {
  let index = 0;
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      position: { row, col },
      groupColor: `R${index++}`,
    }))
  );
}

function getAppearanceKey(appearance: RegionAppearance | undefined): string {
  if (!appearance) return 'missing';
  return `${appearance.color}:${appearance.shade}:${appearance.pattern}`;
}

function expectNoAdjacentColorConflicts(grid: GridSquare[][]): void {
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      const currentAppearance = grid[row][col].groupAppearance;
      expect(currentAppearance).toBeDefined();

      const neighbors = [
        grid[row]?.[col + 1]?.groupAppearance,
        grid[row + 1]?.[col]?.groupAppearance,
      ].filter((appearance): appearance is RegionAppearance => appearance !== undefined);

      for (const neighbor of neighbors) {
        expect(neighbor.color).not.toBe(currentAppearance?.color);
      }
    }
  }
}

describe('assignRegionPaletteColors', () => {
  it('reuses the 8 base colors only after exhausting them in repeat mode', () => {
    const grid = buildUniqueRegionGrid(3, 3);

    const assigned = assignRegionPaletteColors(grid, 'repeat-base-colors');
    const appearanceKeys = assigned.flat().map((cell) => getAppearanceKey(cell.groupAppearance));
    const uniqueAppearances = new Set(appearanceKeys);

    expect(uniqueAppearances.size).toBe(8);
    expectNoAdjacentColorConflicts(assigned);
  });

  it('exhausts all 24 color-shade combinations before reuse in shade mode', () => {
    const grid = buildUniqueRegionGrid(5, 5);

    const assigned = assignRegionPaletteColors(grid, 'shade-variants');
    const uniqueAppearances = new Set(
      assigned.flat().map((cell) => getAppearanceKey(cell.groupAppearance))
    );

    expect(uniqueAppearances.size).toBe(24);
  });

  it('uses unique color-pattern combinations in pattern mode while available', () => {
    const grid = buildUniqueRegionGrid(2, 6);

    const assigned = assignRegionPaletteColors(grid, 'pattern-variants');
    const uniqueAppearances = new Set(
      assigned.flat().map((cell) => getAppearanceKey(cell.groupAppearance))
    );

    expect(uniqueAppearances.size).toBe(12);
  });

  it('does not place the same base color next to itself in pattern mode', () => {
    const grid = buildUniqueRegionGrid(4, 4);

    const assigned = assignRegionPaletteColors(grid, 'pattern-variants');

    expectNoAdjacentColorConflicts(assigned);
  });

  it('avoids adjacent similar color families when other colors are available', () => {
    const grid = buildUniqueRegionGrid(4, 4);

    const assigned = assignRegionPaletteColors(grid, 'pattern-variants');

    for (let row = 0; row < assigned.length; row += 1) {
      for (let col = 0; col < assigned[row].length; col += 1) {
        const currentAppearance = assigned[row][col].groupAppearance;
        expect(currentAppearance).toBeDefined();

        const neighbors = [
          assigned[row]?.[col + 1]?.groupAppearance,
          assigned[row + 1]?.[col]?.groupAppearance,
        ].filter((appearance): appearance is RegionAppearance => appearance !== undefined);

        for (const neighbor of neighbors) {
          expect(areQueensColorsTooSimilar(currentAppearance!.color, neighbor.color)).toBeFalsy();
        }
      }
    }
  });

  it('falls back to reusing similar families when the board outgrows the conflict-safe palette', () => {
    const grid = buildUniqueRegionGrid(5, 5);

    const assigned = assignRegionPaletteColors(grid, 'repeat-base-colors');

    expect(assigned.flat().every((cell) => cell.groupAppearance)).toBe(true);
  });
});
