import { getAccessiblePositionsForColumn } from '../../board/access';
import { getPayout } from '../../rules/payouts';
import type { BoardState, PositionRef, RevealRecord, TurnResolution } from '../../types';
import { revealCardAtPosition } from './basicReveal';

export function resolveColumnChoiceRevealTurn(
  board: BoardState,
  position: PositionRef,
  bank: number,
  bet: number
): TurnResolution {
  const positions = getAccessiblePositionsForColumn(board, position.col);
  if (positions.length === 0) {
    throw new Error(`No accessible cards in column ${position.col}`);
  }

  const selectedPosition = positions.find(
    (candidate) => candidate.row === position.row && candidate.col === position.col
  );

  if (!selectedPosition) {
    throw new Error(`Selected position row ${position.row}, col ${position.col} is not accessible`);
  }

  let nextBoard = board;
  const playerReveals: RevealRecord[] = [];

  for (const columnPosition of positions) {
    const result = revealCardAtPosition(nextBoard, columnPosition, 0, 'effect');
    nextBoard = result.board;

    const isSelected =
      columnPosition.row === selectedPosition.row && columnPosition.col === selectedPosition.col;

    if (isSelected) {
      const payout = getPayout(result.reveal.cardValue, bet);
      playerReveals.push({
        ...result.reveal,
        bet,
        payout,
        net: payout - bet,
        revealedBy: 'player',
      });
    } else {
      playerReveals.push({
        ...result.reveal,
        revealedBy: 'effect',
      });
    }
  }

  const chosenReveal = playerReveals.find((reveal) => reveal.revealedBy === 'player');
  if (!chosenReveal) {
    throw new Error(`No chosen card recorded for column ${position.col}`);
  }

  return {
    board: nextBoard,
    playerReveals,
    dealerReveals: [],
    totalPayout: chosenReveal.payout,
    totalNet: chosenReveal.net,
    nextBank: Math.max(0, bank + chosenReveal.net),
  };
}
