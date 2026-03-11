// src/utils/colorPalette.ts
import type { ColorName, ColorClasses } from '../types/types';

// Define the main palette (9 colors)
export const COLOR_PALETTE: ColorName[] = [
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
  amber: 'B',
  undefined: '.',
};

// Mapping colors to their Tailwind color classes
export const COLOR_CLASSES: Record<ColorName, ColorClasses> = {
  red: {
    bg: 'bg-group-red-base',
    text: 'text-group-red-base',
    border: 'border-group-red-base',
    hoverBg: 'hover:bg-group-red-hover',
    hoverText: 'hover:text-group-red-hover',
  },
  blue: {
    bg: 'bg-group-blue-base',
    text: 'text-group-blue-base',
    border: 'border-group-blue-base',
    hoverBg: 'hover:bg-group-blue-hover',
    hoverText: 'hover:text-group-blue-hover',
  },
  green: {
    bg: 'bg-group-green-base',
    text: 'text-group-green-base',
    border: 'border-group-green-base',
    hoverBg: 'hover:bg-group-green-hover',
    hoverText: 'hover:text-group-green-hover',
  },
  yellow: {
    bg: 'bg-group-yellow-base',
    text: 'text-group-yellow-base',
    border: 'border-group-yellow-base',
    hoverBg: 'hover:bg-group-yellow-hover',
    hoverText: 'hover:text-group-yellow-hover',
  },
  purple: {
    bg: 'bg-group-purple-base',
    text: 'text-group-purple-base',
    border: 'border-group-purple-base',
    hoverBg: 'hover:bg-group-purple-hover',
    hoverText: 'hover:text-group-purple-hover',
  },
  pink: {
    bg: 'bg-group-pink-base',
    text: 'text-group-pink-base',
    border: 'border-group-pink-base',
    hoverBg: 'hover:bg-group-pink-hover',
    hoverText: 'hover:text-group-pink-hover',
  },
  teal: {
    bg: 'bg-group-teal-base',
    text: 'text-group-teal-base',
    border: 'border-group-teal-base',
    hoverBg: 'hover:bg-group-teal-hover',
    hoverText: 'hover:text-group-teal-hover',
  },
  indigo: {
    bg: 'bg-group-indigo-base',
    text: 'text-group-indigo-base',
    border: 'border-group-indigo-base',
    hoverBg: 'hover:bg-group-indigo-hover',
    hoverText: 'hover:text-group-indigo-hover',
  },
  amber: {
    bg: 'bg-group-amber-base',
    text: 'text-group-amber-base',
    border: 'border-group-amber-base',
    hoverBg: 'hover:bg-group-amber-hover',
    hoverText: 'hover:text-group-amber-hover',
  },
};

// Mapping for background + hover classes for Tailwind grid coloring with individual color textures
export const COLOR_BG_HOVER_CLASSES: Record<ColorName, string> = {
  red: 'hover:brightness-110',
  blue: 'hover:brightness-110',
  green: 'hover:brightness-110',
  yellow: 'hover:brightness-110',
  purple: 'hover:brightness-110',
  pink: 'hover:brightness-110', // Note: using purple.png as fallback since pink.png not found
  teal: 'hover:brightness-110',
  indigo: 'hover:brightness-110',
  amber: 'hover:brightness-110',
};

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
  amber: '/assets/ant-nest-colors/amber.png',
};

// Background image styles for each color (derived from COLOR_IMAGE_URLS)
export const COLOR_BG_IMAGES: Record<ColorName, string> = Object.fromEntries(
  Object.entries(COLOR_IMAGE_URLS).map(([color, url]) => [
    color,
    `background-image: url("${url}");`,
  ])
) as Record<ColorName, string>;

// Get a subset of the main palette with a specific size
export function getColorPalette(size = 9): ColorName[] {
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
