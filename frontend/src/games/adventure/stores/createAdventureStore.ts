import { defineStore } from 'pinia'
import type {
  AdventureGameDefinition,
  ActionType,
  Effect,
  AdventureRuntimeState,
  HotspotDefinition,
  InventoryItemDefinition,
  SceneDefinition,
} from '../types/adventureTypes'
import { resolveInteraction } from '../runtime/resolveInteraction'
import { applyEffects } from '../runtime/applyEffects'
import { evaluateConditions } from '../runtime/evaluateConditions'

export interface AvailableAction {
  key: string
  displayText: string
  hotspotId: string
  action: ActionType
  /** Only set for 'use' actions */
  itemId?: string
}

export type InteractionMode = 'scene' | 'text' | 'both'

/**
 * The contract that AdventureGame.vue (and any other engine UI) depends on.
 * Use this type for props instead of `any`.
 */
export interface AdventureStoreLike {
  // ── State / getters ──────────────────────────────────────────────────────
  gameDefinition: AdventureGameDefinition
  currentScene: SceneDefinition | null
  currentSceneId: string
  currentNarration: string | null
  activeAction: ActionType
  selectedInventoryItemId: string | null
  selectedItem: InventoryItemDefinition | null
  inventory: InventoryItemDefinition[]
  inventoryItemIds: string[]
  flags: Record<string, boolean>
  questStates: Record<string, string>
  visibleHotspots: HotspotDefinition[]
  availableActions: AvailableAction[]
  // ── Actions ───────────────────────────────────────────────────────────────
  setActiveAction(action: ActionType): void
  selectInventoryItem(id: string): void
  interact(hotspotId: string): void
  triggerAvailableAction(action: AvailableAction): void
  applyEffectsToStore(effects: Effect[]): void
  resetGame(): void
}

function isHotspotVisible(h: HotspotDefinition, state: AdventureRuntimeState): boolean {
  if (h.collectibleItemId && state.collectedItemIds.includes(h.collectibleItemId)) return false
  if (h.visibleWhen && !evaluateConditions(h.visibleWhen, state)) return false
  return true
}

/**
 * Creates a Pinia store for an adventure game.
 * Call once at module level with a stable game definition.
 *
 * @param game    The complete game definition (static content data).
 * @param storeId A unique Pinia store ID (e.g. 'tinamou-adventure').
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

      inventory: (state) => state.inventoryItemIds.map((id) => game.items[id]).filter(Boolean),

      selectedItem: (state) =>
        state.selectedInventoryItemId
          ? (game.items[state.selectedInventoryItemId] ?? null)
          : null,

      visibleHotspots: (state) => {
        const scene = game.scenes[state.currentSceneId]
        if (!scene) return []
        const runtime: AdventureRuntimeState = {
          flags: state.flags,
          inventoryItemIds: state.inventoryItemIds,
          collectedItemIds: state.collectedItemIds,
          questStates: state.questStates,
          currentSceneId: state.currentSceneId,
        }
        return scene.hotspots.filter((h) => isHotspotVisible(h, runtime))
      },

      /**
       * All actions the player can meaningfully attempt in the current scene.
       * Intended for the dev/debug "what can I do?" panel.
       * Does not filter by conditions — shows what's structurally possible.
       */
      availableActions: (state): AvailableAction[] => {
        const scene = game.scenes[state.currentSceneId]
        if (!scene) return []

        const runtime: AdventureRuntimeState = {
          flags: state.flags,
          inventoryItemIds: state.inventoryItemIds,
          collectedItemIds: state.collectedItemIds,
          questStates: state.questStates,
          currentSceneId: state.currentSceneId,
        }

        const actions: AvailableAction[] = []

        for (const hotspot of scene.hotspots) {
          if (!isHotspotVisible(hotspot, runtime)) continue

          for (const verb of ['look', 'take', 'talk'] as ActionType[]) {
            if (hotspot.interactions[verb]) {
              const label = verb === 'look' ? 'Look at' : verb === 'take' ? 'Pick up' : 'Talk to'
              actions.push({
                key: `${verb}-${hotspot.id}`,
                displayText: `${label} ${hotspot.label}`,
                hotspotId: hotspot.id,
                action: verb,
              })
            }
          }

          // 'use' entries: one per inventory item that has a useInteraction on this hotspot
          for (const itemId of state.inventoryItemIds) {
            if (hotspot.useInteractions?.[itemId]) {
              const itemLabel = game.items[itemId]?.label ?? itemId
              actions.push({
                key: `use-${itemId}-${hotspot.id}`,
                displayText: `Use ${itemLabel} on ${hotspot.label}`,
                hotspotId: hotspot.id,
                action: 'use',
                itemId,
              })
            }
          }
        }

        return actions
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

        if (!isHotspotVisible(hotspot, this.runtimeState)) return

        // Exits always use their 'look' interaction regardless of active action.
        // Clicking an exit = moving through it.
        if (hotspot.kind === 'exit') {
          const lookInteractions = hotspot.interactions.look
          if (lookInteractions) {
            const resolved = resolveInteraction(lookInteractions, this.runtimeState)
            if (resolved) {
              this.narrate(resolved.text)
              this.applyEffectsToStore(resolved.effects)
            }
          }
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
            hotspot.interactionFallbacks?.[action] ?? this.defaultFallback(action, hotspot.label),
          )
          return
        }

        const resolved = resolveInteraction(interactions, this.runtimeState)
        if (!resolved) {
          this.narrate(
            hotspot.interactionFallbacks?.[action] ?? this.defaultFallback(action, hotspot.label),
          )
          return
        }

        this.narrate(resolved.text)
        this.applyEffectsToStore(resolved.effects)
      },

      /** Convenience for the available-actions panel: set verb + item then interact. */
      triggerAvailableAction(entry: AvailableAction) {
        if (entry.action === 'use' && entry.itemId) {
          this.selectedInventoryItemId = entry.itemId
          this.activeAction = 'use'
        } else {
          this.activeAction = entry.action
          this.selectedInventoryItemId = null
        }
        this.interact(entry.hotspotId)
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
