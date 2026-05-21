import type { AdventureGameDefinition } from '@/games/adventure/types/adventureTypes'
import { tinamouItems } from './items'
import { tinamouQuests } from './quests'
import { galleryFourScene } from './scenes/galleryFour'
import { maintenanceCorridorScene } from './scenes/maintenanceCorridor'

export const tinamouMysteryGame: AdventureGameDefinition = {
  id: 'tinamou-mystery',
  title: 'Tinamou Mystery',
  initialSceneId: 'museum-gallery-4',
  initialQuestStates: { 'museum-disturbance': 'inactive' },
  items: tinamouItems,
  scenes: {
    'museum-gallery-4': galleryFourScene,
    'maintenance-corridor': maintenanceCorridorScene,
  },
  quests: tinamouQuests,
}
