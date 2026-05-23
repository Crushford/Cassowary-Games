export type ActionType = 'look' | 'take' | 'talk' | 'use'

// ── Conditions ──────────────────────────────────────────────────────────────

export type Condition =
  | { type: 'hasFlag'; flag: string }
  | { type: 'missingFlag'; flag: string }
  | { type: 'hasItem'; itemId: string }
  | { type: 'missingItem'; itemId: string }
  | { type: 'questState'; questId: string; state: string }

// ── Effects ──────────────────────────────────────────────────────────────────

export type Effect =
  | { type: 'setFlag'; flag: string }
  | { type: 'addItem'; itemId: string }
  | { type: 'removeItem'; itemId: string }
  | { type: 'setQuestState'; questId: string; state: string }
  | { type: 'moveToScene'; sceneId: string }

// ── Interaction ───────────────────────────────────────────────────────────────

/** A single candidate response. The first one whose conditions all pass is used. */
export interface Interaction {
  conditions?: Condition[]
  text: string
  effects?: Effect[]
}

// ── Hotspot ───────────────────────────────────────────────────────────────────

export type HotspotKind = 'object' | 'character' | 'item' | 'exit'

/**
 * Controls how the hotspot is drawn. 'default' is a plain interactive region.
 * Content is driven by `visualContent`, not by game-specific data baked into the engine.
 */
export type HotspotVisualType =
  | 'plaque'
  | 'door'
  | 'case'
  | 'fragment'
  | 'character'
  | 'exit'
  | 'default'

export interface HotspotVisualContent {
  /** Emoji or single symbol shown inside character, item, or case shapes */
  symbol?: string
  /** Primary text shown inside plaque or case */
  title?: string
  /** Secondary / subtitle text */
  subtitle?: string
  /** Small badge label (character name-tag, door signage) */
  badge?: string
}

export interface HotspotDefinition {
  id: string
  label: string
  kind: HotspotKind
  visualType: HotspotVisualType
  visualContent?: HotspotVisualContent
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  /**
   * When this item id appears in `collectedItemIds`, the hotspot is hidden from the scene.
   * Used for physical items the player can pick up.
   */
  collectibleItemId?: string
  /**
   * All conditions must pass for this hotspot to appear in the scene.
   * Used to reveal exits, objects, or characters based on game progress.
   */
  visibleWhen?: Condition[]
  /** Interactions keyed by action verb */
  interactions: Partial<Record<ActionType, Interaction[]>>
  /** Interactions for using a specific inventory item on this hotspot */
  useInteractions?: Record<string, Interaction[]>
  /** Per-action fallback text shown when no interaction matches */
  interactionFallbacks?: Partial<Record<ActionType, string>>
  /** Fallback shown when using any item on this hotspot produces no match */
  useFallback?: string
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export interface InventoryItemDefinition {
  id: string
  label: string
  icon: string
  description: string
}

// ── Scene ──────────────────────────────────────────────────────────────────────

export interface SceneDefinition {
  id: string
  name: string
  subtitle?: string
  hotspots: HotspotDefinition[]
}

// ── Quest ──────────────────────────────────────────────────────────────────────

export interface QuestDefinition {
  id: string
  title: string
  description?: string
  states: string[]
}

// ── Game Definition ────────────────────────────────────────────────────────────

export interface AdventureGameDefinition {
  id: string
  title: string
  initialSceneId: string
  initialQuestStates?: Record<string, string>
  items: Record<string, InventoryItemDefinition>
  scenes: Record<string, SceneDefinition>
  quests?: Record<string, QuestDefinition>
}

// ── Runtime State (plain object, used by pure runtime functions) ───────────────

export interface AdventureRuntimeState {
  flags: Record<string, boolean>
  inventoryItemIds: string[]
  collectedItemIds: string[]
  questStates: Record<string, string>
  currentSceneId: string
}
