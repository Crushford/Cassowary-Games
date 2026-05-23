import { describe, it, expect } from 'vitest'
import { resolveInteraction } from './resolveInteraction'
import type { Interaction, AdventureRuntimeState } from '../types/adventureTypes'

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

describe('resolveInteraction', () => {
  it('returns null for an empty list', () => {
    expect(resolveInteraction([], makeState())).toBeNull()
  })

  it('returns the first unconditional interaction', () => {
    const interactions: Interaction[] = [{ text: 'default response' }]
    const result = resolveInteraction(interactions, makeState())
    expect(result?.text).toBe('default response')
  })

  it('returns effects alongside text', () => {
    const interactions: Interaction[] = [
      {
        text: 'you find a key',
        effects: [{ type: 'addItem', itemId: 'brass-key' }],
      },
    ]
    const result = resolveInteraction(interactions, makeState())
    expect(result?.effects).toHaveLength(1)
    expect(result?.effects[0]).toEqual({ type: 'addItem', itemId: 'brass-key' })
  })

  it('skips interactions whose conditions are not met', () => {
    const interactions: Interaction[] = [
      {
        conditions: [{ type: 'hasFlag', flag: 'doorOpen' }],
        text: 'you walk through',
      },
      {
        text: 'the door is shut',
      },
    ]
    const result = resolveInteraction(interactions, makeState())
    expect(result?.text).toBe('the door is shut')
  })

  it('returns the first matching interaction when conditions pass', () => {
    const state = makeState({ flags: { doorOpen: true } })
    const interactions: Interaction[] = [
      {
        conditions: [{ type: 'hasFlag', flag: 'doorOpen' }],
        text: 'you walk through',
      },
      {
        text: 'the door is shut',
      },
    ]
    const result = resolveInteraction(interactions, state)
    expect(result?.text).toBe('you walk through')
  })

  it('respects multiple conditions — all must pass', () => {
    const state = makeState({ flags: { hasKey: true } })
    const interactions: Interaction[] = [
      {
        conditions: [
          { type: 'hasFlag', flag: 'hasKey' },
          { type: 'hasFlag', flag: 'doorOpen' },
        ],
        text: 'both conditions met',
      },
      {
        text: 'fallback',
      },
    ]
    const result = resolveInteraction(interactions, state)
    expect(result?.text).toBe('fallback')
  })

  it('returns null when all interactions have failing conditions', () => {
    const interactions: Interaction[] = [
      {
        conditions: [{ type: 'hasFlag', flag: 'never' }],
        text: 'unreachable',
      },
    ]
    expect(resolveInteraction(interactions, makeState())).toBeNull()
  })

  it('defaults effects to empty array when not specified', () => {
    const interactions: Interaction[] = [{ text: 'simple response' }]
    const result = resolveInteraction(interactions, makeState())
    expect(result?.effects).toEqual([])
  })
})
