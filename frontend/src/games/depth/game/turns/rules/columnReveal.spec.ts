import { describe, expect, it } from 'vitest';

import type { BoardState, CardState, StackState } from '../../types';
import { resolveColumnRevealTurn } from './columnReveal';

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

describe('resolveColumnRevealTurn', () => {
  it('reveals exactly one accessible card per row in the selected column', () => {
    const b = board([
      [stack(0, 0, [card(3)]), stack(0, 1, [card(0)])],
      [stack(1, 0, [card(2)]), stack(1, 1, [card(0)])],
      [stack(2, 0, [card(0)]), stack(2, 1, [card(0)])],
    ]);

    const result = resolveColumnRevealTurn(b, { row: 0, col: 0 }, 10, 2);

    expect(result.playerReveals).toHaveLength(3);
    expect(result.board.stacks[0][0].cards[0].revealed).toBe(true);
    expect(result.board.stacks[1][0].cards[0].revealed).toBe(true);
    expect(result.board.stacks[2][0].cards[0].revealed).toBe(true);
    expect(result.board.stacks[0][1].cards[0].revealed).toBe(false);
  });

  it('only uses the column from the selected position, not the row', () => {
    const b = board([
      [stack(0, 0, [card(3)]), stack(0, 1, [card(5)])],
      [stack(1, 0, [card(2)]), stack(1, 1, [card(5)])],
    ]);

    const resultViaRow0 = resolveColumnRevealTurn(b, { row: 0, col: 0 }, 10, 1);
    const resultViaRow1 = resolveColumnRevealTurn(b, { row: 1, col: 0 }, 10, 1);

    expect(resultViaRow0.totalPayout).toBe(resultViaRow1.totalPayout);
    expect(resultViaRow0.playerReveals).toHaveLength(2);
    expect(resultViaRow1.playerReveals).toHaveLength(2);
  });

  it('payout equals bet multiplied by the sum of all revealed column values', () => {
    // column 0 values: [3, 0, 2, 0] → columnTotal = 5
    const b = board([
      [stack(0, 0, [card(3)])],
      [stack(1, 0, [card(0)])],
      [stack(2, 0, [card(2)])],
      [stack(3, 0, [card(0)])],
    ]);

    const result = resolveColumnRevealTurn(b, { row: 0, col: 0 }, 10, 2);

    expect(result.totalPayout).toBe(10); // 2 * 5
    expect(result.totalNet).toBe(8); // 10 - 2
    expect(result.nextBank).toBe(18); // 10 + 8
  });

  it('deducts bet once even when multiple cards are revealed', () => {
    // 3 cards all value 0 → payout = 0, net = 0 - bet = -2
    const b = board([[stack(0, 0, [card(0)])], [stack(1, 0, [card(0)])], [stack(2, 0, [card(0)])]]);

    const result = resolveColumnRevealTurn(b, { row: 0, col: 0 }, 10, 2);

    expect(result.totalPayout).toBe(0);
    expect(result.totalNet).toBe(-2);
    expect(result.nextBank).toBe(8);
  });

  it('floors nextBank at 0 when net loss exceeds bank', () => {
    const b = board([[stack(0, 0, [card(0)])]]);

    const result = resolveColumnRevealTurn(b, { row: 0, col: 0 }, 1, 5);

    expect(result.nextBank).toBe(0);
  });

  it('ignores exhausted stacks in the column and only reveals accessible ones', () => {
    const b = board([
      [stack(0, 0, [card(3, true)])], // exhausted
      [stack(1, 0, [card(2)])],
      [stack(2, 0, [card(0)])],
    ]);

    const result = resolveColumnRevealTurn(b, { row: 0, col: 0 }, 10, 2);

    expect(result.playerReveals).toHaveLength(2);
    expect(result.totalPayout).toBe(4); // 2 * 2
    expect(result.totalNet).toBe(2); // 4 - 2
  });

  it('does not reveal deeper cards that become exposed during the same turn', () => {
    const b = board([[stack(0, 0, [card(3, false, 0), card(2, false, 1)])]]);

    const result = resolveColumnRevealTurn(b, { row: 0, col: 0 }, 10, 2);

    expect(result.playerReveals).toHaveLength(1);
    expect(result.playerReveals[0].layerIndex).toBe(0);
    expect(result.board.stacks[0][0].cards[0].revealed).toBe(true);
    expect(result.board.stacks[0][0].cards[1].revealed).toBe(false);
  });

  it('throws when no accessible cards exist in the selected column', () => {
    const b = board([[stack(0, 0, [card(3, true)])], [stack(1, 0, [card(2, true)])]]);

    expect(() => resolveColumnRevealTurn(b, { row: 0, col: 0 }, 10, 2)).toThrow(
      'No accessible cards in column 0'
    );
  });

  it('does not mutate the original board', () => {
    const b = board([[stack(0, 0, [card(3)]), stack(0, 1, [card(0)])]]);

    resolveColumnRevealTurn(b, { row: 0, col: 0 }, 10, 2);

    expect(b.stacks[0][0].cards[0].revealed).toBe(false);
  });

  it('each reveal record identifies the correct row, col, and layer', () => {
    const b = board([[stack(0, 0, [card(3, false, 0)])], [stack(1, 0, [card(2, false, 0)])]]);

    const result = resolveColumnRevealTurn(b, { row: 0, col: 0 }, 10, 2);

    expect(result.playerReveals[0]).toMatchObject({
      row: 0,
      col: 0,
      layerIndex: 0,
      revealedBy: 'player',
    });
    expect(result.playerReveals[1]).toMatchObject({
      row: 1,
      col: 0,
      layerIndex: 0,
      revealedBy: 'player',
    });
  });

  it('dealer reveals are always empty', () => {
    const b = board([[stack(0, 0, [card(3)])]]);
    const result = resolveColumnRevealTurn(b, { row: 0, col: 0 }, 10, 2);

    expect(result.dealerReveals).toHaveLength(0);
  });
});
