import type { GridSquare } from '../types/types';
import { cloneGrid, getQueenPositions } from './gameStoreUtils';
import { runAllSolverSteps } from './solver';

/**
 * Brute force solver that finds multiple solutions to a puzzle using backtracking.
 * @param grid The current grid state
 * @param gridSize The size of the grid (NxN)
 * @param placeQueen Function to place a queen at a position
 * @param placeFlag Function to place a flag at a position
 * @param countFlags Function to count current flags
 * @param getQueenPositions Function to get current queen positions
 * @param addDebugLog Function to add debug logs
 * @param maxSolutions Maximum number of solutions to find (default: 5)
 * @returns Number of solutions found
 */
export function bruteForceSolver(
  grid: GridSquare[][],
  gridSize: number,
  placeQueen: (row: number, col: number) => boolean,
  placeFlag: (row: number, col: number) => boolean,
  countFlags: () => number,
  getQueenPositions: () => { row: number; col: number }[],
  addDebugLog: (message: string) => void,
  maxSolutions: number = 5
): number {
  // 1) Seed all logical flags & simple placements
  runAllSolverSteps(
    grid,
    gridSize,
    placeQueen,
    placeFlag,
    countFlags,
    getQueenPositions,
    (msg) => addDebugLog(msg),
    false // set `verbose=false` so it only applies flags
  );

  let solutionCount = 0;

  const search = () => {
    // Early exit
    if (solutionCount >= maxSolutions) return;

    // 2) Check for complete solution
    const queens = getQueenPositions();
    if (queens.length === gridSize) {
      solutionCount++;
      return;
    }

    // 3) Try every empty square
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col].playerMark !== 'empty') continue;

        // 3a) Snapshot grid state
        const snapshot = cloneGrid(grid);

        // 3b) Place queen & re-apply flags
        placeQueen(row, col);
        runAllSolverSteps(
          grid,
          gridSize,
          placeQueen,
          placeFlag,
          countFlags,
          getQueenPositions,
          (msg) => addDebugLog(`(bf) ${msg}`),
          false
        );

        // Recurse deeper
        search();
        if (solutionCount >= maxSolutions) return;

        // 3c) Restore snapshot
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            grid[r][c] = { ...snapshot[r][c] };
          }
        }
      }
    }
  };

  // Start the search
  search();
  return solutionCount;
}
