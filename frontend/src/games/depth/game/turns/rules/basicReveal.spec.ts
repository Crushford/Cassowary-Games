import { describe, expect, it } from 'vitest';

import type { BoardState, CardState, StackState } from '../../types';
import { resolveBasicRevealTurn, revealCardAtPosition } from './basicReveal';

function card(value: number, revealed = false, layerIndex = 0): CardState {
  return {
    value,
    backingColor: 'blue',
    layerIndex,
    revealed,
    revealedBy: revealed ? 'player' : null,
  };
}

function stack(row: number, col: number, cards: CardState[]): StackState {
  return { row, col, cards };
}

function board(rows: StackState[][]): BoardState {
  return {
    rows: rows.length,
    columns: rows[0]?.length ?? 0,
    depth: rows[0]?.[0]?.cards.length ?? 0,
    stacks: rows,
  };
}

describe('revealCardAtPosition', () => {
  it('marks the top accessible card as revealed by the given actor', () => {
    const b = board([[stack(0, 0, [card(3)])]]);
    const { board: next, reveal } = revealCardAtPosition(b, { row: 0, col: 0 }, 2, 'player');

    expect(next.stacks[0][0].cards[0].revealed).toBe(true);
    expect(next.stacks[0][0].cards[0].revealedBy).toBe('player');
    expect(reveal.revealedBy).toBe('player');
  });

  it('does not mutate the original board', () => {
    const b = board([[stack(0, 0, [card(3)])]]);
    revealCardAtPosition(b, { row: 0, col: 0 }, 2, 'player');

    expect(b.stacks[0][0].cards[0].revealed).toBe(false);
  });

  it('calculates payout and net correctly for a player reveal', () => {
    const b = board([[stack(0, 0, [card(3)])]]);
    const { reveal } = revealCardAtPosition(b, { row: 0, col: 0 }, 2, 'player');

    expect(reveal.cardValue).toBe(3);
    expect(reveal.bet).toBe(2);
    expect(reveal.payout).toBe(6);
    expect(reveal.net).toBe(4);
  });

  it('records zero payout and net for a dealer reveal', () => {
    const b = board([[stack(0, 0, [card(3)])]]);
    const { reveal } = revealCardAtPosition(b, { row: 0, col: 0 }, 0, 'dealer');

    expect(reveal.payout).toBe(0);
    expect(reveal.net).toBe(0);
  });

  it('records the correct row, col, and layerIndex in the reveal', () => {
    const b = board([[stack(0, 0, [card(3, false, 0), card(2, false, 1)])]]);
    const { reveal } = revealCardAtPosition(b, { row: 0, col: 0 }, 1, 'player');

    expect(reveal.row).toBe(0);
    expect(reveal.col).toBe(0);
    expect(reveal.layerIndex).toBe(0);
  });

  it('throws when the stack has no accessible card', () => {
    const b = board([[stack(0, 0, [card(3, true)])]]);
    expect(() => revealCardAtPosition(b, { row: 0, col: 0 }, 2, 'player')).toThrow();
  });

  it('reveals the second layer after the top layer is already revealed', () => {
    const b = board([[stack(0, 0, [card(3, true, 0), card(2, false, 1)])]]);
    const { board: next, reveal } = revealCardAtPosition(b, { row: 0, col: 0 }, 1, 'player');

    expect(reveal.layerIndex).toBe(1);
    expect(reveal.cardValue).toBe(2);
    expect(next.stacks[0][0].cards[1].revealed).toBe(true);
  });
});

describe('resolveBasicRevealTurn', () => {
  it('reveals exactly one card and produces one player reveal', () => {
    const b = board([[stack(0, 0, [card(3)]), stack(0, 1, [card(2)])]]);
    const result = resolveBasicRevealTurn(b, { row: 0, col: 0 }, 10, 2);

    expect(result.playerReveals).toHaveLength(1);
    expect(result.dealerReveals).toHaveLength(0);
    expect(result.board.stacks[0][0].cards[0].revealed).toBe(true);
    expect(result.board.stacks[0][1].cards[0].revealed).toBe(false);
  });

  it('calculates bank correctly for a value card: value=3 bet=2 bank=10 → nextBank=14', () => {
    const b = board([[stack(0, 0, [card(3)])]]);
    const result = resolveBasicRevealTurn(b, { row: 0, col: 0 }, 10, 2);

    expect(result.totalPayout).toBe(6);
    expect(result.totalNet).toBe(4);
    expect(result.nextBank).toBe(14);
  });

  it('deducts the bet when a zero-value card is revealed: value=0 bet=3 bank=10 → nextBank=7', () => {
    const b = board([[stack(0, 0, [card(0)])]]);
    const result = resolveBasicRevealTurn(b, { row: 0, col: 0 }, 10, 3);

    expect(result.totalPayout).toBe(0);
    expect(result.totalNet).toBe(-3);
    expect(result.nextBank).toBe(7);
  });

  it('floors nextBank at 0 when net loss exceeds bank', () => {
    const b = board([[stack(0, 0, [card(0)])]]);
    const result = resolveBasicRevealTurn(b, { row: 0, col: 0 }, 2, 5);

    expect(result.nextBank).toBe(0);
  });

  it('throws when selected position has no accessible card', () => {
    const b = board([[stack(0, 0, [card(3, true)])]]);
    expect(() => resolveBasicRevealTurn(b, { row: 0, col: 0 }, 10, 2)).toThrow();
  });
});
