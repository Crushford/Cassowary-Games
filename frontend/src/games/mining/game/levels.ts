import type { MiningCampaignLevel } from './types';

export const MINING_CAMPAIGN_LEVELS: MiningCampaignLevel[] = [
  {
    id: 'level-1',
    number: 1,
    boardSize: 5,
    goldTarget: 5,
    scannerEnabled: false,
    introTitle: 'Level 1',
    introBody: [
      'In this game, there are 5 pieces of gold to find.',
      'Tap once to place a flag, and tap a flag to dig.',
      'Your first goal is simply to find all the gold. Dig as much as you want.',
    ],
    winConditions: {
      requireAllGold: true,
    },
    failure: {
      title: "You didn't make it this time.",
      body: 'Try again and find all 5 pieces of gold.',
      clue: 'Find all 5 pieces of gold.',
    },
  },
  {
    id: 'level-2',
    number: 2,
    boardSize: 5,
    goldTarget: 5,
    scannerEnabled: false,
    introTitle: 'Level 2',
    introBody: [
      'There are still 5 pieces of gold to find.',
      'This time, your goal is to find all 5 pieces of gold in fewer than 15 digs.',
      'Tap once to place a flag, and tap a flag to dig.',
    ],
    winConditions: {
      requireAllGold: true,
      maxDigsExclusive: 15,
    },
    failure: {
      title: "You didn't make it this time.",
      body: 'You found all the gold, but you needed to do it in fewer than 15 digs.',
      clue: 'There is only ever 1 gold in each row and 1 gold in each column.',
    },
    reward: {
      id: 'raven-row-column',
      title: 'Congratulations!',
      body: "As a reward, you've been given a Raven. When you find gold, the Raven will mark every other square in that row and column as not gold.",
      unlocksRavenSkills: ['auto-flag-row', 'auto-flag-column'],
    },
  },
  {
    id: 'level-3',
    number: 3,
    boardSize: 6,
    goldTarget: 6,
    scannerEnabled: false,
    introTitle: 'Level 3',
    introBody: [
      "Now we've given you a bigger field.",
      'There are 6 pieces of gold to find here, and your goal is to find them in fewer than 14 digs.',
      'Your Raven still remembers the row and column rule.',
    ],
    winConditions: {
      requireAllGold: true,
      maxDigsExclusive: 14,
    },
    failure: {
      title: "You didn't make it this time.",
      body: 'You found all the gold, but you needed to do it in fewer than 14 digs.',
      clue: 'Gold is never diagonally adjacent to other gold.',
    },
    reward: {
      id: 'raven-diagonal',
      title: 'Congratulations!',
      body: "You've taught your Raven that gold is never diagonally adjacent. From now on, it will also mark diagonally adjacent squares as not gold when gold is found.",
      unlocksRavenSkills: ['auto-flag-diagonal'],
    },
  },
  {
    id: 'level-4',
    number: 4,
    boardSize: 7,
    goldTarget: 7,
    scannerEnabled: false,
    introTitle: 'Level 4',
    introBody: [
      "You've reached a 7x7 field.",
      'There are 7 pieces of gold to find, and your goal is to find them in fewer than 13 digs.',
      'Use everything your Raven has learned so far.',
    ],
    winConditions: {
      requireAllGold: true,
      maxDigsExclusive: 15,
    },
    failure: {
      title: "You didn't make it this time.",
      body: 'You found all the gold, but you needed to do it in fewer than 13 digs.',
      clue: 'Gold is never diagonally adjacent to other gold.',
    },
  },
];
