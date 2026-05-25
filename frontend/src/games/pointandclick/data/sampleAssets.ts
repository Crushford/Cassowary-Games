import type { Scene, AssetCandidate, LayerEntry, SceneLayout } from '../types';

// Palette of gradients used as placeholder stand-ins for generated images.
// Each set captures a different mood / time-of-day / character.
const BG_GRADIENTS = [
  'linear-gradient(145deg, #f59e0b 0%, #10b981 45%, #065f46 100%)',
  'linear-gradient(180deg, #064e3b 0%, #065f46 55%, #022c22 100%)',
  'linear-gradient(150deg, #fbbf24 0%, #78350f 45%, #15803d 100%)',
  'linear-gradient(135deg, #dc2626 0%, #78350f 50%, #1c1917 100%)',
];

const CHAR_GRADIENT_PAIRS: [string, string][] = [
  ['linear-gradient(160deg, #1e40af 0%, #0891b2 100%)', 'linear-gradient(200deg, #0891b2 0%, #111827 100%)'],
  ['linear-gradient(160deg, #059669 0%, #0d9488 100%)', 'linear-gradient(200deg, #0d9488 0%, #111827 100%)'],
  ['linear-gradient(160deg, #7c3aed 0%, #1e40af 100%)', 'linear-gradient(200deg, #7c3aed 0%, #111827 100%)'],
];

export function generateCandidatesForScene(scene: Scene): AssetCandidate[] {
  const backgrounds: AssetCandidate[] = [
    {
      id: `${scene.id}-bg-1`,
      kind: 'background',
      sceneId: scene.id,
      title: 'Option A — Warm Dawn',
      prompt: `Wide painterly establishing shot. ${scene.backgroundDescription} Golden morning light filtering through canopy, warm amber tones.`,
      previewGradient: BG_GRADIENTS[0],
      selected: true,
    },
    {
      id: `${scene.id}-bg-2`,
      kind: 'background',
      sceneId: scene.id,
      title: 'Option B — Deep Forest',
      prompt: `${scene.backgroundDescription} Darker palette, deep greens and shadows, more mystery and atmosphere.`,
      previewGradient: BG_GRADIENTS[1],
      selected: false,
    },
    {
      id: `${scene.id}-bg-3`,
      kind: 'background',
      sceneId: scene.id,
      title: 'Option C — High Contrast',
      prompt: `${scene.backgroundDescription} Dramatic overhead light, strong value contrast, rich ochre earth tones.`,
      previewGradient: BG_GRADIENTS[2],
      selected: false,
    },
  ];

  const characterCandidates: AssetCandidate[] = scene.characters.flatMap((char, i) => {
    const [gradA, gradB] = CHAR_GRADIENT_PAIRS[i % CHAR_GRADIENT_PAIRS.length];
    return [
      {
        id: `${scene.id}-char-${char.id}-a`,
        kind: 'character' as const,
        sceneId: scene.id,
        entityId: char.id,
        title: `${char.name} — Pose A`,
        prompt: `Full-body side-view of ${char.name}, ${char.role}. ${char.description.slice(0, 120)} Standing alert, facing right.`,
        previewGradient: gradA,
        selected: true,
      },
      {
        id: `${scene.id}-char-${char.id}-b`,
        kind: 'character' as const,
        sceneId: scene.id,
        entityId: char.id,
        title: `${char.name} — Pose B`,
        prompt: `${char.name} in three-quarter view, softer lighting. Alternative colour palette.`,
        previewGradient: gradB,
        selected: false,
      },
    ];
  });

  return [...backgrounds, ...characterCandidates];
}

// Static layout positions for each scene element.
// Future: the user will drag-and-drop these in the workshop.
const CHARACTER_SLOTS: Pick<LayerEntry, 'x' | 'y' | 'width' | 'height'>[] = [
  { x: 58, y: 22, width: 24, height: 68 },
  { x: 14, y: 28, width: 21, height: 62 },
  { x: 36, y: 34, width: 19, height: 54 },
];

const OBJECT_SLOTS: Pick<LayerEntry, 'x' | 'y' | 'width' | 'height'>[] = [
  { x: 4, y: 52, width: 14, height: 42 },
  { x: 38, y: 8, width: 16, height: 80 },
  { x: 73, y: 58, width: 15, height: 36 },
];

export function generateLayoutForScene(scene: Scene): SceneLayout {
  const layers: LayerEntry[] = [
    { entityId: 'background', kind: 'background', label: 'Background', x: 0, y: 0, width: 100, height: 100, zIndex: 0 },
    ...scene.characters.map((char, i) => ({
      entityId: char.id,
      kind: 'character' as const,
      label: char.name,
      ...CHARACTER_SLOTS[i % CHARACTER_SLOTS.length],
      zIndex: 10 + i,
    })),
    ...scene.interactables.map((obj, i) => ({
      entityId: obj.id,
      kind: 'object' as const,
      label: obj.name,
      ...OBJECT_SLOTS[i % OBJECT_SLOTS.length],
      zIndex: 5 + i,
    })),
  ];

  return { sceneId: scene.id, layers };
}
