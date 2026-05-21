export type ActionType = 'look' | 'take' | 'talk' | 'use'

export interface InventoryItem {
  id: string
  label: string
  icon: string
  description: string
}

/**
 * A single dialogue response variant. The first variant whose flag conditions
 * are satisfied is used. Put more specific variants before less specific ones.
 */
export interface ResponseVariant {
  text: string
  setFlags?: string[]
  /** All listed flags must be true */
  requireFlags?: string[]
  /** None of the listed flags may be true */
  excludeFlags?: string[]
}

export interface CollectibleDrop {
  item: InventoryItem
  /** Shown when the player picks the item up */
  text: string
}

export type HotspotVisualType = 'plaque' | 'door' | 'case' | 'fragment' | 'character'

export interface Hotspot {
  id: string
  label: string
  /** Left edge, as percentage of scene width */
  x: number
  /** Top edge, as percentage of scene height */
  y: number
  /** Width as percentage of scene width */
  width: number
  /** Height as percentage of scene height */
  height: number
  visualType: HotspotVisualType
  look: ResponseVariant[]
  /** If present, Pick Up is valid and adds this item to inventory */
  take?: CollectibleDrop
  invalidTake?: string
  talk?: ResponseVariant[]
  invalidTalk?: string
  /** Keys are inventory item IDs */
  use?: Record<string, ResponseVariant[]>
  invalidUse?: string
}

export interface Scene {
  id: string
  name: string
  subtitle?: string
  hotspots: Hotspot[]
}

export interface ResolvedResponse {
  text: string
  setFlags?: string[]
}
