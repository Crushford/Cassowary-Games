import type { AdventureGameDefinition, Interaction } from '../types/adventureTypes'

export interface ValidationIssue {
  level: 'error' | 'warning'
  message: string
  path?: string
}

function allInteractionsIn(hotspot: AdventureGameDefinition['scenes'][string]['hotspots'][number]): Interaction[] {
  return [
    ...Object.values(hotspot.interactions).flat(),
    ...Object.values(hotspot.useInteractions ?? {}).flat(),
  ]
}

export function validateGameDefinition(game: AdventureGameDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Initial scene must exist
  if (!game.scenes[game.initialSceneId]) {
    issues.push({
      level: 'error',
      message: `Initial scene '${game.initialSceneId}' is not defined in scenes`,
    })
  }

  for (const [sceneId, scene] of Object.entries(game.scenes)) {
    for (const hotspot of scene.hotspots) {
      const path = `${sceneId}/${hotspot.id}`

      // Every hotspot should have at least one interaction
      const hasAny =
        Object.keys(hotspot.interactions).length > 0 ||
        Object.keys(hotspot.useInteractions ?? {}).length > 0
      if (!hasAny) {
        issues.push({
          level: 'warning',
          message: `Hotspot '${hotspot.id}' in scene '${sceneId}' has no interactions`,
          path,
        })
      }

      for (const interaction of allInteractionsIn(hotspot)) {
        for (const effect of interaction.effects ?? []) {
          if (effect.type === 'moveToScene' && !game.scenes[effect.sceneId]) {
            issues.push({
              level: 'error',
              message: `Effect references scene '${effect.sceneId}' which does not exist`,
              path,
            })
          }
          if (effect.type === 'addItem' && !game.items[effect.itemId]) {
            issues.push({
              level: 'error',
              message: `Effect references item '${effect.itemId}' which is not defined in items`,
              path,
            })
          }
          if (effect.type === 'setQuestState' && game.quests && !game.quests[effect.questId]) {
            issues.push({
              level: 'warning',
              message: `Effect references quest '${effect.questId}' which is not defined in quests`,
              path,
            })
          }
        }
      }

      // collectibleItemId must exist in items
      if (hotspot.collectibleItemId && !game.items[hotspot.collectibleItemId]) {
        issues.push({
          level: 'error',
          message: `collectibleItemId '${hotspot.collectibleItemId}' is not defined in items`,
          path,
        })
      }
    }
  }

  return issues
}
