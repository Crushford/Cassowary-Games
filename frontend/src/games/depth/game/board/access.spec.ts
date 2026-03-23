import { describe, expect, it } from 'vitest';

import type { BoardState, CardState, StackState } from '../types';
import {
  getAccessiblePositions,
  getTopAccessibleCard,
  isBoardExhausted,
  isPositionSelectable,
} from './access';

function card(value: number, revealed = false): CardState {
  return {
    value,
    backingColor: 'blue',
    layerIndex: 0,
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

describe('getTopAccessibleCard', () => {
  it('returns the first unrevealed card', () => {
    const s = stack(0, 0, [card(3), card(2)]);
    expect(getTopAccessibleCard(s)?.value).toBe(3);
  });

  it('skips revealed top card and returns the next unrevealed card', () => {
    const s = stack(0, 0, [card(3, true), card(2)]);
    expect(getTopAccessibleCard(s)?.value).toBe(2);
  });

  it('returns null when all cards are revealed', () => {
    const s = stack(0, 0, [card(3, true), card(2, true)]);
    expect(getTopAccessibleCard(s)).toBeNull();
  });

  it('returns null for an empty stack', () => {
    const s = stack(0, 0, []);
    expect(getTopAccessibleCard(s)).toBeNull();
  });
});

describe('isPositionSelectable', () => {
  it('returns true when the stack has an unrevealed top card', () => {
    const b = board([[stack(0, 0, [card(3)])]]);
    expect(isPositionSelectable(b, { row: 0, col: 0 })).toBe(true);
  });

  it('returns false when all cards in the stack are revealed', () => {
    const b = board([[stack(0, 0, [card(3, true)])]]);
    expect(isPositionSelectable(b, { row: 0, col: 0 })).toBe(false);
  });

  it('throws for an out-of-bounds position', () => {
    const b = board([[stack(0, 0, [card(3)])]]);
    expect(() => isPositionSelectable(b, { row: 5, col: 5 })).toThrow();
  });
});

describe('getAccessiblePositions', () => {
  it('returns all selectable positions', () => {
    const b = board([
      [stack(0, 0, [card(3)]), stack(0, 1, [card(0)])],
      [stack(1, 0, [card(2)]), stack(1, 1, [card(0)])],
    ]);
    const positions = getAccessiblePositions(b);
    expect(positions).toHaveLength(4);
  });

  it('excludes exhausted stacks', () => {
    const b = board([[stack(0, 0, [card(3, true)]), stack(0, 1, [card(0)])]]);
    const positions = getAccessiblePositions(b);
    expect(positions).toHaveLength(1);
    expect(positions[0]).toEqual({ row: 0, col: 1 });
  });

  it('returns empty array when all stacks are exhausted', () => {
    const b = board([[stack(0, 0, [card(3, true)]), stack(0, 1, [card(0, true)])]]);
    expect(getAccessiblePositions(b)).toHaveLength(0);
  });
});

describe('isBoardExhausted', () => {
  it('returns true when all stacks are exhausted', () => {
    const b = board([[stack(0, 0, [card(3, true)]), stack(0, 1, [card(0, true)])]]);
    expect(isBoardExhausted(b)).toBe(true);
  });

  it('returns false when at least one stack is still selectable', () => {
    const b = board([[stack(0, 0, [card(3, true)]), stack(0, 1, [card(0)])]]);
    expect(isBoardExhausted(b)).toBe(false);
  });

  it('returns false for a fresh board', () => {
    const b = board([[stack(0, 0, [card(3)]), stack(0, 1, [card(0)])]]);
    expect(isBoardExhausted(b)).toBe(false);
  });
});
