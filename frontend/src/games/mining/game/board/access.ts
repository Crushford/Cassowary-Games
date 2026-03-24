import type { ClaimBoardState, GroundStackState, GroundTileState, PositionRef } from '../types';

export function getStack(board: ClaimBoardState, position: PositionRef): GroundStackState {
  const row = board.stacks[position.row];
  const stack = row?.[position.col];

  if (!stack) {
    throw new Error(`Unknown mining position row ${position.row}, col ${position.col}`);
  }

  return stack;
}

export function getTopTile(stack: GroundStackState): GroundTileState | null {
  return stack.tiles.find((tile) => !tile.cleared) ?? null;
}

export function isBoardCleared(board: ClaimBoardState): boolean {
  return board.stacks.flat().every((stack) => getTopTile(stack) === null);
}
