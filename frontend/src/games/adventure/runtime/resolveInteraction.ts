import type { Interaction, Effect, AdventureRuntimeState } from '../types/adventureTypes'
import { evaluateConditions } from './evaluateConditions'

export interface ResolvedInteraction {
  text: string
  effects: Effect[]
}

/**
 * Returns the first interaction whose conditions all pass, or null if none match.
 * An interaction with no conditions always passes and acts as a catch-all default.
 */
export function resolveInteraction(
  interactions: Interaction[],
  state: AdventureRuntimeState,
): ResolvedInteraction | null {
  for (const interaction of interactions) {
    const conditions = interaction.conditions ?? []
    if (evaluateConditions(conditions, state)) {
      return {
        text: interaction.text,
        effects: interaction.effects ?? [],
      }
    }
  }
  return null
}
