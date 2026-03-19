import { describe, expect, it } from 'vitest';

import type { BoardState, CardState, StackState } from '../types';
import { getBoardAverageAccessibleValue, getRowAverageAccessibleValue } from './summaries';

function card(value: number, revealed = false): CardState {
  return {
    value,
    backingColor: 'blue',
    archetypeId: 'blue-starter',
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

describe('getBoardAverageAccessibleValue', () => {
  it('returns the average value of all accessible top cards', () => {
    const b = board([
      [
        stack(0, 0, [card(3)]),
        stack(0, 1, [card(0)]),
        stack(0, 2, [card(2)]),
        stack(0, 3, [card(0)]),
      ],
    ]);
    expect(getBoardAverageAccessibleValue(b)).toBe(1.25);
  });

  it('returns null when all stacks are exhausted', () => {
    const b = board([[stack(0, 0, [card(3, true)]), stack(0, 1, [card(0, true)])]]);
    expect(getBoardAverageAccessibleValue(b)).toBeNull();
  });

  it('excludes exhausted stacks from the average', () => {
    const b = board([[stack(0, 0, [card(4)]), stack(0, 1, [card(0, true)])]]);
    expect(getBoardAverageAccessibleValue(b)).toBe(4);
  });

  it('includes zero-value accessible cards in the average', () => {
    const b = board([[stack(0, 0, [card(0)]), stack(0, 1, [card(0)])]]);
    expect(getBoardAverageAccessibleValue(b)).toBe(0);
  });
});

describe('getRowAverageAccessibleValue', () => {
  it('returns the average accessible value for a specific row', () => {
    const b = board([
      [
        stack(0, 0, [card(3)]),
        stack(0, 1, [card(2)]),
        stack(0, 2, [card(0)]),
        stack(0, 3, [card(0)]),
        stack(0, 4, [card(0)]),
      ],
      [
        stack(1, 0, [card(5)]),
        stack(1, 1, [card(0)]),
        stack(1, 2, [card(0)]),
        stack(1, 3, [card(0)]),
        stack(1, 4, [card(0)]),
      ],
    ]);

    expect(getRowAverageAccessibleValue(b, 0)).toBe(1);
    expect(getRowAverageAccessibleValue(b, 1)).toBe(1);
  });

  it('returns null when all stacks in the row are exhausted', () => {
    const b = board([[stack(0, 0, [card(3, true)]), stack(0, 1, [card(2, true)])]]);
    expect(getRowAverageAccessibleValue(b, 0)).toBeNull();
  });

  it('excludes exhausted stacks within the row', () => {
    const b = board([[stack(0, 0, [card(4)]), stack(0, 1, [card(2, true)])]]);
    expect(getRowAverageAccessibleValue(b, 0)).toBe(4);
  });

  it('updates correctly after depth reveal exposes a new accessible layer', () => {
    const b = board([
      [
        stack(0, 0, [
          {
            value: 3,
            backingColor: 'blue',
            archetypeId: 'blue-starter',
            layerIndex: 0,
            revealed: true,
            revealedBy: 'player',
          },
          card(2),
        ]),
      ],
    ]);
    expect(getRowAverageAccessibleValue(b, 0)).toBe(2);
  });
});
