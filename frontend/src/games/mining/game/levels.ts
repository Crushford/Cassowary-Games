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
      maxDigsExclusive: 13,
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
    reward: {
      id: 'scanner',
      title: 'Congratulations!',
      body: "You've earned a Scanner. The Scanner reveals the color groups, and each color group contains exactly 1 gold. Now you can use the color groups, along with rows and columns, to work out where gold must be.",
      unlocksToolUpgradeIds: ['scanner'],
    },
  },
  {
    id: 'level-5',
    number: 5,
    boardSize: 5,
    goldTarget: 5,
    scannerEnabled: true,
    introTitle: 'Level 5',
    introBody: [
      'Now that you have a Scanner, you can see that each color group has only 1 gold in it. That means you can take the guesswork out of digging.',
      'Your goal now is to find all 5 gold in just 5 digs.',
      'Place flags where there is definitely no gold. Eventually, you will be left with only 1 square in a color group, row, or column, and then you know there must be gold there, so you can safely dig.',
    ],
    winConditions: {
      requireAllGold: true,
      maxDigsExclusive: 6,
    },
    failure: {
      title: "You didn't make it this time.",
      body: 'You found all the gold, but you needed to do it in just 5 digs.',
      clue: 'Each color group has exactly 1 gold. If every other square in a color group is ruled out, the remaining square must be gold.',
    },
  },
  {
    id: 'level-6',
    number: 6,
    boardSize: 6,
    goldTarget: 6,
    scannerEnabled: true,
    introTitle: 'Level 6',
    introBody: [
      'Now the field is growing again, but your Scanner is still with you.',
      'There are 6 pieces of gold to find, and your goal is to find all 6 in just 6 digs.',
      'Use the color groups, rows, columns, and your Raven to rule out every unsafe square before you dig.',
    ],
    winConditions: {
      requireAllGold: true,
      maxDigsExclusive: 7,
    },
    failure: {
      title: "You didn't make it this time.",
      body: 'You found all the gold, but you needed to do it in just 6 digs.',
      clue: 'If a row, column, or color group only has 1 square left that could hold gold, that square must be gold.',
    },
  },
  {
    id: 'level-7',
    number: 7,
    boardSize: 7,
    goldTarget: 7,
    scannerEnabled: true,
    introTitle: 'Level 7',
    introBody: [
      'This 7x7 field still follows the same rules.',
      'Find all 7 pieces of gold in just 7 digs.',
      'Before each dig, make sure every other square in that row, column, or color group has been ruled out.',
    ],
    winConditions: {
      requireAllGold: true,
      maxDigsExclusive: 8,
    },
    failure: {
      title: "You didn't make it this time.",
      body: 'You found all the gold, but you needed to do it in just 7 digs.',
      clue: 'The Scanner removes guesswork. Keep placing flags until each gold is forced by the remaining row, column, and color group options.',
    },
  },
  {
    id: 'level-8',
    number: 8,
    boardSize: 8,
    goldTarget: 8,
    scannerEnabled: true,
    introTitle: 'Level 8',
    introBody: [
      'The field is wider now, but the logic is the same.',
      'Find all 8 pieces of gold in just 8 digs.',
      'Let the Scanner narrow each color group down to a single safe square before you dig.',
    ],
    winConditions: {
      requireAllGold: true,
      maxDigsExclusive: 9,
    },
    failure: {
      title: "You didn't make it this time.",
      body: 'You found all the gold, but you needed to do it in just 8 digs.',
      clue: 'Keep combining the row, column, diagonal, and color group rules. Every perfect dig should be forced before you take it.',
    },
  },
  {
    id: 'level-9',
    number: 9,
    boardSize: 9,
    goldTarget: 9,
    scannerEnabled: true,
    introTitle: 'Level 9',
    introBody: [
      'This is the final field.',
      'Find all 9 pieces of gold in just 9 digs to complete the game.',
      'Use every rule you have learned. If a square is the only place gold can go, dig it with confidence.',
    ],
    winConditions: {
      requireAllGold: true,
      maxDigsExclusive: 10,
    },
    failure: {
      title: "You didn't make it this time.",
      body: 'You found all the gold, but you needed to do it in just 9 digs.',
      clue: 'On the last boards, perfect play means every dig is certain. Keep flagging impossible squares until the gold locations are forced.',
    },
  },
];
