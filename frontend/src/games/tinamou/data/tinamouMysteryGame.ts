import type { AdventureGameDefinition } from '@/games/adventure/types/adventureTypes'

export const tinamouMysteryGame: AdventureGameDefinition = {
  id: 'tinamou-mystery',
  title: 'Tinamou Mystery',
  initialSceneId: 'museum-gallery-4',

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
    'museum-gallery-4': {
      id: 'museum-gallery-4',
      name: 'Gallery Four',
      subtitle: 'First Basin Civilisation — Permanent Collection',
      hotspots: [

        // ── Museum Label ───────────────────────────────────────────────────

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
                effects: [{ type: 'setFlag', flag: 'examinedLabel' }],
              },
            ],
          },
          interactionFallbacks: {
            take: "The label is mounted to the wall. You could probably get it off with the right leverage, but you're in a museum. You have, on balance, standards.",
            talk: "The label stares back at you with the quiet authority of institutional investment in a permanent fixture.",
          },
        },

        // ── Guide Cockatoo ─────────────────────────────────────────────────

        {
          id: 'guide-cockatoo',
          label: 'Guide Cockatoo',
          kind: 'character',
          visualType: 'character',
          visualContent: {
            symbol: '🦜',
            badge: 'HERALD',
          },
          position: { x: 70, y: 10, width: 13, height: 35 },
          interactions: {
            look: [
              {
                text: "A white cockatoo in a small orange vest. It has the eyes of something that has recited the same four facts for a very long time and made peace with this. Its name badge reads \"HERALD (HE/HIM)\". Herald is not looking at the artefacts. Herald is looking somewhere beyond the artefacts, into a distance only Herald can perceive.",
              },
            ],
            talk: [
              {
                conditions: [{ type: 'hasFlag', flag: 'examinedLabel' }],
                text: '"GALLERY FOUR!" Herald announces. "HOME TO THE FIRST BASIN—" He stops. Tilts his head at a considerable angle.\n\n"You\'ve read the plaque. I can tell. You\'ve got that look."\n\nA pause. "The 2016 briefing may have... contained some assumptions. Regional Director Morwenna said it was fine." He fixes you with one red eye. "Morwenna has since retired to Cairns."',
                effects: [{ type: 'setFlag', flag: 'talkedToGuideCockatooAfterLabel' }],
              },
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

        // ── Fallen Label Fragment ──────────────────────────────────────────

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

        // ── Maintenance Door ───────────────────────────────────────────────

        {
          id: 'maintenance-door',
          label: 'Maintenance Door',
          kind: 'object',
          visualType: 'door',
          visualContent: {
            badge: 'HUMIDITY\nELEVATED',
          },
          position: { x: 32, y: 28, width: 14, height: 42 },
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
                text: "You hold the fragment up near the door. The humidity gauge needle twitches. The fragment feels warmer — distinctly warmer — for a moment, then settles.\n\nNothing opens. But somewhere below you, very faintly, there's a sound like water remembering something.\n\nYou add \"follow up on this\" to your internal notebook under a tab you've labelled URGENT (PROBABLY).",
                effects: [{ type: 'setFlag', flag: 'usedFragmentOnDoor' }],
              },
            ],
          },
          interactionFallbacks: {
            take: "It's a door set in a wall. You'd like to see you try.",
          },
          useFallback:
            "You consider the door thoughtfully. Without the right context, it's just a door painted to look like a wall.",
        },

        // ── Display Case ───────────────────────────────────────────────────

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
  },

  // ── Quests ────────────────────────────────────────────────────────────────

  quests: {
    'museum-disturbance': {
      id: 'museum-disturbance',
      title: 'Something Wrong in Gallery Four',
      description: 'Something in Gallery Four is not what the labels say it is.',
      states: ['inactive', 'noticed', 'investigating', 'resolved'],
    },
  },
}
