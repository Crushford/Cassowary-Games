import type { ColorName } from '@/games/queens/types/types';

const DARK_PASTEL_COLORS: Record<ColorName, string> = {
  red: 'bg-group-red-base',
  blue: 'bg-group-blue-base',
  green: 'bg-group-green-base',
  yellow: 'bg-group-yellow-base',
  purple: 'bg-group-purple-base',
  pink: 'bg-group-pink-base',
  teal: 'bg-group-teal-base',
  indigo: 'bg-group-indigo-base',
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
      regionColorMap[regionId] = DARK_PASTEL_COLORS[colorName];
      colorIndex += 1;
    }
  }

  return regionColorMap;
}
