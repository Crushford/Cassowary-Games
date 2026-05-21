import type { Condition, AdventureRuntimeState } from '../types/adventureTypes'

export function evaluateCondition(condition: Condition, state: AdventureRuntimeState): boolean {
  switch (condition.type) {
    case 'hasFlag':
      return !!state.flags[condition.flag]
    case 'missingFlag':
      return !state.flags[condition.flag]
    case 'hasItem':
      return state.inventoryItemIds.includes(condition.itemId)
    case 'missingItem':
      return !state.inventoryItemIds.includes(condition.itemId)
    case 'questState':
      return state.questStates[condition.questId] === condition.state
  }
}

export function evaluateConditions(
  conditions: Condition[],
  state: AdventureRuntimeState,
): boolean {
  return conditions.every((c) => evaluateCondition(c, state))
}
