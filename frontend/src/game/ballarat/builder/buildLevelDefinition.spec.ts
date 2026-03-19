import { describe, expect, it } from 'vitest';

import { buildLevelDefinition } from './buildLevelDefinition';
import type { LevelInput } from '../types';

describe('buildLevelDefinition', () => {
  it('normalizes a uniform deck assignment into a row-depth matrix', () => {
    const input: LevelInput = {
      metadata: {
        id: 101,
        name: 'Uniform Test',
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
        depth: 2,
      },
      decks: {
        mode: 'uniform',
        deckId: 'blue-starter',
      },
      rules: {
        turnRule: 'basic-reveal',
      },
      support: {},
    };

    const level = buildLevelDefinition(input);

    expect(level.deckMatrix).toEqual([
      ['blue-starter', 'blue-starter'],
      ['blue-starter', 'blue-starter'],
    ]);
    expect(level.supportMode).toBe('exact');
    expect(level.showExactRemainingValues).toBe(true);
  });

  it('validates row-depth matrix dimensions', () => {
    const input: LevelInput = {
      metadata: {
        id: 102,
        name: 'Bad Matrix',
      },
      economy: {
        startingBank: 20,
        rounds: 1,
        minBet: 1,
        maxBet: 5,
      },
      board: {
        rows: 2,
        columns: 5,
        depth: 2,
      },
      decks: {
        mode: 'row-depth-matrix',
        matrix: [['blue-starter'], ['red-spike', 'blue-starter']],
      },
      rules: {
        turnRule: 'basic-reveal',
      },
      support: {
        supportMode: 'debug',
      },
    };

    expect(() => buildLevelDefinition(input)).toThrow(
      'Deck matrix depth count must equal depth (2) at row 0'
    );
  });

  it('defaults dealer flags when using dealer-follow-up', () => {
    const input: LevelInput = {
      metadata: {
        id: 103,
        name: 'Dealer Test',
      },
      economy: {
        startingBank: 20,
        rounds: 1,
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
        deckId: 'blue-starter',
      },
      rules: {
        turnRule: 'dealer-follow-up',
      },
      support: {
        supportMode: 'board-summary',
      },
    };

    const level = buildLevelDefinition(input);

    expect(level.dealerEnabled).toBe(true);
    expect(level.dealerAfterPlayer).toBe(true);
  });
});
