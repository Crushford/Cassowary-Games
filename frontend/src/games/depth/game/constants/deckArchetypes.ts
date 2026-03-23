import type { DeckArchetype, DeckColor } from '../types';

export const DEPTH_DECKS: Record<DeckColor, DeckArchetype> = {
  blue: {
    cards: [3, 2, 0, 0, 0],
    riskProfile: 'forty',
  },
  red: {
    cards: [5, 0, 0, 0, 0],
    riskProfile: 'single',
  },
};

export const DEPTH_DECK_COLORS = Object.keys(DEPTH_DECKS) as DeckColor[];

export function getDeckArchetype(deckColor: DeckColor): DeckArchetype {
  const deck = DEPTH_DECKS[deckColor];
  if (!deck) {
    throw new Error(`Unknown Depth deck archetype: ${deckColor}`);
  }
  return deck;
}

export function isDeckColor(value: string): value is DeckColor {
  return value in DEPTH_DECKS;
}

export function formatDeckColor(deckColor: DeckColor): string {
  return `${deckColor.charAt(0).toUpperCase()}${deckColor.slice(1)} deck`;
}
