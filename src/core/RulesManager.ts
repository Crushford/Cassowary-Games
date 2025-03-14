import { CellState } from '../prefabs/Cell';
import { GAME_CONSTANTS } from '../config/constants';
import { ThreatenedPositionCalculator, Position } from './ThreatenedPositionCalculator';

export class RulesManager {
  private gridSize: number;
  private threatCalculator: ThreatenedPositionCalculator;

  constructor(gridSize: number = GAME_CONSTANTS.GRID_SIZE) {
    this.gridSize = gridSize;
    this.threatCalculator = new ThreatenedPositionCalculator(gridSize);
  }

  // Check if a queen placement is valid
  public isValidQueenPlacement(row: number, col: number, cellStates: CellState[][]): boolean {
    // Get all current queen positions
    const queens: Position[] = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (cellStates[r][c] === CellState.QUEEN && (r !== row || c !== col)) {
          queens.push({ row: r, col: c });
        }
      }
    }

    // Check if the position is threatened by any existing queens
    return !this.threatCalculator.isPositionThreatened(row, col, cellStates, queens);
  }

  // Get all positions that would be threatened by a queen at the given position
  public getThreatenedPositions(
    queenRow: number,
    queenCol: number,
    cellStates: CellState[][]
  ): Position[] {
    return this.threatCalculator.getThreatenedPositions(queenRow, queenCol, cellStates);
  }

  // Check victory conditions (N non-threatening queens placed)
  public checkVictoryCondition(placedQueens: number, targetQueens: number): boolean {
    return placedQueens >= targetQueens;
  }

  // Check game over conditions
  public checkGameOver(
    resources: { queens: number; gold: number },
    cellStates: CellState[][],
    requiredQueens: number
  ): { isOver: boolean; isVictory: boolean } {
    // Count placed queens
    let placedQueens = 0;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (cellStates[r][c] === CellState.QUEEN) {
          placedQueens++;
        }
      }
    }

    // Check for victory
    if (this.checkVictoryCondition(placedQueens, requiredQueens)) {
      return { isOver: true, isVictory: true };
    }

    // Check for game over (no queens left and not enough gold to buy more)
    if (resources.queens <= 0 && resources.gold < 5) {
      return { isOver: true, isVictory: false };
    }

    // Check if no valid placements are possible
    if (resources.queens > 0) {
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          if (
            cellStates[r][c] === CellState.EMPTY &&
            this.isValidQueenPlacement(r, c, cellStates)
          ) {
            // Found at least one valid placement
            return { isOver: false, isVictory: false };
          }
        }
      }
      // No valid placements found
      return { isOver: true, isVictory: false };
    }

    return { isOver: false, isVictory: false };
  }
}
