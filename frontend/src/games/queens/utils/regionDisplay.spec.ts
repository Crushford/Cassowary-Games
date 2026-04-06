import { describe, expect, it } from 'vitest';

import type { GridSquare, RegionAppearance } from '../types/types';
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

describe('assignRegionPaletteColors', () => {
  it('reuses the 8 base colors only after exhausting them in repeat mode', () => {
    const grid = buildUniqueRegionGrid(3, 3);

    const assigned = assignRegionPaletteColors(grid, 'repeat-base-colors');
    const appearanceKeys = assigned.flat().map((cell) => getAppearanceKey(cell.groupAppearance));
    const uniqueAppearances = new Set(appearanceKeys);

    expect(uniqueAppearances.size).toBe(8);

    for (let row = 0; row < assigned.length; row += 1) {
      for (let col = 0; col < assigned[row].length; col += 1) {
        const currentKey = getAppearanceKey(assigned[row][col].groupAppearance);
        const rightKey =
          col + 1 < assigned[row].length
            ? getAppearanceKey(assigned[row][col + 1].groupAppearance)
            : null;
        const downKey =
          row + 1 < assigned.length
            ? getAppearanceKey(assigned[row + 1][col].groupAppearance)
            : null;

        expect(rightKey).not.toBe(currentKey);
        expect(downKey).not.toBe(currentKey);
      }
    }
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
});
