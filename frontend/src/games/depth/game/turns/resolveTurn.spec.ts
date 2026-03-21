import { describe, expect, it } from 'vitest';

import { buildLevelDefinition } from '../builder/buildLevelDefinition';
import { buildBoard } from '../board/buildBoard';
import type { LevelInput } from '../types';
import { resolveTurn } from './resolveTurn';

function makeLevel(turnRule: LevelInput['rules']['turnRule'], extra: Partial<LevelInput> = {}) {
  return buildLevelDefinition({
    metadata: { id: 1, name: 'Test' },
    economy: { startingBank: 10, rounds: 1, minBet: 1, maxBet: 5 },
    board: { rows: 1, columns: 3, depth: 1 },
    decks: { mode: 'uniform', deckId: 'blue' },
    rules: { turnRule },
    support: {},
    testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
    ...extra,
  });
}

describe('resolveTurn', () => {
  it('dispatches basic-reveal and returns a single player reveal', () => {
    const level = makeLevel('basic-reveal');
    const b = buildBoard(level);
    const result = resolveTurn(level, b, { row: 0, col: 0 }, 10, 2);

    expect(result.playerReveals).toHaveLength(1);
    expect(result.dealerReveals).toHaveLength(0);
    expect(result.playerReveals[0].cardValue).toBe(3);
  });

  it('dispatches column-reveal, reveals all accessible cards in the column, and applies single-bet economics', () => {
    // 3-row × 1-col board, forced values [3, 2, 0] (one per row via forcedDeckOrder)
    const level = makeLevel('column-reveal', {
      board: { rows: 3, columns: 1, depth: 1 },
      decks: { mode: 'uniform', deckId: 'blue' },
      testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
    });
    const b = buildBoard(level);
    const result = resolveTurn(level, b, { row: 0, col: 0 }, 10, 2);

    // Each row gets the same forcedDeckOrder, so col 0 value = 3 in all 3 rows
    // columnTotal = 9; payout = 2 * 9 = 18; net = 18 - 2 = 16
    expect(result.playerReveals).toHaveLength(3);
    expect(result.totalPayout).toBe(18);
    expect(result.totalNet).toBe(16);
    expect(result.nextBank).toBe(26);
  });

  it('dispatches column-choice-reveal, reveals the whole column, and only pays on the chosen card', () => {
    const level = makeLevel('column-choice-reveal', {
      board: { rows: 3, columns: 1, depth: 1 },
      decks: { mode: 'uniform', deckId: 'blue' },
      testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
    });
    const b = buildBoard(level);
    const result = resolveTurn(level, b, { row: 1, col: 0 }, 10, 2);

    expect(result.playerReveals).toHaveLength(3);
    expect(result.playerReveals.filter((reveal) => reveal.revealedBy === 'player')).toHaveLength(1);
    expect(result.playerReveals.filter((reveal) => reveal.revealedBy === 'effect')).toHaveLength(2);
    expect(result.totalPayout).toBe(6);
    expect(result.totalNet).toBe(4);
    expect(result.nextBank).toBe(14);
  });

  it('dispatches dealer-follow-up and produces both player and dealer reveals', () => {
    const level = makeLevel('dealer-follow-up', {
      board: { rows: 1, columns: 2, depth: 1 },
      decks: { mode: 'uniform', deckId: 'blue' },
      testing: { forcedDeckOrder: [3, 2, 0, 0, 0] },
    });
    const b = buildBoard(level);
    const result = resolveTurn(level, b, { row: 0, col: 0 }, 10, 2);

    expect(result.playerReveals).toHaveLength(1);
    expect(result.dealerReveals).toHaveLength(1);
  });

  it('throws a clear error for an unknown turn rule', () => {
    const level = makeLevel('basic-reveal');
    const b = buildBoard(level);
    const badLevel = { ...level, turnRule: 'unknown-rule' as never };

    expect(() => resolveTurn(badLevel, b, { row: 0, col: 0 }, 10, 2)).toThrow('Unknown turn rule');
  });
});
