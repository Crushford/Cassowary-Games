import type { SceneDefinition } from '@/games/adventure/types/adventureTypes'

export const maintenanceCorridorScene: SceneDefinition = {
  id: 'maintenance-corridor',
  name: 'Maintenance Corridor',
  subtitle: 'Staff Access Only — B. Yarrow',
  hotspots: [

    // ── Water Pipes ─────────────────────────────────────────────────────────

    {
      id: 'water-pipes',
      label: 'Water Pipes',
      kind: 'object',
      visualType: 'default',
      position: { x: 5, y: 8, width: 90, height: 18 },
      interactions: {
        look: [
          {
            text: "A network of old clay pipes runs along the ceiling and upper wall. They sweat. The moisture doesn't smell like a museum — it smells older than the building, possibly older than the hill the building sits on.\n\nSome of the pipe joints have been replaced with copper fittings at various points over what looks like several decades. The oldest clay sections have small handprints pressed into them, very faint, possibly accidental.",
            effects: [{ type: 'setFlag', flag: 'examinedPipes' }],
          },
        ],
        talk: [
          {
            text: 'You listen. The pipes are not silent. There is a low, irregular movement of water, like something remembering what it is for.',
          },
        ],
      },
      interactionFallbacks: {
        take: "You cannot take the pipes. You are not a plumber and this is not that kind of game.",
      },
    },

    // ── Wall Glyph ──────────────────────────────────────────────────────────

    {
      id: 'wall-glyph',
      label: 'Wall Marking',
      kind: 'object',
      visualType: 'plaque',
      visualContent: { symbol: '𓅃', title: '— scratched into the clay —' },
      position: { x: 6, y: 35, width: 18, height: 28 },
      interactions: {
        look: [
          {
            conditions: [{ type: 'hasFlag', flag: 'comparedFragmentToVessel' }],
            text: "Scratched into the clay render at eye height: a bird glyph.\n\nThe same bird as on your fragment. The same bird as on the vessel upstairs. You've seen this three times now in three different contexts.\n\nThe glyph has been here longer than the pipes. Possibly longer than the museum. Possibly longer than the category of things the museum exists to explain.",
            effects: [
              { type: 'setFlag', flag: 'foundCorridorGlyph' },
              { type: 'setFlag', flag: 'recognisedBirdGlyph' },
              { type: 'setQuestState', questId: 'museum-disturbance', state: 'deepening' },
            ],
          },
          {
            text: "Scratched into the clay render at eye height: a bird glyph. It's faded but deliberate. It doesn't match any of the styles in the gallery upstairs — it predates whatever interpretive framework the museum has applied to things that look like this.\n\nYou have seen this bird somewhere before, you think. Or something like it.",
            effects: [{ type: 'setFlag', flag: 'foundCorridorGlyph' }],
          },
        ],
        talk: [
          {
            text: '"What are you?" you ask the glyph, at a volume that will not carry upstairs.\n\nThe glyph does not answer. The pipes shift slightly.',
          },
        ],
      },
      useInteractions: {
        'ceramic-fragment': [
          {
            text: "You hold the fragment against the wall next to the glyph. They don't fit together — they're not from the same object — but the line weight is the same. The hand is the same.\n\nSomething made both of these. Something with consistent intentions across a long time.",
            effects: [
              { type: 'setFlag', flag: 'matchedFragmentToGlyph' },
              { type: 'setFlag', flag: 'recognisedBirdGlyph' },
            ],
          },
        ],
      },
      interactionFallbacks: {
        take: "It's scratched into the wall. You couldn't take it even if you wanted to, and you have a feeling you shouldn't want to.",
      },
    },

    // ── Staff Notice Board ──────────────────────────────────────────────────

    {
      id: 'notice-board',
      label: 'Staff Notice Board',
      kind: 'object',
      visualType: 'plaque',
      visualContent: { title: 'STAFF NOTICES', badge: 'B. Yarrow — Facilities' },
      position: { x: 72, y: 28, width: 22, height: 35 },
      interactions: {
        look: [
          {
            text: "Three notes pinned over each other in ascending urgency.\n\nOldest (printed, institutional font): \"B. YARROW: do not discuss the humidity readings with visitors. — Director M.\"\n\nMiddle (handwritten, careful): \"B. YARROW: the gauge calibration is within acceptable range. There is no anomaly. — Director M.\"\n\nNewest (pencil, slightly urgent): \"For the record, it is not within acceptable range and there is absolutely an anomaly. Also something in sub-level two made a sound last Tuesday. For the record. — B.Y.\"",
            effects: [{ type: 'setFlag', flag: 'readNoticeBoard' }],
          },
        ],
        talk: [
          {
            text: 'The notice board maintains a confident silence on the matter of anomalies.',
          },
        ],
      },
      interactionFallbacks: {
        take: "You can't take the notice board. You could take one of the notes, but that feels like it crosses a line. You already crossed a door.",
      },
    },

    // ── Exit back to Gallery 4 ──────────────────────────────────────────────

    {
      id: 'exit-to-gallery',
      label: 'Back to Gallery Four',
      kind: 'exit',
      visualType: 'exit',
      visualContent: { title: 'Gallery Four' },
      position: { x: 82, y: 65, width: 14, height: 22 },
      interactions: {
        look: [
          {
            text: 'You make your way back up the passage to the gallery. The humidity gauge ticks twice as you pass.',
            effects: [{ type: 'moveToScene', sceneId: 'museum-gallery-4' }],
          },
        ],
      },
    },
  ],
}
