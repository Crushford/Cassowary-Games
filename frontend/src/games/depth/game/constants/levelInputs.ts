import type { LevelInput } from '../types';

export const DEPTH_LEVEL_INPUTS: LevelInput[] = [
  {
    metadata: {
      id: 1,
      name: 'Level 1',
      description: 'Single-row tutorial board.',
    },
    economy: {
      startingBank: 20,
      rounds: 3,
      minBet: 1,
      maxBet: 5,
    },
    board: {
      rows: 1,
      columns: 5,
      depth: 1,
    },
    decks: {
      mode: 'uniform',
      deckId: 'blue',
    },
    rules: {
      turnRule: 'column-choice-reveal',
    },
    support: {
      supportMode: 'exact',
      showExactRemainingValues: true,
      showBoardAverage: true,
    },
  },
  {
    metadata: {
      id: 2,
      name: 'Level 2',
      description: 'Adds a second row while keeping one depth layer.',
    },
    economy: {
      startingBank: 20,
      rounds: 3,
      minBet: 1,
      maxBet: 5,
    },
    board: {
      rows: 2,
      columns: 5,
      depth: 1,
    },
    decks: {
      mode: 'uniform',
      deckId: 'blue',
    },
    rules: {
      turnRule: 'column-choice-reveal',
    },
    support: {
      supportMode: 'row-summary',
      showExactRemainingValues: true,
      showRowAverages: true,
      showBoardAverage: true,
    },
  },
  {
    metadata: {
      id: 3,
      name: 'Level 3',
      description: 'Introduces a higher-spike deck across both rows.',
    },
    economy: {
      startingBank: 20,
      rounds: 3,
      minBet: 1,
      maxBet: 5,
    },
    board: {
      rows: 2,
      columns: 5,
      depth: 1,
    },
    decks: {
      mode: 'uniform',
      deckId: 'red',
    },
    rules: {
      turnRule: 'column-choice-reveal',
    },
    support: {
      supportMode: 'row-summary',
      showExactRemainingValues: true,
      showRowAverages: true,
      showBoardAverage: true,
    },
  },
  {
    metadata: {
      id: 4,
      name: 'Level 4',
      description: 'Full 5x5 surface board with ten-card columns.',
    },
    economy: {
      startingBank: 25,
      rounds: 3,
      minBet: 1,
      maxBet: 5,
    },
    board: {
      rows: 5,
      columns: 5,
      depth: 1,
    },
    decks: {
      mode: 'uniform',
      deckId: 'blue',
    },
    rules: {
      turnRule: 'column-choice-reveal',
    },
    support: {
      supportMode: 'row-summary',
      showExactRemainingValues: true,
      showRowAverages: true,
      showBoardAverage: true,
    },
  },
  {
    metadata: {
      id: 5,
      name: 'Level 5',
      description: '5x5 surface board with a simpler reveal rule.',
    },
    economy: {
      startingBank: 25,
      rounds: 3,
      minBet: 1,
      maxBet: 5,
    },
    board: {
      rows: 5,
      columns: 5,
      depth: 1,
    },
    decks: {
      mode: 'uniform',
      deckId: 'blue',
    },
    rules: {
      turnRule: 'basic-reveal',
    },
    support: {
      supportMode: 'board-summary',
      showExactRemainingValues: true,
      showRowAverages: true,
      showBoardAverage: true,
    },
  },
  {
    metadata: {
      id: 6,
      name: 'Level 6',
      description: 'Depth-based board with dealer follow-up enabled.',
    },
    economy: {
      startingBank: 30,
      rounds: 3,
      minBet: 1,
      maxBet: 5,
    },
    board: {
      rows: 5,
      columns: 5,
      depth: 2,
    },
    decks: {
      mode: 'by-depth',
      depthDeckIds: ['blue', 'red'],
    },
    rules: {
      turnRule: 'dealer-follow-up',
      dealerEnabled: true,
      dealerAfterPlayer: true,
    },
    support: {
      supportMode: 'board-summary',
      showExactRemainingValues: true,
      showRowAverages: true,
      showBoardAverage: true,
    },
  },
  {
    metadata: {
      id: 7,
      name: 'Level 7',
      description: 'Three-depth board with escalating deck pressure.',
    },
    economy: {
      startingBank: 30,
      rounds: 3,
      minBet: 1,
      maxBet: 5,
    },
    board: {
      rows: 5,
      columns: 5,
      depth: 3,
    },
    decks: {
      mode: 'by-depth',
      depthDeckIds: ['blue', 'red', 'blue'],
    },
    rules: {
      turnRule: 'dealer-follow-up',
      dealerEnabled: true,
      dealerAfterPlayer: true,
    },
    support: {
      supportMode: 'board-summary',
      showExactRemainingValues: true,
      showRowAverages: true,
      showBoardAverage: true,
    },
  },
  {
    metadata: {
      id: 8,
      name: 'Level 8',
      description: 'Full 5x5x10 board using mixed depth layers.',
    },
    economy: {
      startingBank: 35,
      rounds: 3,
      minBet: 1,
      maxBet: 5,
    },
    board: {
      rows: 5,
      columns: 5,
      depth: 10,
    },
    decks: {
      mode: 'by-depth',
      depthDeckIds: ['blue', 'red', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'blue', 'red'],
    },
    rules: {
      turnRule: 'dealer-follow-up',
      dealerEnabled: true,
      dealerAfterPlayer: true,
    },
    support: {
      supportMode: 'board-summary',
      showExactRemainingValues: true,
      showRowAverages: true,
      showBoardAverage: true,
    },
  },
];
