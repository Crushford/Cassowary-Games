import type {
  ColorName,
  ColorClasses,
  QueensBaseColorName,
  QueensPatternVariant,
  QueensRegionColorMode,
  QueensShadeVariant,
  RegionAppearance,
} from '../types/types';

// Define the main palette (8 colors)
export const COLOR_PALETTE: ColorName[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
  'teal',
  'indigo',
];

export const QUEENS_BASE_PALETTE: QueensBaseColorName[] = [...COLOR_PALETTE];

// Single letter symbols for each color (useful for text output)
export const COLOR_SYMBOLS: Record<ColorName | 'undefined', string> = {
  red: 'R',
  blue: 'A',
  green: 'G',
  yellow: 'Y',
  purple: 'P',
  pink: 'K',
  teal: 'T',
  indigo: 'I',
  undefined: '.',
};

// Reverse mapping from single-letter symbol to color name
export const SYMBOL_TO_COLOR: Record<string, ColorName> = Object.entries(COLOR_SYMBOLS).reduce(
  (acc, [color, symbol]) => {
    if (color !== 'undefined') {
      acc[symbol] = color as ColorName;
    }
    return acc;
  },
  {} as Record<string, ColorName>
);

// Mapping colors to their Tailwind color classes
export const COLOR_CLASSES: Record<ColorName, ColorClasses> = {
  red: {
    bg: 'bg-group-red-base',
    text: 'text-group-red-base',
    border: 'border-group-red-base',
  },
  blue: {
    bg: 'bg-group-blue-base',
    text: 'text-group-blue-base',
    border: 'border-group-blue-base',
  },
  green: {
    bg: 'bg-group-green-base',
    text: 'text-group-green-base',
    border: 'border-group-green-base',
  },
  yellow: {
    bg: 'bg-group-yellow-base',
    text: 'text-group-yellow-base',
    border: 'border-group-yellow-base',
  },
  purple: {
    bg: 'bg-group-purple-base',
    text: 'text-group-purple-base',
    border: 'border-group-purple-base',
  },
  pink: {
    bg: 'bg-group-pink-base',
    text: 'text-group-pink-base',
    border: 'border-group-pink-base',
  },
  teal: {
    bg: 'bg-group-teal-base',
    text: 'text-group-teal-base',
    border: 'border-group-teal-base',
  },
  indigo: {
    bg: 'bg-group-indigo-base',
    text: 'text-group-indigo-base',
    border: 'border-group-indigo-base',
  },
};

export const QUEENS_SHADE_ORDER: QueensShadeVariant[] = ['base', 'soft', 'strong'];
export const QUEENS_PATTERN_ORDER: QueensPatternVariant[] = [
  'solid',
  'diagonal',
  'dots',
  'crosshatch',
];

export const QUEENS_ADJACENT_COLOR_CONFLICTS: Record<
  QueensBaseColorName,
  readonly QueensBaseColorName[]
> = {
  red: [],
  blue: ['indigo'],
  green: ['teal'],
  yellow: [],
  purple: ['pink'],
  pink: ['purple'],
  teal: ['green'],
  indigo: ['blue'],
};

export function getRegionAppearanceBackgroundClass(appearance: RegionAppearance): string {
  return `bg-group-${appearance.color}-${appearance.shade}`;
}

export function areQueensColorsTooSimilar(
  left: QueensBaseColorName,
  right: QueensBaseColorName
): boolean {
  if (left === right) return true;
  return (
    QUEENS_ADJACENT_COLOR_CONFLICTS[left].includes(right) ||
    QUEENS_ADJACENT_COLOR_CONFLICTS[right].includes(left)
  );
}

export function getRegionAppearanceTokens(
  mode: QueensRegionColorMode
): Array<Pick<RegionAppearance, 'color' | 'shade' | 'pattern'>> {
  if (mode === 'repeat-base-colors') {
    return QUEENS_BASE_PALETTE.map((color) => ({
      color,
      shade: 'base',
      pattern: 'solid',
    }));
  }

  if (mode === 'shade-variants') {
    return QUEENS_BASE_PALETTE.flatMap((color) =>
      QUEENS_SHADE_ORDER.map((shade) => ({
        color,
        shade,
        pattern: 'solid' as const,
      }))
    );
  }

  return QUEENS_BASE_PALETTE.flatMap((color) =>
    QUEENS_PATTERN_ORDER.map((pattern) => ({
      color,
      shade: 'base' as const,
      pattern,
    }))
  );
}

// Image URLs for each color (for img src attributes)
export const COLOR_IMAGE_URLS: Record<ColorName, string> = {
  red: '/assets/ant-nest-colors/red.png',
  blue: '/assets/ant-nest-colors/blue.png',
  green: '/assets/ant-nest-colors/green.png',
  yellow: '/assets/ant-nest-colors/yellow.png',
  purple: '/assets/ant-nest-colors/purple.png',
  pink: '/assets/ant-nest-colors/pink.png',
  teal: '/assets/ant-nest-colors/teal.png',
  indigo: '/assets/ant-nest-colors/indigo.png',
};

// Background image styles for each color (derived from COLOR_IMAGE_URLS)
export const COLOR_BG_IMAGES: Record<ColorName, string> = Object.fromEntries(
  Object.entries(COLOR_IMAGE_URLS).map(([color, url]) => [
    color,
    `background-image: url("${url}");`,
  ])
) as Record<ColorName, string>;

// Get a subset of the main palette with a specific size
export function getColorPalette(size = 8): ColorName[] {
  if (size > COLOR_PALETTE.length) {
    console.warn(
      `Requested palette size ${size} exceeds available colors (${COLOR_PALETTE.length})`
    );
    return [...COLOR_PALETTE];
  }
  return COLOR_PALETTE.slice(0, size);
}

// Get Tailwind classes for a specific color
export function getColorClasses(color: ColorName): ColorClasses {
  return COLOR_CLASSES[color];
}

// Get background class for a color
export function getBgClass(color: ColorName): string {
  return COLOR_CLASSES[color].bg;
}

// Get text class for a color
export function getTextClass(color: ColorName): string {
  return COLOR_CLASSES[color].text;
}

// Helper function to get a random color from the palette
export function getRandomColor(): ColorName {
  const index = Math.floor(Math.random() * COLOR_PALETTE.length);
  return COLOR_PALETTE[index];
}

export default COLOR_PALETTE;
