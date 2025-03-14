import { CellState } from '../prefabs/Cell';
import { GAME_CONSTANTS } from '../config/constants';

export interface Position {
  row: number;
  col: number;
}

export class ThreatenedPositionCalculator {
  private gridSize: number;
  private threatDirections: typeof GAME_CONSTANTS.THREATENED_DIRECTIONS;

  constructor(gridSize: number = GAME_CONSTANTS.GRID_SIZE) {
    this.gridSize = gridSize;
    this.threatDirections = GAME_CONSTANTS.THREATENED_DIRECTIONS;
  }

  // Calculate all threatened positions from a queen
  public getThreatenedPositions(
    queenRow: number,
    queenCol: number,
    cellStates: CellState[][]
  ): Position[] {
    const threatened: Position[] = [];

    // Add positions from each direction based on threat rules
    if (this.threatDirections.ROW) {
      this.addRowThreats(queenRow, queenCol, cellStates, threatened);
    }

    if (this.threatDirections.COLUMN) {
      this.addColumnThreats(queenRow, queenCol, cellStates, threatened);
    }

    if (this.threatDirections.DIAGONAL) {
      this.addLongDiagonalThreats(queenRow, queenCol, cellStates, threatened);
    }

    if (this.threatDirections.ADJACENT_DIAGONAL) {
      this.addAdjacentDiagonalThreats(queenRow, queenCol, cellStates, threatened);
    }

    return threatened;
  }

  // Calculate if a position is threatened by any queen
  public isPositionThreatened(
    row: number,
    col: number,
    cellStates: CellState[][],
    queens: Position[]
  ): boolean {
    for (const queen of queens) {
      const { row: qRow, col: qCol } = queen;

      // Check row threat
      if (this.threatDirections.ROW && row === qRow && col !== qCol) {
        return true;
      }

      // Check column threat
      if (this.threatDirections.COLUMN && col === qCol && row !== qRow) {
        return true;
      }

      // Check diagonal threats
      if (this.threatDirections.DIAGONAL) {
        // Check long diagonals
        const rowDiff = Math.abs(row - qRow);
        const colDiff = Math.abs(col - qCol);
        if (rowDiff === colDiff && rowDiff > 0) {
          return true;
        }
      }

      // Check adjacent diagonal threats
      if (this.threatDirections.ADJACENT_DIAGONAL) {
        const rowDiff = Math.abs(row - qRow);
        const colDiff = Math.abs(col - qCol);
        if (rowDiff === 1 && colDiff === 1) {
          return true;
        }
      }
    }

    return false;
  }

  // Add row threats to the threatened positions array
  private addRowThreats(
    queenRow: number,
    queenCol: number,
    cellStates: CellState[][],
    threatened: Position[]
  ): void {
    for (let c = 0; c < this.gridSize; c++) {
      if (c !== queenCol && cellStates[queenRow][c] === CellState.EMPTY) {
        threatened.push({ row: queenRow, col: c });
      }
    }
  }

  // Add column threats to the threatened positions array
  private addColumnThreats(
    queenRow: number,
    queenCol: number,
    cellStates: CellState[][],
    threatened: Position[]
  ): void {
    for (let r = 0; r < this.gridSize; r++) {
      if (r !== queenRow && cellStates[r][queenCol] === CellState.EMPTY) {
        threatened.push({ row: r, col: queenCol });
      }
    }
  }

  // Add long diagonal threats to the threatened positions array
  private addLongDiagonalThreats(
    queenRow: number,
    queenCol: number,
    cellStates: CellState[][],
    threatened: Position[]
  ): void {
    // Check all four diagonal directions
    const directions = [
      { rowDir: -1, colDir: -1 }, // Top-left
      { rowDir: -1, colDir: 1 }, // Top-right
      { rowDir: 1, colDir: -1 }, // Bottom-left
      { rowDir: 1, colDir: 1 }, // Bottom-right
    ];

    for (const dir of directions) {
      let r = queenRow + dir.rowDir;
      let c = queenCol + dir.colDir;

      while (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
        if (cellStates[r][c] === CellState.EMPTY) {
          threatened.push({ row: r, col: c });
        }
        r += dir.rowDir;
        c += dir.colDir;
      }
    }
  }

  // Add adjacent diagonal threats to the threatened positions array
  private addAdjacentDiagonalThreats(
    queenRow: number,
    queenCol: number,
    cellStates: CellState[][],
    threatened: Position[]
  ): void {
    const adjacentPositions = [
      { row: queenRow - 1, col: queenCol - 1 }, // Top-left
      { row: queenRow - 1, col: queenCol + 1 }, // Top-right
      { row: queenRow + 1, col: queenCol - 1 }, // Bottom-left
      { row: queenRow + 1, col: queenCol + 1 }, // Bottom-right
    ];

    for (const pos of adjacentPositions) {
      if (
        pos.row >= 0 &&
        pos.row < this.gridSize &&
        pos.col >= 0 &&
        pos.col < this.gridSize &&
        cellStates[pos.row][pos.col] === CellState.EMPTY
      ) {
        threatened.push(pos);
      }
    }
  }
}
