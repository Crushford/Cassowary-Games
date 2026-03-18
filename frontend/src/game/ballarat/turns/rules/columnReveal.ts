import { getAccessiblePositionsForColumn } from '../../board/access';
import type { BoardState, PositionRef, RevealRecord, TurnResolution } from '../../types';
import { revealCardAtPosition } from './basicReveal';

export function resolveColumnRevealTurn(
  board: BoardState,
  position: PositionRef,
  bank: number,
  bet: number
): TurnResolution {
  const positions = getAccessiblePositionsForColumn(board, position.col);
  if (positions.length === 0) {
    throw new Error(`No accessible cards in column ${position.col}`);
  }

  let nextBoard = board;
  let totalPayout = 0;
  let totalNet = 0;
  const reveals: RevealRecord[] = [];

  for (const columnPosition of positions) {
    const result = revealCardAtPosition(nextBoard, columnPosition, bet, 'player');
    nextBoard = result.board;
    totalPayout += result.reveal.payout;
    totalNet += result.reveal.net;
    reveals.push(result.reveal);
  }

  return {
    board: nextBoard,
    playerReveals: reveals,
    dealerReveals: [],
    totalPayout,
    totalNet,
    nextBank: Math.max(0, bank + totalNet),
  };
}
