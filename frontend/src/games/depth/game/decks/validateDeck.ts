import { getDeckArchetype } from '../constants/deckArchetypes';

export function validateDeckId(deckId: string): string {
  getDeckArchetype(deckId);
  return deckId;
}
