import { describe, expect, it } from 'vitest';

import { buildLevelDefinition } from './buildLevelDefinition';
import type { LevelInput } from '../types';

function baseInput(overrides: Partial<LevelInput> = {}): LevelInput {
  return {
    metadata: { id: 1, name: 'Test' },
    economy: { startingBank: 20, rounds: 3, minBet: 1, maxBet: 5 },
    board: { rows: 3, columns: 5, depth: 2 },
    decks: { mode: 'uniform', deckId: 'blue-starter' },
    rules: { turnRule: 'basic-reveal' },
    support: {},
    ...overrides,
  };
}

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

  it('normalizes a by-depth deck assignment so each row gets the same depth pattern', () => {
    const level = buildLevelDefinition(
      baseInput({
        board: { rows: 3, columns: 5, depth: 2 },
        decks: { mode: 'by-depth', depthDeckIds: ['blue-starter', 'red-spike'] },
      })
    );

    expect(level.deckMatrix).toEqual([
      ['blue-starter', 'red-spike'],
      ['blue-starter', 'red-spike'],
      ['blue-starter', 'red-spike'],
    ]);
  });

  it('normalizes a by-row deck assignment so each row gets a single deck for all depths', () => {
    const level = buildLevelDefinition(
      baseInput({
        board: { rows: 3, columns: 5, depth: 1 },
        decks: { mode: 'by-row', rowDeckIds: ['blue-starter', 'red-spike', 'blue-starter'] },
      })
    );

    expect(level.deckMatrix).toEqual([['blue-starter'], ['red-spike'], ['blue-starter']]);
  });

  it('preserves an explicit row-depth matrix exactly', () => {
    const matrix = [
      ['blue-starter', 'red-spike'],
      ['red-spike', 'blue-starter'],
    ];
    const level = buildLevelDefinition(
      baseInput({
        board: { rows: 2, columns: 5, depth: 2 },
        decks: { mode: 'row-depth-matrix', matrix },
      })
    );

    expect(level.deckMatrix).toEqual(matrix);
  });

  it('applies default support values when none are provided', () => {
    const level = buildLevelDefinition(baseInput({ support: {} }));

    expect(level.supportMode).toBe('exact');
    expect(level.showExactRemainingValues).toBe(true);
    expect(level.showRowAverages).toBe(false);
    expect(level.showBoardAverage).toBe(false);
  });

  it('throws when by-depth depthDeckIds length does not match board depth', () => {
    expect(() =>
      buildLevelDefinition(
        baseInput({
          board: { rows: 3, columns: 5, depth: 3 },
          decks: { mode: 'by-depth', depthDeckIds: ['blue-starter', 'red-spike'] },
        })
      )
    ).toThrow('depth (3)');
  });

  it('throws when by-row rowDeckIds length does not match board rows', () => {
    expect(() =>
      buildLevelDefinition(
        baseInput({
          board: { rows: 4, columns: 5, depth: 1 },
          decks: { mode: 'by-row', rowDeckIds: ['blue-starter', 'red-spike', 'blue-starter'] },
        })
      )
    ).toThrow('rows (4)');
  });

  it('throws when row-depth matrix row count does not match board rows', () => {
    expect(() =>
      buildLevelDefinition(
        baseInput({
          board: { rows: 3, columns: 5, depth: 2 },
          decks: {
            mode: 'row-depth-matrix',
            matrix: [
              ['blue-starter', 'red-spike'],
              ['red-spike', 'blue-starter'],
            ],
          },
        })
      )
    ).toThrow('rows (3)');
  });

  it('throws for an unknown deck id', () => {
    expect(() =>
      buildLevelDefinition(baseInput({ decks: { mode: 'uniform', deckId: 'fake-deck' } }))
    ).toThrow('Unknown Depth deck archetype');
  });

  it('throws when rounds is 0', () => {
    expect(() =>
      buildLevelDefinition(
        baseInput({ economy: { startingBank: 20, rounds: 0, minBet: 1, maxBet: 5 } })
      )
    ).toThrow('positive integer');
  });

  it('throws when startingBank is 0', () => {
    expect(() =>
      buildLevelDefinition(
        baseInput({ economy: { startingBank: 0, rounds: 3, minBet: 1, maxBet: 5 } })
      )
    ).toThrow('positive integer');
  });

  it('throws when minBet exceeds maxBet', () => {
    expect(() =>
      buildLevelDefinition(
        baseInput({ economy: { startingBank: 20, rounds: 3, minBet: 6, maxBet: 5 } })
      )
    ).toThrow('Min bet cannot exceed max bet');
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
