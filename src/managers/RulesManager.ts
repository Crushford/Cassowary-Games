// src/managers/RulesManager.ts
import { CellState } from '../prefabs/Cell';
import { GAME_CONSTANTS } from '../config/constants';

export class RulesManager {
  private gridSize: number;
  private threatDirections: typeof GAME_CONSTANTS.THREATENED_DIRECTIONS;

  constructor(gridSize: number = GAME_CONSTANTS.GRID_SIZE) {
    this.gridSize = gridSize;
    this.threatDirections = GAME_CONSTANTS.THREATENED_DIRECTIONS;
  }

  // Check if a queen placement is valid
  isValidQueenPlacement(row: number, col: number, cellStates: CellState[][]): boolean {
    // Check for queen in same row
    if (this.threatDirections.ROW) {
      for (let c = 0; c < this.gridSize; c++) {
        if (c !== col && cellStates[row][c] === CellState.QUEEN) {
          return false;
        }
      }
    }

    // Check for queen in same column
    if (this.threatDirections.COLUMN) {
      for (let r = 0; r < this.gridSize; r++) {
        if (r !== row && cellStates[r][col] === CellState.QUEEN) {
          return false;
        }
      }
    }

    // Check diagonal threats - only check immediate diagonals
    if (this.threatDirections.ADJACENT_DIAGONAL) {
      // Top-left
      if (row > 0 && col > 0 && cellStates[row - 1][col - 1] === CellState.QUEEN) {
        return false;
      }
      // Top-right
      if (row > 0 && col < this.gridSize - 1 && cellStates[row - 1][col + 1] === CellState.QUEEN) {
        return false;
      }
      // Bottom-left
      if (row < this.gridSize - 1 && col > 0 && cellStates[row + 1][col - 1] === CellState.QUEEN) {
        return false;
      }
      // Bottom-right
      if (
        row < this.gridSize - 1 &&
        col < this.gridSize - 1 &&
        cellStates[row + 1][col + 1] === CellState.QUEEN
      ) {
        return false;
      }
    }

    return true;
  }

  // Get all positions that would be threatened by a queen at the given position
  getThreatenedPositions(
    queenRow: number,
    queenCol: number,
    cellStates: CellState[][]
  ): { row: number; col: number }[] {
    const threatened: { row: number; col: number }[] = [];

    // Row threats
    if (this.threatDirections.ROW) {
      for (let c = 0; c < this.gridSize; c++) {
        if (c !== queenCol && cellStates[queenRow][c] === CellState.EMPTY) {
          threatened.push({ row: queenRow, col: c });
        }
      }
    }

    // Column threats
    if (this.threatDirections.COLUMN) {
      for (let r = 0; r < this.gridSize; r++) {
        if (r !== queenRow && cellStates[r][queenCol] === CellState.EMPTY) {
          threatened.push({ row: r, col: queenCol });
        }
      }
    }

    // Adjacent diagonal threats
    if (this.threatDirections.ADJACENT_DIAGONAL) {
      // Top-left
      if (
        queenRow > 0 &&
        queenCol > 0 &&
        cellStates[queenRow - 1][queenCol - 1] === CellState.EMPTY
      ) {
        threatened.push({ row: queenRow - 1, col: queenCol - 1 });
      }
      // Top-right
      if (
        queenRow > 0 &&
        queenCol < this.gridSize - 1 &&
        cellStates[queenRow - 1][queenCol + 1] === CellState.EMPTY
      ) {
        threatened.push({ row: queenRow - 1, col: queenCol + 1 });
      }
      // Bottom-left
      if (
        queenRow < this.gridSize - 1 &&
        queenCol > 0 &&
        cellStates[queenRow + 1][queenCol - 1] === CellState.EMPTY
      ) {
        threatened.push({ row: queenRow + 1, col: queenCol - 1 });
      }
      // Bottom-right
      if (
        queenRow < this.gridSize - 1 &&
        queenCol < this.gridSize - 1 &&
        cellStates[queenRow + 1][queenCol + 1] === CellState.EMPTY
      ) {
        threatened.push({ row: queenRow + 1, col: queenCol + 1 });
      }
    }

    return threatened;
  }

  // Check if there are any valid moves left
  hasValidMoves(cellStates: CellState[][]): boolean {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (cellStates[row][col] === CellState.EMPTY) {
          if (this.isValidQueenPlacement(row, col, cellStates)) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
