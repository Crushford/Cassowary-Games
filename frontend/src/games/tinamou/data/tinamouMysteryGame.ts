import type { AdventureGameDefinition } from '@/games/adventure/types/adventureTypes'

export const tinamouMysteryGame: AdventureGameDefinition = {
  id: 'tinamou-mystery',
  title: 'Tinamou Mystery',
  initialSceneId: 'museum-gallery-4',
  initialQuestStates: {
    'museum-disturbance': 'inactive',
  },

  // ── Items ─────────────────────────────────────────────────────────────────

  items: {
    'ceramic-fragment': {
      id: 'ceramic-fragment',
      label: 'Ceramic Fragment',
      icon: '🧩',
      description:
        "A palm-sized ceramic fragment. Partial text reads \"...ater mem...\". The bird glyph doesn't match anything else in the gallery.",
    },
  },

  // ── Scenes ────────────────────────────────────────────────────────────────

  scenes: {

    // ── Gallery 4 ─────────────────────────────────────────────────────────

    'museum-gallery-4': {
      id: 'museum-gallery-4',
      name: 'Gallery Four',
      subtitle: 'First Basin Civilisation — Permanent Collection',
      hotspots: [

        // Outdated Museum Label
        {
          id: 'museum-label',
          label: 'Museum Label',
          kind: 'object',
          visualType: 'plaque',
          visualContent: {
            title: 'GALLERY IV',
            subtitle: 'First Basin Civilisation',
            badge: 'c. Definitely Long Ago',
          },
          position: { x: 57, y: 26, width: 22, height: 19 },
          interactions: {
            look: [
              {
                text: 'You lean in to read the plaque.\n\n"Gallery Four: The First Basin Civilisation (c. Definitely Long Ago). These peoples are believed to have invented pottery, agriculture, and what scholars now call \'intentional water\'. The evidence for this is circumstantial but the font is authoritative. Do not adjust the humidity."\n\nThe interpretive framework is impressively confident. Someone has scratched \'per whose taxonomy??\' very faintly in the corner.',
                effects: [
                  { type: 'setFlag', flag: 'examinedLabel' },
                  { type: 'setQuestState', questId: 'museum-disturbance', state: 'noticed' },
                ],
              },
            ],
          },
          interactionFallbacks: {
            take: "The label is mounted to the wall. You could probably get it off with the right leverage, but you're in a museum. You have, on balance, standards.",
            talk: "The label stares back at you with the quiet authority of institutional investment in a permanent fixture.",
          },
        },

        // Guide Cockatoo (Herald)
        {
          id: 'guide-cockatoo',
          label: 'Guide Cockatoo',
          kind: 'character',
          visualType: 'character',
          visualContent: { symbol: '🦜', badge: 'HERALD' },
          position: { x: 70, y: 10, width: 13, height: 35 },
          interactions: {
            look: [
              {
                text: "A white cockatoo in a small orange vest. It has the eyes of something that has recited the same four facts for a very long time and made peace with this. Its name badge reads \"HERALD (HE/HIM)\". Herald is not looking at the artefacts. Herald is looking somewhere beyond the artefacts, into a distance only Herald can perceive.",
              },
            ],
            talk: [
              // After reading the label, Herald is more reflective
              {
                conditions: [{ type: 'hasFlag', flag: 'examinedLabel' }],
                text: '"GALLERY FOUR!" Herald announces. "HOME TO THE FIRST BASIN—" He stops. Tilts his head at a considerable angle.\n\n"You\'ve read the plaque. I can tell. You\'ve got that look."\n\nA pause. "The 2016 briefing may have... contained some assumptions. Regional Director Morwenna said it was fine." He fixes you with one red eye. "Morwenna has since retired to Cairns."',
                effects: [
                  { type: 'setFlag', flag: 'talkedToGuideCockatooAfterLabel' },
                  { type: 'setQuestState', questId: 'museum-disturbance', state: 'active' },
                ],
              },
              // Default first-visit response
              {
                text: '"GALLERY FOUR!" Herald announces. "HOME TO THE FIRST BASIN CIVILISATION! WIDELY CONSIDERED IMPORTANT BY NUMEROUS INSTITUTIONS! PLEASE DO NOT TOUCH THE ARTEFACTS! I WAS BRIEFED ON THIS IN TWO THOUSAND AND SIXTEEN!"\n\nHe blinks. The blink takes a long time.',
                effects: [{ type: 'setFlag', flag: 'talkedToGuideCockatoo' }],
              },
            ],
          },
          interactionFallbacks: {
            take: "You cannot take Herald. He is staff. Also he would absolutely tell someone.",
          },
        },

        // Fallen Label Fragment (collectible)
        {
          id: 'fallen-fragment',
          label: 'Label Fragment',
          kind: 'item',
          visualType: 'fragment',
          visualContent: { symbol: '🧩' },
          position: { x: 50, y: 71, width: 7, height: 6 },
          collectibleItemId: 'ceramic-fragment',
          interactions: {
            look: [
              {
                text: "A small ceramic fragment, roughly the size of your palm, has slipped from somewhere and settled against the baseboard. It has partial text: \"...ater mem...\" and what looks like part of a bird glyph that doesn't quite match the art style of anything else in this gallery.",
              },
            ],
            take: [
              {
                text: "You pick up the fragment. It's lighter than it looks, and slightly warm to the touch. Probably just from the gallery heating. Almost certainly.",
                effects: [{ type: 'addItem', itemId: 'ceramic-fragment' }],
              },
            ],
          },
          interactionFallbacks: {
            talk: 'You crouch down to address the fragment. "What are you doing down here?" It says nothing, being ceramic.',
          },
        },

        // Maintenance Door — visible while the player hasn't yet activated it
        {
          id: 'maintenance-door',
          label: 'Maintenance Door',
          kind: 'object',
          visualType: 'door',
          visualContent: { badge: 'HUMIDITY\nELEVATED' },
          position: { x: 32, y: 28, width: 14, height: 42 },
          visibleWhen: [{ type: 'missingFlag', flag: 'usedFragmentOnDoor' }],
          interactions: {
            look: [
              {
                text: "A utility door, painted the same warm beige as the surrounding wall and clearly hoping you'd overlook it. A humidity gauge is mounted beside it and reads \"ELEVATED (DO NOT ADJUST)\". Below the gauge someone has taped a handwritten note: \"If door warm — contact B. Yarrow ONLY\".\n\nThere's a faint smell of old pipes and wet clay, or something like wet clay, or something that learned how to smell like wet clay from something much older.",
                effects: [{ type: 'setFlag', flag: 'noticedDoor' }],
              },
            ],
            talk: [
              {
                text: '"Hello," you say, quietly, so Herald doesn\'t hear. The door does not respond. The humidity gauge needle moves very slightly when you speak. You decide not to think too hard about this.',
              },
            ],
          },
          useInteractions: {
            'ceramic-fragment': [
              {
                text: "You hold the fragment up near the door. The humidity gauge needle twitches. The fragment feels warmer — distinctly, unmistakably warmer — for a moment, then settles.\n\nThe door makes a sound like water draining somewhere deep. It doesn't open, exactly. It unlocks.\n\nYou add \"follow up on this\" to your internal notebook under a tab you've labelled URGENT (PROBABLY).",
                effects: [
                  { type: 'setFlag', flag: 'usedFragmentOnDoor' },
                  { type: 'setQuestState', questId: 'museum-disturbance', state: 'investigating' },
                ],
              },
            ],
          },
          interactionFallbacks: {
            take: "It's a door set in a wall. You'd like to see you try.",
          },
          useFallback:
            "You consider the door thoughtfully. Without the right context, it's just a door painted to look like a wall.",
        },

        // Corridor Entrance — replaces door once fragment has been used
        {
          id: 'corridor-entrance',
          label: 'Corridor Entrance',
          kind: 'exit',
          visualType: 'exit',
          visualContent: { title: 'Maintenance Corridor' },
          position: { x: 32, y: 28, width: 14, height: 42 },
          visibleWhen: [{ type: 'hasFlag', flag: 'usedFragmentOnDoor' }],
          interactions: {
            look: [
              {
                text: 'The door stands open, releasing a breath of cool damp air. A narrow passage leads down into the museum infrastructure. Something in the humidity gauge ticks as you cross the threshold.',
                effects: [{ type: 'moveToScene', sceneId: 'maintenance-corridor' }],
              },
            ],
          },
        },

        // Display Case with Storage Vessel
        {
          id: 'display-case',
          label: 'Display Case',
          kind: 'object',
          visualType: 'case',
          visualContent: {
            symbol: '🏺',
            title: 'Auth. First Basin',
            subtitle: 'Water Storage (Ritual?)',
          },
          position: { x: 3, y: 16, width: 26, height: 46 },
          interactions: {
            look: [
              {
                text: "Inside the case sits a large ceramic vessel with a bold red authority sticker: \"Auth. First Basin — Water Storage (Ritual?)\". The question mark is doing a lot of work.\n\nSomeone has pencilled \"???\" in very small letters below the red sticker. Someone else has crossed out the three question marks and written \"yes, obviously ??? — M.\"\n\nBelow the vessel: an acquisitions card dated 1987 that simply reads \"provenance: yes\".",
                effects: [{ type: 'setFlag', flag: 'noticedStorageVessel' }],
              },
            ],
            talk: [
              {
                text: 'You press your face slightly too close to the glass and murmur "what happened to you?"\n\nThe vessel does not answer, but you get the strong impression it has been asked this before, and is patient about it.',
              },
            ],
          },
          useInteractions: {
            'ceramic-fragment': [
              {
                text: "You hold the ceramic fragment up to the glass. For a moment your fragment and the vessel's glaze catch the same angle of light, and you see a shared texture — the same clay, maybe, the same hand.\n\nThe red sticker suddenly seems very confident about very little.",
                effects: [{ type: 'setFlag', flag: 'comparedFragmentToVessel' }],
              },
            ],
          },
          interactionFallbacks: {
            take: "The display case is locked and alarmed. You respect the alarm. You have a healthy relationship with institutional authority. Mostly.",
          },
        },
      ],
    },

    // ── Maintenance Corridor ───────────────────────────────────────────────

    'maintenance-corridor': {
      id: 'maintenance-corridor',
      name: 'Maintenance Corridor',
      subtitle: 'Staff Access Only — B. Yarrow',
      hotspots: [

        // Water Pipes
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

        // Wall Glyph — the same bird as on the ceramic fragment
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
                // Richer response if player already compared the fragment to the vessel
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

        // Staff Notice Board
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

        // Exit back to Gallery 4
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
    },
  },

  // ── Quests ────────────────────────────────────────────────────────────────

  quests: {
    'museum-disturbance': {
      id: 'museum-disturbance',
      title: 'Something Wrong in Gallery Four',
      description: 'Something in Gallery Four is not what the labels say it is.',
      states: ['inactive', 'noticed', 'active', 'investigating', 'deepening'],
    },
  },
}
