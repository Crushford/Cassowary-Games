// src/prefabs/Board.ts
import Phaser from 'phaser';
import { Cell, CellState } from './Cell';
import { GAME_CONSTANTS } from '../config/constants';

export class Board extends Phaser.GameObjects.Container {
  private cells: Cell[][] = [];
  private gridSize: number;
  private cellSize: number;
  private queensPlaced: number = 0;
  private clickHandler: ((cell: Cell) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    gridSize: number = GAME_CONSTANTS.GRID_SIZE,
    cellSize: number = GAME_CONSTANTS.CELL_SIZE
  ) {
    // Position board below the top bar, centered horizontally
    const gridWidth = gridSize * cellSize;
    const gridHeight = gridSize * cellSize;
    const x = (scene.cameras.main.width - gridWidth) / 2;
    const y = GAME_CONSTANTS.UI.LAYOUT.TOP_BAR_HEIGHT;

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

        // Add click handler for cell
        cell.onCellClick = () => {
          if (this.clickHandler) {
            this.clickHandler(cell);
          }
        };

        this.cells[row][col] = cell;
        this.add(cell);
      }
    }
  }

  // Set click handler for cells
  public setClickHandler(handler: (cell: Cell) => void): void {
    this.clickHandler = handler;
  }

  // Get cell at position
  public getCell(row: number, col: number): Cell | null {
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
      return null;
    }
    return this.cells[row][col];
  }

  // Get cell state
  public getCellState(row: number, col: number): CellState {
    const cell = this.getCell(row, col);
    return cell ? cell.cellState : CellState.EMPTY;
  }

  // Get all cell states in a 2D array
  public getCellStates(): CellState[][] {
    const states: CellState[][] = [];
    for (let row = 0; row < this.gridSize; row++) {
      states[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        states[row][col] = this.getCellState(row, col);
      }
    }
    return states;
  }

  // Get all cells in a particular state
  public getCellsInState(state: CellState): Cell[] {
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
  public placeQueen(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    if (cell && cell.placeQueen()) {
      this.queensPlaced++;
      return true;
    }
    return false;
  }

  // Place flag
  public placeFlag(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    return cell ? cell.placeFlag() : false;
  }

  // Remove flag
  public removeFlag(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    return cell ? cell.clear() : false;
  }

  // Remove queen
  public removeQueen(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    if (cell && cell.cellState === CellState.QUEEN && cell.clear()) {
      this.queensPlaced--;
      return true;
    }
    return false;
  }

  // Clear all threatened cells
  public clearThreatenedCells(): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.cells[row][col];
        if (cell.cellState === CellState.THREATENED) {
          cell.markThreatened(false);
        }
      }
    }
  }

  // Reset the board to initial state
  public reset(): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.cells[row][col];
        cell.clear();
      }
    }
    this.queensPlaced = 0;
  }

  // Get the size of the grid
  public get size(): number {
    return this.gridSize;
  }

  // Get the number of queens placed
  public get placedQueens(): number {
    return this.queensPlaced;
  }
}
