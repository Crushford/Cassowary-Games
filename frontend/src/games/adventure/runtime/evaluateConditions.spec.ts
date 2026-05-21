import { describe, it, expect } from 'vitest'
import { evaluateCondition, evaluateConditions } from './evaluateConditions'
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

describe('evaluateCondition', () => {
  it('hasFlag: true when flag is set', () => {
    const state = makeState({ flags: { clueFound: true } })
    expect(evaluateCondition({ type: 'hasFlag', flag: 'clueFound' }, state)).toBe(true)
  })

  it('hasFlag: false when flag is absent', () => {
    expect(evaluateCondition({ type: 'hasFlag', flag: 'clueFound' }, makeState())).toBe(false)
  })

  it('missingFlag: true when flag is absent', () => {
    expect(evaluateCondition({ type: 'missingFlag', flag: 'clueFound' }, makeState())).toBe(true)
  })

  it('missingFlag: false when flag is set', () => {
    const state = makeState({ flags: { clueFound: true } })
    expect(evaluateCondition({ type: 'missingFlag', flag: 'clueFound' }, state)).toBe(false)
  })

  it('hasItem: true when item is in current inventory', () => {
    const state = makeState({ inventoryItemIds: ['key-card'] })
    expect(evaluateCondition({ type: 'hasItem', itemId: 'key-card' }, state)).toBe(true)
  })

  it('hasItem: false when item is not in inventory (even if collected before)', () => {
    const state = makeState({ collectedItemIds: ['key-card'] })
    expect(evaluateCondition({ type: 'hasItem', itemId: 'key-card' }, state)).toBe(false)
  })

  it('missingItem: true when item is absent from inventory', () => {
    expect(evaluateCondition({ type: 'missingItem', itemId: 'key-card' }, makeState())).toBe(true)
  })

  it('missingItem: false when item is in inventory', () => {
    const state = makeState({ inventoryItemIds: ['key-card'] })
    expect(evaluateCondition({ type: 'missingItem', itemId: 'key-card' }, state)).toBe(false)
  })

  it('questState: true when quest is in expected state', () => {
    const state = makeState({ questStates: { 'main-quest': 'active' } })
    expect(
      evaluateCondition({ type: 'questState', questId: 'main-quest', state: 'active' }, state),
    ).toBe(true)
  })

  it('questState: false when quest is in a different state', () => {
    const state = makeState({ questStates: { 'main-quest': 'done' } })
    expect(
      evaluateCondition({ type: 'questState', questId: 'main-quest', state: 'active' }, state),
    ).toBe(false)
  })

  it('questState: false when quest is absent', () => {
    expect(
      evaluateCondition({ type: 'questState', questId: 'main-quest', state: 'active' }, makeState()),
    ).toBe(false)
  })
})

describe('evaluateConditions', () => {
  it('returns true when all conditions pass', () => {
    const state = makeState({ flags: { a: true, b: true } })
    expect(
      evaluateConditions(
        [
          { type: 'hasFlag', flag: 'a' },
          { type: 'hasFlag', flag: 'b' },
        ],
        state,
      ),
    ).toBe(true)
  })

  it('returns false when any condition fails', () => {
    const state = makeState({ flags: { a: true } })
    expect(
      evaluateConditions(
        [
          { type: 'hasFlag', flag: 'a' },
          { type: 'hasFlag', flag: 'b' },
        ],
        state,
      ),
    ).toBe(false)
  })

  it('returns true for an empty conditions array', () => {
    expect(evaluateConditions([], makeState())).toBe(true)
  })
})
