import type { BoardState, CardState, PositionRef, StackState } from '../types';

export function getStack(board: BoardState, position: PositionRef): StackState {
  const row = board.stacks[position.row];
  const stack = row?.[position.col];

  if (!stack) {
    throw new Error(`Unknown Depth board position row ${position.row}, col ${position.col}`);
  }

  return stack;
}

export function getTopAccessibleCard(stack: StackState): CardState | null {
  return stack.cards.find((card) => !card.revealed) ?? null;
}

export function isPositionSelectable(board: BoardState, position: PositionRef): boolean {
  return getTopAccessibleCard(getStack(board, position)) !== null;
}

export function getAccessiblePositions(board: BoardState): PositionRef[] {
  const positions: PositionRef[] = [];

  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.columns; col += 1) {
      const position = { row, col };
      if (isPositionSelectable(board, position)) {
        positions.push(position);
      }
    }
  }

  return positions;
}

export function getAccessiblePositionsForColumn(board: BoardState, col: number): PositionRef[] {
  const positions: PositionRef[] = [];

  for (let row = 0; row < board.rows; row += 1) {
    const position = { row, col };
    if (isPositionSelectable(board, position)) {
      positions.push(position);
    }
  }

  return positions;
}

export function isBoardExhausted(board: BoardState): boolean {
  return getAccessiblePositions(board).length === 0;
}
