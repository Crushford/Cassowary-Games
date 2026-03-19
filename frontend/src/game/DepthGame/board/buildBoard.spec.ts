import { describe, expect, it } from 'vitest';

import { buildLevelDefinition } from '../builder/buildLevelDefinition';
import type { LevelInput } from '../types';
import { buildBoard } from './buildBoard';

function makeLevel(overrides: Partial<LevelInput> = {}) {
  const base: LevelInput = {
    metadata: { id: 1, name: 'Test' },
    economy: { startingBank: 10, rounds: 1, minBet: 1, maxBet: 5 },
    board: { rows: 1, columns: 5, depth: 1 },
    decks: { mode: 'uniform', deckId: 'blue-starter' },
    rules: { turnRule: 'basic-reveal' },
    support: {},
    ...overrides,
  };
  return buildLevelDefinition(base);
}

describe('buildBoard', () => {
  it('produces correct board dimensions for 1x5x1', () => {
    const level = makeLevel();
    const board = buildBoard(level);

    expect(board.rows).toBe(1);
    expect(board.columns).toBe(5);
    expect(board.depth).toBe(1);
    expect(board.stacks).toHaveLength(1);
    expect(board.stacks[0]).toHaveLength(5);
  });

  it('produces correct board dimensions for 2x3x1', () => {
    const level = makeLevel({
      board: { rows: 2, columns: 3, depth: 1 },
      decks: { mode: 'uniform', deckId: 'blue-starter' },
    });
    const board = buildBoard(level);

    expect(board.rows).toBe(2);
    expect(board.columns).toBe(3);
    expect(board.stacks).toHaveLength(2);
    expect(board.stacks[0]).toHaveLength(3);
    expect(board.stacks[1]).toHaveLength(3);
  });

  it('every stack has exactly depth cards', () => {
    const level = makeLevel({
      board: { rows: 1, columns: 3, depth: 2 },
      decks: { mode: 'by-depth', depthDeckIds: ['blue-starter', 'blue-starter'] },
      testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
    });
    const board = buildBoard(level);

    for (const stack of board.stacks[0]) {
      expect(stack.cards).toHaveLength(2);
    }
  });

  it('total card count equals rows × columns × depth', () => {
    const level = makeLevel({
      board: { rows: 2, columns: 3, depth: 2 },
      decks: { mode: 'by-depth', depthDeckIds: ['blue-starter', 'blue-starter'] },
      testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
    });
    const board = buildBoard(level);

    const totalCards = board.stacks.flat().reduce((sum, stack) => sum + stack.cards.length, 0);
    expect(totalCards).toBe(2 * 3 * 2);
  });

  it('every card starts unrevealed with no revealedBy actor', () => {
    const level = makeLevel({ testing: { forcedDeckOrder: [3, 2, 0, 0, 0] } });
    const board = buildBoard(level);

    for (const stack of board.stacks.flat()) {
      for (const card of stack.cards) {
        expect(card.revealed).toBe(false);
        expect(card.revealedBy).toBeNull();
      }
    }
  });

  it('assigns correct archetypeId per layer from deckMatrix', () => {
    const level = makeLevel({
      board: { rows: 2, columns: 2, depth: 2 },
      decks: {
        mode: 'row-depth-matrix',
        matrix: [
          ['blue-starter', 'red-spike'],
          ['red-spike', 'blue-starter'],
        ],
      },
      testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
    });
    const board = buildBoard(level);

    expect(board.stacks[0][0].cards[0].archetypeId).toBe('blue-starter');
    expect(board.stacks[0][0].cards[1].archetypeId).toBe('red-spike');
    expect(board.stacks[1][0].cards[0].archetypeId).toBe('red-spike');
    expect(board.stacks[1][0].cards[1].archetypeId).toBe('blue-starter');
  });

  it('assigns card values from forced deck order deterministically', () => {
    const level = makeLevel({
      board: { rows: 1, columns: 5, depth: 1 },
      testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
    });
    const board = buildBoard(level);

    const values = board.stacks[0].map((stack) => stack.cards[0].value);
    expect(values).toEqual([3, 2, 0, 0, 0]);
  });

  it('assigns correct layerIndex to cards by depth position', () => {
    const level = makeLevel({
      board: { rows: 1, columns: 2, depth: 2 },
      decks: { mode: 'by-depth', depthDeckIds: ['blue-starter', 'blue-starter'] },
      testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
    });
    const board = buildBoard(level);

    expect(board.stacks[0][0].cards[0].layerIndex).toBe(0);
    expect(board.stacks[0][0].cards[1].layerIndex).toBe(1);
  });

  it('builds a 10x10x10 board with 1000 total cards', () => {
    const level = buildLevelDefinition({
      metadata: { id: 200, name: 'Giant' },
      economy: { startingBank: 35, rounds: 3, minBet: 1, maxBet: 5 },
      board: { rows: 10, columns: 10, depth: 10 },
      decks: {
        mode: 'by-depth',
        depthDeckIds: Array(10).fill('orange-split-10') as string[],
      },
      rules: { turnRule: 'basic-reveal' },
      support: {},
    });
    const board = buildBoard(level);

    expect(board.rows).toBe(10);
    expect(board.columns).toBe(10);
    expect(board.depth).toBe(10);
    const totalCards = board.stacks.flat().reduce((sum, stack) => sum + stack.cards.length, 0);
    expect(totalCards).toBe(1000);
  });
});
