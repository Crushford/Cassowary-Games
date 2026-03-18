import type { BoardState, BuiltLevelDefinition, PositionRef, TurnResolution } from '../types';
import type { ShuffleFn } from '../utils/shuffle';
import { randomShuffle } from '../utils/shuffle';
import { resolveBasicRevealTurn } from './rules/basicReveal';
import { resolveColumnRevealTurn } from './rules/columnReveal';
import { resolveDealerFollowUpTurn } from './rules/dealerFollowUp';

export function resolveTurn(
  level: BuiltLevelDefinition,
  board: BoardState,
  position: PositionRef,
  bank: number,
  bet: number,
  shuffleFn: ShuffleFn = randomShuffle
): TurnResolution {
  switch (level.turnRule) {
    case 'basic-reveal':
      return resolveBasicRevealTurn(board, position, bank, bet);

    case 'column-reveal':
      return resolveColumnRevealTurn(board, position, bank, bet);

    case 'dealer-follow-up':
      return resolveDealerFollowUpTurn(board, position, bank, bet, shuffleFn);

    default:
      throw new Error(`Unknown turn rule: ${String(level.turnRule)}`);
  }
}
