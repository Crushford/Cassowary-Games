import type { ColorName } from '@/games/queens/types/types';

const DARK_PASTEL_COLORS: Record<ColorName, { bg: string; hover: string }> = {
  red: { bg: 'bg-group-red-base', hover: 'hover:bg-group-red-hover' },
  blue: { bg: 'bg-group-blue-base', hover: 'hover:bg-group-blue-hover' },
  green: { bg: 'bg-group-green-base', hover: 'hover:bg-group-green-hover' },
  yellow: { bg: 'bg-group-yellow-base', hover: 'hover:bg-group-yellow-hover' },
  purple: { bg: 'bg-group-purple-base', hover: 'hover:bg-group-purple-hover' },
  pink: { bg: 'bg-group-pink-base', hover: 'hover:bg-group-pink-hover' },
  teal: { bg: 'bg-group-teal-base', hover: 'hover:bg-group-teal-hover' },
  indigo: { bg: 'bg-group-indigo-base', hover: 'hover:bg-group-indigo-hover' },
  amber: { bg: 'bg-group-amber-base', hover: 'hover:bg-group-amber-hover' },
};

const REGION_COLOR_ORDER: ColorName[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
  'teal',
  'indigo',
  'amber',
];

export function buildRegionColorClassMap(regionIds: string[][]): Record<string, string> {
  const regionColorMap: Record<string, string> = {};
  let colorIndex = 0;

  for (const row of regionIds) {
    for (const regionId of row) {
      if (!regionId || regionId === '.' || regionColorMap[regionId]) {
        continue;
      }

      const colorName = REGION_COLOR_ORDER[colorIndex % REGION_COLOR_ORDER.length];
      regionColorMap[regionId] = DARK_PASTEL_COLORS[colorName].bg;
      colorIndex += 1;
    }
  }

  return regionColorMap;
}
