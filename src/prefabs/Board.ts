// src/prefabs/Board.ts
import Phaser from 'phaser';
import { Cell, CellState } from './Cell';
import { GAME_CONSTANTS } from '../config/constants';

export class Board extends Phaser.GameObjects.Container {
  private cells: Cell[][] = [];
  private gridSize: number;
  private cellSize: number;
  private queensPlaced: number = 0;

  constructor(
    scene: Phaser.Scene,
    gridSize: number = GAME_CONSTANTS.GRID_SIZE,
    cellSize: number = GAME_CONSTANTS.CELL_SIZE
  ) {
    // Position board in center of screen
    const gridWidth = gridSize * cellSize;
    const gridHeight = gridSize * cellSize;
    const x = (scene.cameras.main.width - gridWidth) / 2;
    const y = (scene.cameras.main.height - gridHeight) / 2;

    super(scene, x, y);
    this.gridSize = gridSize;
    this.cellSize = cellSize;

    // Create the grid of cells
    this.createGrid();

    // Add to scene
    scene.add.existing(this);
  }

  private createGrid(): void {
    for (let row = 0; row < this.gridSize; row++) {
      this.cells[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const cellX = col * this.cellSize + this.cellSize / 2;
        const cellY = row * this.cellSize + this.cellSize / 2;

        const cell = new Cell(this.scene, row, col, this.cellSize, cellX, cellY);

        this.cells[row][col] = cell;
        this.add(cell);
      }
    }
  }

  // Get cell at position
  getCell(row: number, col: number): Cell | null {
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
      return null;
    }
    return this.cells[row][col];
  }

  // Get cell state
  getCellState(row: number, col: number): CellState {
    const cell = this.getCell(row, col);
    return cell ? cell.cellState : CellState.EMPTY;
  }

  // Get all cells in a particular state
  getCellsInState(state: CellState): Cell[] {
    const result: Cell[] = [];
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.cells[row][col];
        if (cell.cellState === state) {
          result.push(cell);
        }
      }
    }
    return result;
  }

  // Place queen
  placeQueen(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    if (cell && cell.placeQueen()) {
      this.queensPlaced++;
      return true;
    }
    return false;
  }

  // Place flag
  placeFlag(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    return cell ? cell.placeFlag() : false;
  }

  // Remove queen
  removeQueen(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    if (cell && cell.cellState === CellState.QUEEN && cell.clear()) {
      this.queensPlaced--;
      return true;
    }
    return false;
  }

  // Remove flag
  removeFlag(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    return cell && cell.cellState === CellState.FLAGGED ? cell.clear() : false;
  }

  // Clear all flags
  clearAllFlags(): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.cells[row][col];
        if (cell.cellState === CellState.FLAGGED) {
          cell.clear();
        }
      }
    }
  }

  // Reset the board
  resetBoard(): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        this.cells[row][col].clear();
      }
    }
    this.queensPlaced = 0;
  }

  // Set click handler for all cells
  setClickHandler(handler: (cell: Cell) => void): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        this.cells[row][col].setClickHandler(handler);
      }
    }
  }

  // Get all cell states as a 2D array
  getCellStates(): CellState[][] {
    return this.cells.map((row) => row.map((cell) => cell.cellState));
  }

  // Get count of queens placed
  get queenCount(): number {
    return this.queensPlaced;
  }

  // Get grid size
  get size(): number {
    return this.gridSize;
  }
}
