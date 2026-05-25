import type { Scene } from '../types';

// Static sample scenes for the prototype.
// Future pipeline: parse these from vendor/cassowary-world-lore/scenes/*.md
export const sampleScenes: Scene[] = [
  {
    id: 'orchard-edge-dawn',
    title: 'The Orchard at Dawn',
    location: 'Rainforest Edge Orchard, Sahul',
    mood: 'Warm, meditative, anticipatory',
    backgroundDescription:
      'A dense canopy of fig and pandanus trees opens onto a terraced orchard. Morning mist drifts between the trunks. The ground is carefully cleared and marked with territory stones. Honeypot ant mounds dot the clearing.',
    characters: [
      {
        id: 'kunyarra',
        name: 'Kunyarra',
        role: 'Orchard Elder',
        description:
          'A large southern cassowary, deep blue-wattled, moving with the deliberate grace of someone who has tended this ground for forty years. She carries a woven bark pouch heavy with assessment tokens.',
      },
      {
        id: 'tilvik',
        name: 'Tilvik',
        role: 'Apprentice Keeper',
        description:
          "A younger cassowary, wattles still brightening to their adult blue-violet, eyes quick and curious. He watches Kunyarra's every movement, cataloguing technique.",
      },
    ],
    interactables: [
      {
        id: 'ant-mound',
        name: 'Honeypot Ant Mound',
        description: 'A tall red mound, carefully managed. Small amber workers move in procession along scent trails.',
        interactionText:
          "The mound is warm to the touch. You can hear the faint movement of repletes deep within — already swollen with this morning's harvest.",
      },
      {
        id: 'fig-tree',
        name: 'Lineage Fig Tree',
        description: 'A massive strangler fig, older than memory. Seven harvest-ring marks carved into its bark.',
        interactionText: 'Seven harvest-ring marks. This tree has fed seven generations of keepers. The current crop hangs heavy.',
      },
      {
        id: 'tribute-stones',
        name: 'Territory Boundary Stones',
        description: 'Three flat stones arranged in a precise triangle, painted with ochre symbols.',
        interactionText:
          "The symbols record this orchard's tribute obligations and the lineage claim of the Kunyarra family. The current cycle's token is already placed.",
      },
    ],
    dialogue: [
      { id: 'd1', characterId: 'kunyarra', characterName: 'Kunyarra', text: 'The ants are already working the eastern section. Good.' },
      { id: 'd2', characterId: 'tilvik', characterName: 'Tilvik', text: 'The northern mound looks smaller than last season.' },
      {
        id: 'd3',
        characterId: 'kunyarra',
        characterName: 'Kunyarra',
        text: 'It is. We moved half that colony to the new clearing in winter. They are still establishing.',
      },
      {
        id: 'd4',
        characterId: 'tilvik',
        characterName: 'Tilvik',
        text: 'Should we check the fig yields before the tribute assessors arrive?',
      },
      {
        id: 'd5',
        characterId: 'kunyarra',
        characterName: 'Kunyarra',
        text: 'We should. But the assessment is fair this cycle. I am not worried.',
      },
    ],
    sourceMarkdownPath: 'vendor/cassowary-world-lore/scenes/orchard-edge-dawn.md',
  },
  {
    id: 'river-crossing-dusk',
    title: 'The River Crossing',
    location: 'Tributary Ford, Wet Season',
    mood: 'Tense, purposeful',
    backgroundDescription:
      'A wide, shallow river crossing at dusk. The water runs amber with tannin. Smooth river stones make a crossing path. Dense rainforest lines both banks, the tree line dark against an orange sky.',
    characters: [
      {
        id: 'pirra',
        name: 'Pirra',
        role: 'Territory Scout',
        description:
          "A lean cassowary, travel-stained from a long run, moving with careful urgency. She carries no pouch — a scout on a message run travels light. Her eyes move constantly, reading the crossing.",
      },
    ],
    interactables: [
      {
        id: 'crossing-stones',
        name: 'River Stones',
        description: 'Flat stones worn smooth by generations of feet.',
        interactionText: "The crossing is passable. The water is high from last week's rains but not dangerous if you choose your line carefully.",
      },
      {
        id: 'warning-marker',
        name: 'Warning Marker',
        description: 'A stripped branch stuck upright in the bank, red clay at the tip.',
        interactionText:
          "Someone marked this crossing recently. Red clay means hazard — crocodile sighting, rival group activity, or a broken crossing stone. It's fresh.",
      },
    ],
    dialogue: [
      { id: 'd1', characterId: 'pirra', characterName: 'Pirra', text: 'The marker is fresh. I should not linger.' },
      { id: 'd2', characterId: 'pirra', characterName: 'Pirra', text: 'The message has to reach the eastern grove before dawn.' },
    ],
    sourceMarkdownPath: 'vendor/cassowary-world-lore/scenes/river-crossing-dusk.md',
  },
];
