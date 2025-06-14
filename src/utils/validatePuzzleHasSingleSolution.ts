import type { GridSquare, MarkType, Pos } from '../types/types';

type PlayerMarks = MarkType[][];

/**
 * Validates if a puzzle has exactly one solution using a brute force approach.
 * This is a simplified version of bruteForceSolver that only checks for single-solution puzzles.
 *
 * @param grid The puzzle grid to validate
 * @param maxSolutions Maximum number of solutions to check for (default: 2)
 * @returns true if the puzzle has exactly one solution, false otherwise
 */
export function validatePuzzleHasSingleSolution(
  grid: GridSquare[][],
  maxSolutions: number = 2
): boolean {
  const gridSize = grid.length;

  // Create a temporary playerMarks array for validation
  const playerMarks: PlayerMarks = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null)
  );

  const stepStates: PlayerMarks[] = [];
  let currentStep = 0;

  function findNextEmptySquare(playerMarks: MarkType[][]): { row: number; col: number } | null {
    for (let row = 0; row < playerMarks.length; row++) {
      for (let col = 0; col < playerMarks[row].length; col++) {
        if (playerMarks[row][col] === null) {
          return { row, col };
        }
      }
    }
    return null;
  }

  while (findNextEmptySquare(playerMarks)) {
    stepStates.push(JSON.parse(JSON.stringify(playerMarks)));
  }
}
