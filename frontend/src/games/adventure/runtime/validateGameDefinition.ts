import type {
  AdventureGameDefinition,
  Interaction,
  Condition,
  Effect,
  HotspotDefinition,
} from '../types/adventureTypes'

export interface ValidationIssue {
  level: 'error' | 'warning'
  message: string
  path?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function allInteractions(hotspot: HotspotDefinition): Interaction[] {
  return [
    ...Object.values(hotspot.interactions).flat(),
    ...Object.values(hotspot.useInteractions ?? {}).flat(),
  ]
}

function allConditions(interactions: Interaction[]): Condition[] {
  return interactions.flatMap((i) => i.conditions ?? [])
}

function allEffects(interactions: Interaction[]): Effect[] {
  return interactions.flatMap((i) => i.effects ?? [])
}

// ── Validator ─────────────────────────────────────────────────────────────────

export function validateGameDefinition(game: AdventureGameDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const push = (level: ValidationIssue['level'], message: string, path?: string) =>
    issues.push({ level, message, path })

  // ── Top-level ───────────────────────────────────────────────────────────

  if (!game.scenes[game.initialSceneId]) {
    push('error', `Initial scene '${game.initialSceneId}' is not defined in scenes`)
  }

  // ── Per hotspot ─────────────────────────────────────────────────────────

  for (const [sceneId, scene] of Object.entries(game.scenes)) {
    for (const hotspot of scene.hotspots) {
      const path = `${sceneId}/${hotspot.id}`
      const interactions = allInteractions(hotspot)
      const conditions = allConditions(interactions)
      const effects = allEffects(interactions)

      // Every hotspot should have at least one interaction
      if (interactions.length === 0) {
        push('warning', `Hotspot '${hotspot.id}' in scene '${sceneId}' has no interactions`, path)
      }

      // collectibleItemId must be defined in items
      if (hotspot.collectibleItemId && !game.items[hotspot.collectibleItemId]) {
        push(
          'error',
          `collectibleItemId '${hotspot.collectibleItemId}' is not defined in items`,
          path,
        )
      }

      // ── Condition validation ──────────────────────────────────────────

      for (const condition of conditions) {
        if (
          (condition.type === 'hasItem' || condition.type === 'missingItem') &&
          !game.items[condition.itemId]
        ) {
          push(
            'warning',
            `Condition '${condition.type}' references item '${condition.itemId}' not defined in items`,
            path,
          )
        }

        if (condition.type === 'questState') {
          const quest = game.quests?.[condition.questId]
          if (!quest) {
            push(
              'warning',
              `Condition 'questState' references quest '${condition.questId}' not defined in quests`,
              path,
            )
          } else if (!quest.states.includes(condition.state)) {
            push(
              'error',
              `Condition 'questState' references invalid state '${condition.state}' for quest '${condition.questId}' (valid: ${quest.states.join(', ')})`,
              path,
            )
          }
        }
      }

      // ── Effect validation ─────────────────────────────────────────────

      for (const effect of effects) {
        if (effect.type === 'moveToScene' && !game.scenes[effect.sceneId]) {
          push('error', `Effect 'moveToScene' references scene '${effect.sceneId}' not defined`, path)
        }

        if (
          (effect.type === 'addItem' || effect.type === 'removeItem') &&
          !game.items[effect.itemId]
        ) {
          push(
            'error',
            `Effect '${effect.type}' references item '${effect.itemId}' not defined in items`,
            path,
          )
        }

        if (effect.type === 'setQuestState') {
          const quest = game.quests?.[effect.questId]
          if (!quest) {
            push(
              'warning',
              `Effect 'setQuestState' references quest '${effect.questId}' not defined in quests`,
              path,
            )
          } else if (!quest.states.includes(effect.state)) {
            push(
              'error',
              `Effect 'setQuestState' uses invalid state '${effect.state}' for quest '${effect.questId}' (valid: ${quest.states.join(', ')})`,
              path,
            )
          }
        }
      }
    }
  }

  return issues
}
