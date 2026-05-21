import { defineStore } from 'pinia'
import type { ActionType, InventoryItem, ResponseVariant, ResolvedResponse } from '../types/types'
import { galleryFourScene, scenes } from '../data/scenes'

interface TinamouState {
  currentSceneId: string
  flags: Record<string, boolean>
  inventory: InventoryItem[]
  collectedItemIds: string[]
  activeAction: ActionType
  selectedInventoryItemId: string | null
  currentDialogue: string | null
  dialogueHistory: string[]
}

function resolveVariants(
  variants: ResponseVariant[],
  flags: Record<string, boolean>,
): ResolvedResponse | null {
  for (const variant of variants) {
    const allRequired = (variant.requireFlags ?? []).every((f) => flags[f])
    const noneExcluded = (variant.excludeFlags ?? []).every((f) => !flags[f])
    if (allRequired && noneExcluded) {
      return { text: variant.text, setFlags: variant.setFlags }
    }
  }
  return null
}

export const useTinamouStore = defineStore('tinamou', {
  state: (): TinamouState => ({
    currentSceneId: 'museum-gallery-4',
    flags: {},
    inventory: [],
    collectedItemIds: [],
    activeAction: 'look',
    selectedInventoryItemId: null,
    currentDialogue: null,
    dialogueHistory: [],
  }),

  getters: {
    currentScene: (state) => scenes.find((s) => s.id === state.currentSceneId) ?? galleryFourScene,

    hasFlag: (state) => (flag: string) => !!state.flags[flag],

    hasItem: (state) => (id: string) => state.inventory.some((i) => i.id === id),

    isCollected: (state) => (id: string) => state.collectedItemIds.includes(id),

    selectedInventoryItem: (state) =>
      state.inventory.find((i) => i.id === state.selectedInventoryItemId) ?? null,
  },

  actions: {
    setFlag(flag: string) {
      this.flags[flag] = true
    },

    addToInventory(item: InventoryItem) {
      if (!this.hasItem(item.id)) {
        this.inventory.push(item)
      }
      if (!this.collectedItemIds.includes(item.id)) {
        this.collectedItemIds.push(item.id)
      }
    },

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

    showDialogue(text: string) {
      this.currentDialogue = text
      this.dialogueHistory.push(text)
    },

    applyResponse(response: ResolvedResponse) {
      this.showDialogue(response.text)
      for (const flag of response.setFlags ?? []) {
        this.setFlag(flag)
      }
    },

    interact(hotspotId: string) {
      const scene = this.currentScene
      if (!scene) return

      const hotspot = scene.hotspots.find((h) => h.id === hotspotId)
      if (!hotspot) return

      if (hotspot.take && this.isCollected(hotspotId)) return

      const action = this.activeAction
      const itemId = this.selectedInventoryItemId

      if (action === 'use') {
        if (itemId) {
          const useVariants = hotspot.use?.[itemId]
          if (useVariants) {
            const response = resolveVariants(useVariants, this.flags)
            if (response) {
              this.applyResponse(response)
              return
            }
          }
          const itemLabel = this.inventory.find((i) => i.id === itemId)?.label ?? 'item'
          this.showDialogue(
            hotspot.invalidUse ??
              `You try using the ${itemLabel} on the ${hotspot.label}. Nothing interesting happens.`,
          )
        } else {
          this.showDialogue('Select an item from your inventory first, then click a hotspot.')
        }
        return
      }

      if (action === 'take') {
        if (hotspot.take && !this.isCollected(hotspotId)) {
          this.addToInventory(hotspot.take.item)
          this.showDialogue(hotspot.take.text)
        } else {
          this.showDialogue(
            hotspot.invalidTake ??
              `You briefly consider taking the ${hotspot.label}. Common sense prevails.`,
          )
        }
        return
      }

      if (action === 'look') {
        const response = resolveVariants(hotspot.look, this.flags)
        if (response) {
          this.applyResponse(response)
        }
        return
      }

      if (action === 'talk') {
        if (hotspot.talk) {
          const response = resolveVariants(hotspot.talk, this.flags)
          if (response) {
            this.applyResponse(response)
          }
        } else {
          this.showDialogue(
            hotspot.invalidTalk ??
              `You address the ${hotspot.label}. It does not respond. The ${hotspot.label} does not have opinions about this.`,
          )
        }
        return
      }
    },

    resetGame() {
      this.flags = {}
      this.inventory = []
      this.collectedItemIds = []
      this.activeAction = 'look'
      this.selectedInventoryItemId = null
      this.currentDialogue = null
      this.dialogueHistory = []
    },
  },
})
