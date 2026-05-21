import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAdventureStore } from './createAdventureStore'
import type { AdventureGameDefinition } from '../types/adventureTypes'

// ── Minimal fixture game ──────────────────────────────────────────────────────

const testGame: AdventureGameDefinition = {
  id: 'test',
  title: 'Test Game',
  initialSceneId: 'room-a',
  initialQuestStates: { 'main-quest': 'inactive' },

  items: {
    key: { id: 'key', label: 'Old Key', icon: '🗝', description: 'An old key.' },
    note: { id: 'note', label: 'Torn Note', icon: '📄', description: 'A torn note.' },
  },

  scenes: {
    'room-a': {
      id: 'room-a',
      name: 'Room A',
      hotspots: [
        {
          id: 'desk',
          label: 'Desk',
          kind: 'object',
          visualType: 'default',
          position: { x: 10, y: 10, width: 20, height: 20 },
          interactions: {
            look: [
              {
                conditions: [{ type: 'hasFlag', flag: 'lightsOn' }],
                text: 'You see a key on the desk.',
                effects: [{ type: 'setFlag', flag: 'sawKey' }],
              },
              {
                text: 'Too dark to see much.',
              },
            ],
            talk: [
              { text: "It's a desk. It doesn't respond." },
            ],
          },
          interactionFallbacks: {
            take: "You can't take the whole desk.",
          },
        },
        {
          id: 'floor-key',
          label: 'Old Key',
          kind: 'item',
          visualType: 'fragment',
          position: { x: 40, y: 70, width: 5, height: 5 },
          collectibleItemId: 'key',
          interactions: {
            look: [{ text: 'A small key on the floor.' }],
            take: [
              {
                text: 'You pick up the key.',
                effects: [
                  { type: 'addItem', itemId: 'key' },
                  { type: 'setQuestState', questId: 'main-quest', state: 'started' },
                ],
              },
            ],
          },
        },
        {
          // Only visible once key is collected
          id: 'hidden-note',
          label: 'Hidden Note',
          kind: 'item',
          visualType: 'fragment',
          position: { x: 50, y: 70, width: 5, height: 5 },
          collectibleItemId: 'note',
          visibleWhen: [{ type: 'hasItem', itemId: 'key' }],
          interactions: {
            take: [
              {
                text: 'You take the note.',
                effects: [{ type: 'addItem', itemId: 'note' }],
              },
            ],
          },
        },
        {
          id: 'exit-to-b',
          label: 'Exit to Room B',
          kind: 'exit',
          visualType: 'exit',
          position: { x: 80, y: 30, width: 12, height: 35 },
          interactions: {
            look: [
              {
                text: 'You move into Room B.',
                effects: [{ type: 'moveToScene', sceneId: 'room-b' }],
              },
            ],
          },
        },
        {
          // Only appears after key is collected
          id: 'locked-box',
          label: 'Locked Box',
          kind: 'object',
          visualType: 'case',
          position: { x: 60, y: 20, width: 15, height: 20 },
          visibleWhen: [{ type: 'hasItem', itemId: 'key' }],
          interactions: {
            look: [{ text: 'A locked box. You have a key...' }],
          },
          useInteractions: {
            key: [
              {
                text: 'The key fits. The box is empty. Of course it is.',
                effects: [{ type: 'setFlag', flag: 'openedBox' }],
              },
            ],
          },
        },
      ],
    },
    'room-b': {
      id: 'room-b',
      name: 'Room B',
      hotspots: [
        {
          id: 'exit-to-a',
          label: 'Back to Room A',
          kind: 'exit',
          visualType: 'exit',
          position: { x: 5, y: 30, width: 10, height: 35 },
          interactions: {
            look: [
              {
                text: 'You return to Room A.',
                effects: [{ type: 'moveToScene', sceneId: 'room-a' }],
              },
            ],
          },
        },
      ],
    },
  },

  quests: {
    'main-quest': {
      id: 'main-quest',
      title: 'Test Quest',
      states: ['inactive', 'started', 'done'],
    },
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore() {
  const useStore = createAdventureStore(testGame, `test-store-${Math.random()}`)
  return useStore()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createAdventureStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('starts in the initial scene', () => {
      const store = makeStore()
      expect(store.currentSceneId).toBe('room-a')
    })

    it('loads initial quest states', () => {
      const store = makeStore()
      expect(store.questStates['main-quest']).toBe('inactive')
    })

    it('starts with empty inventory and flags', () => {
      const store = makeStore()
      expect(store.inventoryItemIds).toHaveLength(0)
      expect(Object.keys(store.flags)).toHaveLength(0)
    })
  })

  describe('visibleHotspots', () => {
    it('shows hotspots without visibleWhen by default', () => {
      const store = makeStore()
      const ids = store.visibleHotspots.map((h) => h.id)
      expect(ids).toContain('desk')
      expect(ids).toContain('floor-key')
      expect(ids).toContain('exit-to-b')
    })

    it('hides hotspots whose visibleWhen conditions are not met', () => {
      const store = makeStore()
      const ids = store.visibleHotspots.map((h) => h.id)
      expect(ids).not.toContain('hidden-note')
      expect(ids).not.toContain('locked-box')
    })

    it('reveals hotspots once visibleWhen conditions are met', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('floor-key')
      const ids = store.visibleHotspots.map((h) => h.id)
      expect(ids).toContain('hidden-note')
      expect(ids).toContain('locked-box')
    })

    it('hides collectible items once collected', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('floor-key')
      const ids = store.visibleHotspots.map((h) => h.id)
      expect(ids).not.toContain('floor-key')
    })
  })

  describe('interaction resolution', () => {
    it('resolves the first matching variant', () => {
      const store = makeStore()
      store.setActiveAction('look')
      store.interact('desk')
      expect(store.currentNarration).toBe('Too dark to see much.')
    })

    it('uses a higher-priority variant when its condition is met', () => {
      const store = makeStore()
      store.flags['lightsOn'] = true
      store.setActiveAction('look')
      store.interact('desk')
      expect(store.currentNarration).toBe('You see a key on the desk.')
    })

    it('sets flags from interaction effects', () => {
      const store = makeStore()
      store.flags['lightsOn'] = true
      store.setActiveAction('look')
      store.interact('desk')
      expect(store.flags['sawKey']).toBe(true)
    })

    it('shows fallback when no interaction exists for the action', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('desk')
      expect(store.currentNarration).toContain("can't take the whole desk")
    })

    it('shows default engine fallback for unmapped actions', () => {
      const store = makeStore()
      store.setActiveAction('use')
      store.interact('desk')
      expect(store.currentNarration).toContain('Select an item')
    })
  })

  describe('inventory', () => {
    it('adds item to inventory on take', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('floor-key')
      expect(store.inventoryItemIds).toContain('key')
    })

    it('tracks item as collected even after removal from inventory', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('floor-key')
      store.applyEffectsToStore([{ type: 'removeItem', itemId: 'key' }])
      expect(store.inventoryItemIds).not.toContain('key')
      expect(store.collectedItemIds).toContain('key')
    })

    it('resolves useInteraction when item is selected', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('floor-key')
      store.selectInventoryItem('key')
      store.interact('locked-box')
      expect(store.currentNarration).toContain('The key fits')
      expect(store.flags['openedBox']).toBe(true)
    })

    it('narrates fallback when item has no useInteraction for the target', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('floor-key')
      store.selectInventoryItem('key')
      store.interact('desk')
      expect(store.currentNarration).toContain('Nothing interesting happens')
    })
  })

  describe('quest state', () => {
    it('updates quest state via effect', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('floor-key')
      expect(store.questStates['main-quest']).toBe('started')
    })
  })

  describe('scene movement', () => {
    it('exits always trigger moveToScene regardless of active action', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('exit-to-b')
      expect(store.currentSceneId).toBe('room-b')
    })

    it('moves to the correct scene on exit click', () => {
      const store = makeStore()
      store.interact('exit-to-b')
      expect(store.currentSceneId).toBe('room-b')
    })

    it('can move back to original scene', () => {
      const store = makeStore()
      store.interact('exit-to-b')
      store.interact('exit-to-a')
      expect(store.currentSceneId).toBe('room-a')
    })

    it('preserves flags and inventory across scene changes', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('floor-key')
      store.interact('exit-to-b')
      expect(store.inventoryItemIds).toContain('key')
      expect(store.questStates['main-quest']).toBe('started')
    })
  })

  describe('availableActions', () => {
    it('lists look and take for a collectible item', () => {
      const store = makeStore()
      const keys = store.availableActions.map((a) => a.key)
      expect(keys).toContain('look-floor-key')
      expect(keys).toContain('take-floor-key')
    })

    it('does not list actions for hidden hotspots', () => {
      const store = makeStore()
      const keys = store.availableActions.map((a) => a.key)
      expect(keys).not.toContain('look-hidden-note')
    })

    it('lists use actions for items in inventory', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('floor-key')
      const keys = store.availableActions.map((a) => a.key)
      expect(keys).toContain('use-key-locked-box')
    })

    it('does not list use actions for items not in inventory', () => {
      const store = makeStore()
      const keys = store.availableActions.map((a) => a.key)
      expect(keys.some((k) => k.startsWith('use-key'))).toBe(false)
    })
  })

  describe('resetGame', () => {
    it('restores initial scene and clears state', () => {
      const store = makeStore()
      store.setActiveAction('take')
      store.interact('floor-key')
      store.interact('exit-to-b')
      store.resetGame()
      expect(store.currentSceneId).toBe('room-a')
      expect(store.inventoryItemIds).toHaveLength(0)
      expect(Object.keys(store.flags)).toHaveLength(0)
      expect(store.questStates['main-quest']).toBe('inactive')
    })
  })
})
