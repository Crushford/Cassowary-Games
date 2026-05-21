import { describe, it, expect } from 'vitest'
import { validateGameDefinition } from './validateGameDefinition'
import type { AdventureGameDefinition } from '../types/adventureTypes'

function makeGame(overrides: Partial<AdventureGameDefinition> = {}): AdventureGameDefinition {
  return {
    id: 'test',
    title: 'Test',
    initialSceneId: 'scene-a',
    items: {
      key: { id: 'key', label: 'Key', icon: '🗝', description: '' },
    },
    scenes: {
      'scene-a': {
        id: 'scene-a',
        name: 'Scene A',
        hotspots: [
          {
            id: 'box',
            label: 'Box',
            kind: 'object',
            visualType: 'case',
            position: { x: 10, y: 10, width: 10, height: 10 },
            interactions: {
              look: [{ text: 'A box.' }],
            },
          },
        ],
      },
    },
    quests: {
      'main-quest': {
        id: 'main-quest',
        title: 'Main Quest',
        states: ['inactive', 'active', 'done'],
      },
    },
    ...overrides,
  }
}

describe('validateGameDefinition', () => {
  it('returns no issues for a valid game', () => {
    expect(validateGameDefinition(makeGame())).toHaveLength(0)
  })

  describe('top-level', () => {
    it('errors when initialSceneId is missing', () => {
      const game = makeGame({ initialSceneId: 'does-not-exist' })
      const issues = validateGameDefinition(game)
      expect(issues.some((i) => i.level === 'error' && i.message.includes('Initial scene'))).toBe(
        true,
      )
    })
  })

  describe('hotspot coverage', () => {
    it('warns when a hotspot has no interactions', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots.push({
        id: 'silent',
        label: 'Silent Object',
        kind: 'object',
        visualType: 'default',
        position: { x: 0, y: 0, width: 5, height: 5 },
        interactions: {},
      })
      const issues = validateGameDefinition(game)
      expect(issues.some((i) => i.level === 'warning' && i.message.includes('no interactions'))).toBe(
        true,
      )
    })

    it('errors when collectibleItemId references a missing item', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].collectibleItemId = 'ghost-item'
      const issues = validateGameDefinition(game)
      expect(
        issues.some((i) => i.level === 'error' && i.message.includes('ghost-item')),
      ).toBe(true)
    })
  })

  describe('effect validation', () => {
    it('errors when moveToScene targets a missing scene', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.look = [
        { text: 'go', effects: [{ type: 'moveToScene', sceneId: 'nowhere' }] },
      ]
      const issues = validateGameDefinition(game)
      expect(issues.some((i) => i.level === 'error' && i.message.includes('nowhere'))).toBe(true)
    })

    it('errors when addItem references a missing item', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.take = [
        { text: 'take', effects: [{ type: 'addItem', itemId: 'phantom' }] },
      ]
      const issues = validateGameDefinition(game)
      expect(issues.some((i) => i.level === 'error' && i.message.includes('phantom'))).toBe(true)
    })

    it('errors when removeItem references a missing item', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.take = [
        { text: 'use', effects: [{ type: 'removeItem', itemId: 'ghost' }] },
      ]
      const issues = validateGameDefinition(game)
      expect(issues.some((i) => i.level === 'error' && i.message.includes('ghost'))).toBe(true)
    })

    it('warns when setQuestState references a missing quest', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.look = [
        { text: 'look', effects: [{ type: 'setQuestState', questId: 'ghost-quest', state: 'active' }] },
      ]
      const issues = validateGameDefinition(game)
      expect(issues.some((i) => i.message.includes('ghost-quest'))).toBe(true)
    })

    it('errors when setQuestState uses an invalid state', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.look = [
        {
          text: 'look',
          effects: [{ type: 'setQuestState', questId: 'main-quest', state: 'invalid-state' }],
        },
      ]
      const issues = validateGameDefinition(game)
      expect(
        issues.some((i) => i.level === 'error' && i.message.includes('invalid-state')),
      ).toBe(true)
    })

    it('passes for a valid setQuestState', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.look = [
        { text: 'look', effects: [{ type: 'setQuestState', questId: 'main-quest', state: 'active' }] },
      ]
      const issues = validateGameDefinition(game)
      expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })

  describe('condition validation', () => {
    it('warns when hasItem references a missing item', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.look = [
        {
          conditions: [{ type: 'hasItem', itemId: 'phantom-item' }],
          text: 'conditional look',
        },
      ]
      const issues = validateGameDefinition(game)
      expect(issues.some((i) => i.message.includes('phantom-item'))).toBe(true)
    })

    it('warns when missingItem references a missing item', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.look = [
        {
          conditions: [{ type: 'missingItem', itemId: 'ghost-item' }],
          text: 'look',
        },
      ]
      const issues = validateGameDefinition(game)
      expect(issues.some((i) => i.message.includes('ghost-item'))).toBe(true)
    })

    it('warns when questState condition references a missing quest', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.look = [
        {
          conditions: [{ type: 'questState', questId: 'no-quest', state: 'active' }],
          text: 'look',
        },
      ]
      const issues = validateGameDefinition(game)
      expect(issues.some((i) => i.message.includes('no-quest'))).toBe(true)
    })

    it('errors when questState condition uses an invalid state', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.look = [
        {
          conditions: [{ type: 'questState', questId: 'main-quest', state: 'typo-state' }],
          text: 'look',
        },
      ]
      const issues = validateGameDefinition(game)
      expect(
        issues.some((i) => i.level === 'error' && i.message.includes('typo-state')),
      ).toBe(true)
    })

    it('passes for valid condition item ids', () => {
      const game = makeGame()
      game.scenes['scene-a'].hotspots[0].interactions.look = [
        {
          conditions: [{ type: 'hasItem', itemId: 'key' }],
          text: 'look',
        },
      ]
      expect(validateGameDefinition(game).filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })
})
