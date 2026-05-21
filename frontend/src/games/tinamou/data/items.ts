import type { InventoryItemDefinition } from '@/games/adventure/types/adventureTypes'

export const tinamouItems: Record<string, InventoryItemDefinition> = {
  'ceramic-fragment': {
    id: 'ceramic-fragment',
    label: 'Ceramic Fragment',
    icon: '🧩',
    description:
      "A palm-sized ceramic fragment. Partial text reads \"...ater mem...\". The bird glyph doesn't match anything else in the gallery.",
  },
}
