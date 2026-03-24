import { canMineGroundType, getGroundDeck } from '../../constants/groundDecks';
import { getStack, getTopTile } from '../board/access';
import type { ClaimBoardState, DigResult, PositionRef, ProcessingLoad, ToolTier } from '../types';

function cloneBoard(board: ClaimBoardState): ClaimBoardState {
  return JSON.parse(JSON.stringify(board)) as ClaimBoardState;
}

export function digSquare(
  board: ClaimBoardState,
  position: PositionRef,
  shovelPower: number,
  toolTier: ToolTier,
  processingLoad: ProcessingLoad | null
): DigResult {
  const nextBoard = cloneBoard(board);
  const stack = getStack(nextBoard, position);
  const tile = getTopTile(stack);

  if (!tile) {
    return {
      ok: false,
      message: 'That ground has already been worked.',
    };
  }

  const deck = getGroundDeck(tile.groundType);

  if (!canMineGroundType(toolTier, tile.groundType)) {
    return {
      ok: false,
      message: `You need a better tool before you can work ${deck.label.toLowerCase()}.`,
    };
  }

  if (processingLoad && tile.processingTime > 0) {
    return {
      ok: false,
      message: `Finish processing the ${processingLoad.label.toLowerCase()} before digging more heavy ground.`,
    };
  }

  tile.currentDensity = Math.max(0, tile.currentDensity - shovelPower);

  if (tile.currentDensity > 0) {
    return {
      ok: true,
      board: nextBoard,
      processingLoad,
      goldAwarded: 0,
      tailingsAdded: 0,
      daysSpent: 1,
    };
  }

  tile.cleared = true;

  if (tile.processingTime === 0) {
    return {
      ok: true,
      board: nextBoard,
      processingLoad,
      goldAwarded: tile.goldValue,
      tailingsAdded: 1,
      daysSpent: 1,
    };
  }

  return {
    ok: true,
    board: nextBoard,
    processingLoad: {
      groundType: tile.groundType,
      label: deck.label,
      goldValue: tile.goldValue,
      remainingDays: tile.processingTime,
      totalDays: tile.processingTime,
    },
    goldAwarded: 0,
    tailingsAdded: 0,
    daysSpent: 1,
  };
}
