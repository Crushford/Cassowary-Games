import type { DeckArchetype } from '../types';

export const DEPTH_DECKS: DeckArchetype[] = [
  {
    id: 'blue-starter',
    name: 'Blue Starter',
    cards: [3, 2, 0, 0, 0],
    backingColor: 'blue',
    riskProfile: 'forty',
  },
  {
    id: 'red-spike',
    name: 'Red Spike',
    cards: [5, 0, 0, 0, 0],
    backingColor: 'red',
    riskProfile: 'single',
  },
  {
    id: 'orange-split-10',
    name: 'Orange Split 10',
    cards: [3, 3, 2, 2, 0, 0, 0, 0, 0, 0],
    backingColor: 'orange',
    riskProfile: 'forty',
  },
  {
    id: 'red-spike-10',
    name: 'Red Spike 10',
    cards: [10, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    backingColor: 'red',
    riskProfile: 'single',
  },
  {
    id: 'amber-twenty-10',
    name: 'Amber Twenty 10',
    cards: [5, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    backingColor: 'orange',
    riskProfile: 'twenty',
  },
];

export function getDeckArchetype(deckId: string): DeckArchetype {
  const deck = DEPTH_DECKS.find((item) => item.id === deckId);
  if (!deck) {
    throw new Error(`Unknown Depth deck archetype: ${deckId}`);
  }
  return deck;
}
