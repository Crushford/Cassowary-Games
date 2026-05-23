import type { Effect, AdventureRuntimeState } from '../types/adventureTypes'

export function applyEffect(effect: Effect, state: AdventureRuntimeState): void {
  switch (effect.type) {
    case 'setFlag':
      state.flags[effect.flag] = true
      break
    case 'addItem':
      if (!state.inventoryItemIds.includes(effect.itemId)) {
        state.inventoryItemIds = [...state.inventoryItemIds, effect.itemId]
      }
      if (!state.collectedItemIds.includes(effect.itemId)) {
        state.collectedItemIds = [...state.collectedItemIds, effect.itemId]
      }
      break
    case 'removeItem':
      state.inventoryItemIds = state.inventoryItemIds.filter((id) => id !== effect.itemId)
      break
    case 'setQuestState':
      state.questStates[effect.questId] = effect.state
      break
    case 'moveToScene':
      state.currentSceneId = effect.sceneId
      break
  }
}

export function applyEffects(effects: Effect[], state: AdventureRuntimeState): void {
  for (const effect of effects) {
    applyEffect(effect, state)
  }
}
