import { getDeckArchetype, isDeckColor } from '../constants/deckArchetypes';
import type { DeckColor } from '../types';

export function validateDeckId(deckId: string): DeckColor {
  if (!isDeckColor(deckId)) {
    throw new Error(`Unknown Depth deck archetype: ${deckId}`);
  }

  getDeckArchetype(deckId);
  return deckId;
}
