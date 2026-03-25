import type { MiningLevelBoard, MiningPuzzleRecord } from '../types';

export function convertQueensPuzzleToMiningBoard(puzzle: MiningPuzzleRecord): MiningLevelBoard {
  const size = Math.sqrt(puzzle.queens.length);

  if (!Number.isInteger(size) || size !== 5) {
    throw new Error(`Mining expects a 5x5 Queens puzzle, received ${puzzle.id}`);
  }

  const truthGold = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => puzzle.queens[row * size + col] === 'Q')
  );

  return {
    puzzleId: puzzle.id,
    size,
    truthGold,
  };
}
