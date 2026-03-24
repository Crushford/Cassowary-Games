import type { ClaimDefinition } from '../game/types';

export const STARTING_CLAIM: ClaimDefinition = {
  id: 'ballarat-start',
  name: 'Ballarat Claim',
  description:
    'Work a 5x5 claim through loose dirt, shallow rock, and quartz seams. Every action costs a day.',
  rows: 5,
  columns: 5,
  depth: 6,
  deckMatrix: [
    ['dirt', 'dirt', 'rock', 'rock', 'quartz', 'quartz'],
    ['dirt', 'rock', 'dirt', 'rock', 'quartz', 'rock'],
    ['dirt', 'dirt', 'rock', 'quartz', 'rock', 'quartz'],
    ['dirt', 'rock', 'rock', 'quartz', 'quartz', 'rock'],
    ['dirt', 'dirt', 'quartz', 'rock', 'quartz', 'quartz'],
  ],
};
