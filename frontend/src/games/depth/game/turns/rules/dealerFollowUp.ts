import { getAccessiblePositions } from '../../board/access';
import type { BoardState, PositionRef, TurnResolution } from '../../types';
import type { ShuffleFn } from '../../utils/shuffle';
import { randomShuffle } from '../../utils/shuffle';
import { revealCardAtPosition } from './basicReveal';

export function resolveDealerFollowUpTurn(
  board: BoardState,
  position: PositionRef,
  bank: number,
  bet: number,
  shuffleFn: ShuffleFn = randomShuffle
): TurnResolution {
  const playerResult = revealCardAtPosition(board, position, bet, 'player');
  const accessible = getAccessiblePositions(playerResult.board).filter(
    (candidate) => !(candidate.row === position.row && candidate.col === position.col)
  );

  if (accessible.length === 0) {
    return {
      board: playerResult.board,
      playerReveals: [playerResult.reveal],
      dealerReveals: [],
      totalPayout: playerResult.reveal.payout,
      totalNet: playerResult.reveal.net,
      nextBank: Math.max(0, bank + playerResult.reveal.net),
    };
  }

  const [dealerTarget] = shuffleFn(accessible);
  const dealerResult = revealCardAtPosition(playerResult.board, dealerTarget, 0, 'dealer');

  return {
    board: dealerResult.board,
    playerReveals: [playerResult.reveal],
    dealerReveals: [dealerResult.reveal],
    totalPayout: playerResult.reveal.payout,
    totalNet: playerResult.reveal.net,
    nextBank: Math.max(0, bank + playerResult.reveal.net),
  };
}
