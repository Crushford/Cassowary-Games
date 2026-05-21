import { defineStore } from 'pinia'
import type {
  AdventureGameDefinition,
  ActionType,
  Effect,
  AdventureRuntimeState,
} from '../types/adventureTypes'
import { resolveInteraction } from '../runtime/resolveInteraction'
import { applyEffects } from '../runtime/applyEffects'

/**
 * Creates a Pinia store for an adventure game.
 * Call this once at module level (not inside component setup) with a stable game definition.
 *
 * @param game   - The complete game definition (static data).
 * @param storeId - A unique Pinia store ID (e.g. 'tinamou-adventure').
 */
export function createAdventureStore(game: AdventureGameDefinition, storeId: string) {
  return defineStore(storeId, {
    state: () => ({
      currentSceneId: game.initialSceneId,
      flags: {} as Record<string, boolean>,
      inventoryItemIds: [] as string[],
      collectedItemIds: [] as string[],
      questStates: { ...(game.initialQuestStates ?? {}) } as Record<string, string>,
      activeAction: 'look' as ActionType,
      selectedInventoryItemId: null as string | null,
      currentNarration: null as string | null,
      narrationHistory: [] as string[],
    }),

    getters: {
      gameDefinition: () => game,

      currentScene: (state) => game.scenes[state.currentSceneId] ?? null,

      runtimeState: (state): AdventureRuntimeState => ({
        flags: state.flags,
        inventoryItemIds: state.inventoryItemIds,
        collectedItemIds: state.collectedItemIds,
        questStates: state.questStates,
        currentSceneId: state.currentSceneId,
      }),

      inventory: (state) =>
        state.inventoryItemIds.map((id) => game.items[id]).filter(Boolean),

      selectedItem: (state) =>
        state.selectedInventoryItemId
          ? (game.items[state.selectedInventoryItemId] ?? null)
          : null,

      visibleHotspots: (state) => {
        const scene = game.scenes[state.currentSceneId]
        if (!scene) return []
        return scene.hotspots.filter(
          (h) => !h.collectibleItemId || !state.collectedItemIds.includes(h.collectibleItemId),
        )
      },
    },

    actions: {
      setActiveAction(action: ActionType) {
        this.activeAction = action
        if (action !== 'use') {
          this.selectedInventoryItemId = null
        }
      },

      selectInventoryItem(id: string) {
        if (this.selectedInventoryItemId === id) {
          this.selectedInventoryItemId = null
          this.activeAction = 'look'
        } else {
          this.selectedInventoryItemId = id
          this.activeAction = 'use'
        }
      },

      narrate(text: string) {
        this.currentNarration = text
        this.narrationHistory.push(text)
      },

      applyEffectsToStore(effects: Effect[]) {
        // Build a plain snapshot, apply pure effects, then patch Pinia state back.
        // This keeps applyEffects testable without Pinia.
        const snapshot: AdventureRuntimeState = {
          flags: { ...this.flags },
          inventoryItemIds: [...this.inventoryItemIds],
          collectedItemIds: [...this.collectedItemIds],
          questStates: { ...this.questStates },
          currentSceneId: this.currentSceneId,
        }
        applyEffects(effects, snapshot)
        this.$patch({
          flags: snapshot.flags,
          inventoryItemIds: snapshot.inventoryItemIds,
          collectedItemIds: snapshot.collectedItemIds,
          questStates: snapshot.questStates,
          currentSceneId: snapshot.currentSceneId,
        })
      },

      interact(hotspotId: string) {
        const scene = this.currentScene
        if (!scene) return

        const hotspot = scene.hotspots.find((h) => h.id === hotspotId)
        if (!hotspot) return

        // Collected items are hidden from the scene, so this is a safety guard
        if (hotspot.collectibleItemId && this.collectedItemIds.includes(hotspot.collectibleItemId)) {
          return
        }

        const action = this.activeAction
        const itemId = this.selectedInventoryItemId

        if (action === 'use') {
          if (!itemId) {
            this.narrate('Select an item from your inventory first, then click a hotspot.')
            return
          }
          const useInteractions = hotspot.useInteractions?.[itemId]
          if (useInteractions) {
            const resolved = resolveInteraction(useInteractions, this.runtimeState)
            if (resolved) {
              this.narrate(resolved.text)
              this.applyEffectsToStore(resolved.effects)
              return
            }
          }
          const itemLabel = game.items[itemId]?.label ?? 'item'
          this.narrate(
            hotspot.useFallback ??
              `You try using the ${itemLabel} on the ${hotspot.label}. Nothing interesting happens.`,
          )
          return
        }

        const interactions = hotspot.interactions[action]

        if (!interactions) {
          this.narrate(
            hotspot.interactionFallbacks?.[action] ??
              this.defaultFallback(action, hotspot.label),
          )
          return
        }

        const resolved = resolveInteraction(interactions, this.runtimeState)
        if (!resolved) {
          this.narrate(
            hotspot.interactionFallbacks?.[action] ??
              this.defaultFallback(action, hotspot.label),
          )
          return
        }

        this.narrate(resolved.text)
        this.applyEffectsToStore(resolved.effects)
      },

      defaultFallback(action: ActionType, label: string): string {
        switch (action) {
          case 'take':
            return `You can't pick up the ${label}. You briefly consider it, then regain your dignity.`
          case 'talk':
            return `You address the ${label}. It does not respond.`
          case 'use':
            return `You consider the ${label} thoughtfully.`
          case 'look':
            return `Nothing of interest here.`
        }
      },

      resetGame() {
        this.$patch({
          currentSceneId: game.initialSceneId,
          flags: {},
          inventoryItemIds: [],
          collectedItemIds: [],
          questStates: { ...(game.initialQuestStates ?? {}) },
          activeAction: 'look' as ActionType,
          selectedInventoryItemId: null,
          currentNarration: null,
          narrationHistory: [],
        })
      },
    },
  })
}
