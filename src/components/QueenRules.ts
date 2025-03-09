// src/components/QueenRules.ts
import { CellState } from './AntGridScene';

export class QueenRules {
  private gridSize: number;

  constructor(gridSize: number) {
    this.gridSize = gridSize;
  }

  public isValidQueenPlacement(row: number, col: number, cellStates: CellState[][]): boolean {
    // Check if there's already a queen in the same row
    for (let c = 0; c < this.gridSize; c++) {
      if (c !== col && cellStates[row][c] === CellState.QUEEN) {
        return false;
      }
    }

    // Check if there's already a queen in the same column
    for (let r = 0; r < this.gridSize; r++) {
      if (r !== row && cellStates[r][col] === CellState.QUEEN) {
        return false;
      }
    }

    // Check immediate diagonal neighbors only (1 square in each direction)
    // Top-left diagonal
    if (row > 0 && col > 0 && cellStates[row - 1][col - 1] === CellState.QUEEN) {
      return false;
    }
    // Top-right diagonal
    if (row > 0 && col < this.gridSize - 1 && cellStates[row - 1][col + 1] === CellState.QUEEN) {
      return false;
    }
    // Bottom-left diagonal
    if (row < this.gridSize - 1 && col > 0 && cellStates[row + 1][col - 1] === CellState.QUEEN) {
      return false;
    }
    // Bottom-right diagonal
    if (
      row < this.gridSize - 1 &&
      col < this.gridSize - 1 &&
      cellStates[row + 1][col + 1] === CellState.QUEEN
    ) {
      return false;
    }

    return true;
  }

  public getThreatenedPositions(
    queenRow: number,
    queenCol: number,
    cellStates: CellState[][]
  ): { row: number; col: number }[] {
    const threatened: { row: number; col: number }[] = [];

    // Row threats - soldier ants patrol the entire row
    for (let c = 0; c < this.gridSize; c++) {
      if (c !== queenCol && cellStates[queenRow][c] === CellState.EMPTY) {
        threatened.push({ row: queenRow, col: c });
      }
    }

    // Column threats - soldier ants patrol the entire column
    for (let r = 0; r < this.gridSize; r++) {
      if (r !== queenRow && cellStates[r][queenCol] === CellState.EMPTY) {
        threatened.push({ row: r, col: queenCol });
      }
    }

    // Check immediate diagonal neighbors only (1 square in each direction)
    // Top-left diagonal
    if (
      queenRow > 0 &&
      queenCol > 0 &&
      cellStates[queenRow - 1][queenCol - 1] === CellState.EMPTY
    ) {
      threatened.push({ row: queenRow - 1, col: queenCol - 1 });
    }
    // Top-right diagonal
    if (
      queenRow > 0 &&
      queenCol < this.gridSize - 1 &&
      cellStates[queenRow - 1][queenCol + 1] === CellState.EMPTY
    ) {
      threatened.push({ row: queenRow - 1, col: queenCol + 1 });
    }
    // Bottom-left diagonal
    if (
      queenRow < this.gridSize - 1 &&
      queenCol > 0 &&
      cellStates[queenRow + 1][queenCol - 1] === CellState.EMPTY
    ) {
      threatened.push({ row: queenRow + 1, col: queenCol - 1 });
    }
    // Bottom-right diagonal
    if (
      queenRow < this.gridSize - 1 &&
      queenCol < this.gridSize - 1 &&
      cellStates[queenRow + 1][queenCol + 1] === CellState.EMPTY
    ) {
      threatened.push({ row: queenRow + 1, col: queenCol + 1 });
    }

    return threatened;
  }

  public hasValidMoves(cellStates: CellState[][]): boolean {
    // Check if there are any empty cells left that aren't threatened
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (cellStates[row][col] === CellState.EMPTY) {
          // Check if a queen can be placed here
          if (this.isValidQueenPlacement(row, col, cellStates)) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
