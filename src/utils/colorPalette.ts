// src/utils/colorPalette.ts
import type { ColorName, ColorClasses } from '../types/types';

// Define the main palette (10 colors)
export const COLOR_PALETTE: ColorName[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
  'orange',
  'teal',
  'indigo',
  'amber',
];

// Single letter symbols for each color (useful for text output)
export const COLOR_SYMBOLS: Record<ColorName | 'undefined', string> = {
  red: 'R',
  blue: 'B',
  green: 'G',
  yellow: 'Y',
  purple: 'P',
  pink: 'K',
  orange: 'O',
  teal: 'T',
  indigo: 'I',
  amber: 'A',
  undefined: '.',
};

// Mapping colors to their Tailwind color classes
export const COLOR_CLASSES: Record<ColorName, ColorClasses> = {
  red: {
    bg: 'bg-red-600',
    text: 'text-red-600',
    border: 'border-red-600',
    hoverBg: 'hover:bg-red-500',
    hoverText: 'hover:text-red-500',
  },
  blue: {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    border: 'border-blue-600',
    hoverBg: 'hover:bg-blue-500',
    hoverText: 'hover:text-blue-500',
  },
  green: {
    bg: 'bg-green-600',
    text: 'text-green-600',
    border: 'border-green-600',
    hoverBg: 'hover:bg-green-500',
    hoverText: 'hover:text-green-500',
  },
  yellow: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-600',
    border: 'border-yellow-500',
    hoverBg: 'hover:bg-yellow-400',
    hoverText: 'hover:text-yellow-500',
  },
  purple: {
    bg: 'bg-purple-600',
    text: 'text-purple-600',
    border: 'border-purple-600',
    hoverBg: 'hover:bg-purple-500',
    hoverText: 'hover:text-purple-500',
  },
  pink: {
    bg: 'bg-pink-600',
    text: 'text-pink-600',
    border: 'border-pink-600',
    hoverBg: 'hover:bg-pink-500',
    hoverText: 'hover:text-pink-500',
  },
  orange: {
    bg: 'bg-orange-600',
    text: 'text-orange-600',
    border: 'border-orange-600',
    hoverBg: 'hover:bg-orange-500',
    hoverText: 'hover:text-orange-500',
  },
  teal: {
    bg: 'bg-teal-600',
    text: 'text-teal-600',
    border: 'border-teal-600',
    hoverBg: 'hover:bg-teal-500',
    hoverText: 'hover:text-teal-500',
  },
  indigo: {
    bg: 'bg-indigo-600',
    text: 'text-indigo-600',
    border: 'border-indigo-600',
    hoverBg: 'hover:bg-indigo-500',
    hoverText: 'hover:text-indigo-500',
  },
  amber: {
    bg: 'bg-amber-600',
    text: 'text-amber-600',
    border: 'border-amber-600',
    hoverBg: 'hover:bg-amber-500',
    hoverText: 'hover:text-amber-500',
  },
};

// Mapping for background + hover classes for Tailwind grid coloring
export const COLOR_BG_HOVER_CLASSES: Record<ColorName, string> = {
  red: 'bg-red-500/50 hover:bg-red-500/70',
  blue: 'bg-blue-500/50 hover:bg-blue-500/70',
  green: 'bg-green-500/50 hover:bg-green-500/70',
  yellow: 'bg-yellow-500/50 hover:bg-yellow-500/70',
  purple: 'bg-purple-500/50 hover:bg-purple-500/70',
  pink: 'bg-pink-500/50 hover:bg-pink-500/70',
  orange: 'bg-orange-500/50 hover:bg-orange-500/70',
  teal: 'bg-teal-500/50 hover:bg-teal-500/70',
  indigo: 'bg-indigo-500/50 hover:bg-indigo-500/70',
  amber: 'bg-amber-500/50 hover:bg-amber-500/70',
};

export const COLOR_BG_IMAGES: Record<ColorName, string> = {
  red: 'background-image: url("/assets/red.png"); background-size: cover; background-position: center;',
  blue: 'background-image: url("/assets/blue.png"); background-size: cover; background-position: center;',
  green:
    'background-image: url("/assets/green.png"); background-size: cover; background-position: center;',
  yellow:
    'background-image: url("/assets/yellow.png"); background-size: cover; background-position: center;',
  purple:
    'background-image: url("/assets/purple.png"); background-size: cover; background-position: center;',
  pink: 'background-image: url("/assets/pink.png"); background-size: cover; background-position: center;',
  orange:
    'background-image: url("/assets/orange.png"); background-size: cover; background-position: center;',
  teal: 'background-image: url("/assets/teal.png"); background-size: cover; background-position: center;',
  indigo:
    'background-image: url("/assets/indigo.png"); background-size: cover; background-position: center;',
  amber:
    'background-image: url("/assets/amber.png"); background-size: cover; background-position: center;',
};

// Get a subset of the main palette with a specific size
export function getColorPalette(size = 10): ColorName[] {
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
