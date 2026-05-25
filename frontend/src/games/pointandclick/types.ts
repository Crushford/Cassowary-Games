// ── Scene content ─────────────────────────────────────────────────────────────

export interface SceneCharacter {
  id: string;
  name: string;
  role: string;
  description: string;
}

export interface SceneInteractable {
  id: string;
  name: string;
  description: string;
  interactionText: string;
}

export interface DialogueLine {
  id: string;
  characterId: string;
  characterName: string;
  text: string;
}

export interface Scene {
  id: string;
  title: string;
  location: string;
  mood: string;
  backgroundDescription: string;
  characters: SceneCharacter[];
  interactables: SceneInteractable[];
  dialogue: DialogueLine[];
  // Future: sourceMarkdownPath linking to vendor/cassowary-world-lore/scenes/<file>.md
  sourceMarkdownPath?: string;
}

// ── Asset candidates ──────────────────────────────────────────────────────────
// These represent possible generated images for a scene element.
// Image generation is mocked in this prototype — candidates use CSS gradients.

export type AssetKind = 'background' | 'character' | 'item';

export interface AssetCandidate {
  id: string;
  kind: AssetKind;
  sceneId: string;
  entityId?: string; // links to SceneCharacter.id or SceneInteractable.id
  title: string;
  prompt: string; // the prompt that would be sent to the image generator
  previewGradient: string; // CSS gradient used as placeholder when no image is available
  imageUrl?: string; // presigned/public URL; takes precedence over imageData and gradient
  imageData?: string; // data: URL for mock/local generation (v1 backend mock mode)
  selected: boolean;
  generatedAt?: string; // ISO-8601 set by backend after generation
}

// ── Scene layout ──────────────────────────────────────────────────────────────
// Separates visual positioning from scene content.
// All values are percentages of the preview area dimensions.

export type LayerKind = 'background' | 'character' | 'object';

export interface LayerEntry {
  entityId: string;
  label: string;
  kind: LayerKind;
  x: number; // % from left edge
  y: number; // % from top edge
  width: number; // % of preview width
  height: number; // % of preview height
  zIndex: number;
}

export interface SceneLayout {
  sceneId: string;
  layers: LayerEntry[];
}

// ── Interaction state ─────────────────────────────────────────────────────────

export interface ActiveInteraction {
  kind: 'character' | 'object';
  entityId: string;
  label: string;
  bodyText: string; // description or interaction text
  lines: DialogueLine[]; // only populated for characters
}
