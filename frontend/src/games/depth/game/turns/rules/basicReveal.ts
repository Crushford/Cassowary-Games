import { getStack, getTopAccessibleCard } from '../../board/access';
import { getPayout } from '../../rules/payouts';
import type { BoardState, PositionRef, RevealRecord, TurnResolution } from '../../types';

function cloneBoard(board: BoardState): BoardState {
  return {
    rows: board.rows,
    columns: board.columns,
    depth: board.depth,
    stacks: board.stacks.map((row) =>
      row.map((stack) => ({
        row: stack.row,
        col: stack.col,
        cards: stack.cards.map((card) => ({
          value: card.value,
          backingColor: card.backingColor,
          layerIndex: card.layerIndex,
          revealed: card.revealed,
          revealedBy: card.revealedBy,
        })),
      }))
    ),
  };
}

export function revealCardAtPosition(
  board: BoardState,
  position: PositionRef,
  bet: number,
  actor: 'player' | 'dealer' | 'effect'
): { board: BoardState; reveal: RevealRecord } {
  const nextBoard = cloneBoard(board);
  const stack = getStack(nextBoard, position);
  const card = getTopAccessibleCard(stack);

  if (!card) {
    throw new Error(`No accessible card at row ${position.row}, col ${position.col}`);
  }

  card.revealed = true;
  card.revealedBy = actor;

  const payout = actor === 'player' ? getPayout(card.value, bet) : 0;
  const net = actor === 'player' ? payout - bet : 0;

  return {
    board: nextBoard,
    reveal: {
      row: position.row,
      col: position.col,
      layerIndex: card.layerIndex,
      cardValue: card.value,
      bet,
      payout,
      net,
      revealedBy: actor,
    },
  };
}

export function resolveBasicRevealTurn(
  board: BoardState,
  position: PositionRef,
  bank: number,
  bet: number
): TurnResolution {
  const { board: nextBoard, reveal } = revealCardAtPosition(board, position, bet, 'player');

  return {
    board: nextBoard,
    playerReveals: [reveal],
    dealerReveals: [],
    totalPayout: reveal.payout,
    totalNet: reveal.net,
    nextBank: Math.max(0, bank + reveal.net),
  };
}
