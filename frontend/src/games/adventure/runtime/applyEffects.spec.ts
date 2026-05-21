import { describe, it, expect } from 'vitest'
import { applyEffect, applyEffects } from './applyEffects'
import type { AdventureRuntimeState } from '../types/adventureTypes'

function makeState(partial: Partial<AdventureRuntimeState> = {}): AdventureRuntimeState {
  return {
    flags: {},
    inventoryItemIds: [],
    collectedItemIds: [],
    questStates: {},
    currentSceneId: 'scene-1',
    ...partial,
  }
}

describe('applyEffect', () => {
  describe('setFlag', () => {
    it('adds the flag', () => {
      const state = makeState()
      applyEffect({ type: 'setFlag', flag: 'doorOpened' }, state)
      expect(state.flags.doorOpened).toBe(true)
    })

    it('does not remove other flags', () => {
      const state = makeState({ flags: { existingFlag: true } })
      applyEffect({ type: 'setFlag', flag: 'newFlag' }, state)
      expect(state.flags.existingFlag).toBe(true)
      expect(state.flags.newFlag).toBe(true)
    })
  })

  describe('addItem', () => {
    it('adds to inventoryItemIds and collectedItemIds', () => {
      const state = makeState()
      applyEffect({ type: 'addItem', itemId: 'old-key' }, state)
      expect(state.inventoryItemIds).toContain('old-key')
      expect(state.collectedItemIds).toContain('old-key')
    })

    it('does not duplicate an already-held item', () => {
      const state = makeState({ inventoryItemIds: ['old-key'], collectedItemIds: ['old-key'] })
      applyEffect({ type: 'addItem', itemId: 'old-key' }, state)
      expect(state.inventoryItemIds.filter((id) => id === 'old-key')).toHaveLength(1)
    })

    it('re-adds to inventoryItemIds if previously removed but not re-collected', () => {
      const state = makeState({ inventoryItemIds: [], collectedItemIds: ['old-key'] })
      applyEffect({ type: 'addItem', itemId: 'old-key' }, state)
      expect(state.inventoryItemIds).toContain('old-key')
    })
  })

  describe('removeItem', () => {
    it('removes from inventoryItemIds but keeps in collectedItemIds', () => {
      const state = makeState({
        inventoryItemIds: ['old-key', 'candle'],
        collectedItemIds: ['old-key', 'candle'],
      })
      applyEffect({ type: 'removeItem', itemId: 'old-key' }, state)
      expect(state.inventoryItemIds).not.toContain('old-key')
      expect(state.collectedItemIds).toContain('old-key')
      expect(state.inventoryItemIds).toContain('candle')
    })

    it('is a no-op when item is not in inventory', () => {
      const state = makeState({ inventoryItemIds: ['candle'] })
      applyEffect({ type: 'removeItem', itemId: 'missing' }, state)
      expect(state.inventoryItemIds).toEqual(['candle'])
    })
  })

  describe('setQuestState', () => {
    it('sets the quest to the given state', () => {
      const state = makeState()
      applyEffect({ type: 'setQuestState', questId: 'main-quest', state: 'active' }, state)
      expect(state.questStates['main-quest']).toBe('active')
    })

    it('overwrites an existing quest state', () => {
      const state = makeState({ questStates: { 'main-quest': 'active' } })
      applyEffect({ type: 'setQuestState', questId: 'main-quest', state: 'done' }, state)
      expect(state.questStates['main-quest']).toBe('done')
    })
  })

  describe('moveToScene', () => {
    it('updates currentSceneId', () => {
      const state = makeState({ currentSceneId: 'scene-1' })
      applyEffect({ type: 'moveToScene', sceneId: 'scene-2' }, state)
      expect(state.currentSceneId).toBe('scene-2')
    })
  })
})

describe('applyEffects', () => {
  it('applies all effects in order', () => {
    const state = makeState()
    applyEffects(
      [
        { type: 'setFlag', flag: 'found' },
        { type: 'addItem', itemId: 'torch' },
        { type: 'setQuestState', questId: 'q1', state: 'started' },
      ],
      state,
    )
    expect(state.flags.found).toBe(true)
    expect(state.inventoryItemIds).toContain('torch')
    expect(state.questStates['q1']).toBe('started')
  })

  it('is a no-op for an empty array', () => {
    const state = makeState({ flags: { existing: true } })
    applyEffects([], state)
    expect(state.flags).toEqual({ existing: true })
  })
})
