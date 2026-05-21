import type { QuestDefinition } from '@/games/adventure/types/adventureTypes'

export const tinamouQuests: Record<string, QuestDefinition> = {
  'museum-disturbance': {
    id: 'museum-disturbance',
    title: 'Something Wrong in Gallery Four',
    description: 'Something in Gallery Four is not what the labels say it is.',
    states: ['inactive', 'noticed', 'active', 'investigating', 'deepening'],
  },
}
