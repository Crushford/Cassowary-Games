import { createAdventureStore } from '@/games/adventure/stores/createAdventureStore'
import { tinamouMysteryGame } from '../data/tinamouMysteryGame'

export const useTinamouAdventureStore = createAdventureStore(
  tinamouMysteryGame,
  'tinamou-adventure',
)
