// src/components/AntBoard.ts
import Phaser from 'phaser';
import { CellState } from './AntGridScene';

export class AntBoard {
  private scene: Phaser.Scene;
  private gridSize: number = 6;
  private cellSize: number = 80;
  private gridCells: Phaser.GameObjects.Rectangle[][] = [];
  private cellStates: CellState[][] = [];
  private gameObjects: (Phaser.GameObjects.GameObject | null)[][] = [];
  private queensPlaced: number = 0;
  private onQueenPlacedCallback: (count: number) => void;
  private onCellClickCallback: (row: number, col: number) => void;

  constructor(
    scene: Phaser.Scene,
    onQueenPlaced: (count: number) => void,
    onCellClick: (row: number, col: number) => void
  ) {
    this.scene = scene;
    this.onQueenPlacedCallback = onQueenPlaced;
    this.onCellClickCallback = onCellClick;
    this.initializeBoard();
  }

  private initializeBoard(): void {
    // Calculate grid dimensions
    const gridWidth = this.gridSize * this.cellSize;
    const gridHeight = this.gridSize * this.cellSize;
    const startX = (this.scene.cameras.main.width - gridWidth) / 2;
    const startY = (this.scene.cameras.main.height - gridHeight) / 2 + 20;

    // Initialize cell states array
    this.cellStates = Array(this.gridSize)
      .fill(0)
      .map(() => Array(this.gridSize).fill(CellState.EMPTY));
    this.gameObjects = Array(this.gridSize)
      .fill(0)
      .map(() => Array(this.gridSize).fill(null));

    // Create grid of cells
    for (let row = 0; row < this.gridSize; row++) {
      this.gridCells[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        // Create cell rectangle
        const cellX = startX + col * this.cellSize + this.cellSize / 2;
        const cellY = startY + row * this.cellSize + this.cellSize / 2;

        const cell = this.scene.add.rectangle(
          cellX,
          cellY,
          this.cellSize - 4,
          this.cellSize - 4,
          0xf5f5dc, // Beige color for soil
          1
        );

        // Add border
        cell.setStrokeStyle(2, 0x663300); // Brown border

        // Make cell interactive
        cell.setInteractive();

        // Add click event
        cell.on('pointerdown', () => {
          this.onCellClickCallback(row, col);
        });

        this.gridCells[row][col] = cell;
      }
    }
  }

  public getCellState(row: number, col: number): CellState {
    return this.cellStates[row][col];
  }

  // In AntBoard.ts, modify the placeFlag method
  public placeFlag(row: number, col: number): void {
    if (this.cellStates[row][col] !== CellState.EMPTY) return;

    const cellX = this.gridCells[row][col].x;
    const cellY = this.gridCells[row][col].y;

    // Use a proper flag image instead of a red ball
    const flag = this.scene.add.image(cellX, cellY, 'flag');
    flag.setScale(0.4); // Adjust scale as needed
    flag.setDepth(20); // Above grid cells, below queens

    // Store reference to the flag
    this.gameObjects[row][col] = flag;
    this.cellStates[row][col] = CellState.FLAG;
  }

  public removeFlag(row: number, col: number): void {
    if (this.cellStates[row][col] !== CellState.FLAG) return;

    if (this.gameObjects[row][col]) {
      this.gameObjects[row][col]?.destroy();
      this.gameObjects[row][col] = null;
    }
    this.cellStates[row][col] = CellState.EMPTY;
  }

  public placeQueen(row: number, col: number): void {
    const cellX = this.gridCells[row][col].x;
    const cellY = this.gridCells[row][col].y;

    const queen = this.scene.add.image(cellX, cellY, 'queen');
    queen.setScale(0.8); // Scale queen to fit cell

    // Add a tween animation
    this.scene.tweens.add({
      targets: queen,
      y: { value: queen.y - 5, yoyo: true, duration: 500 },
      repeat: -1,
    });

    // Store reference to the queen
    this.gameObjects[row][col] = queen;
    this.cellStates[row][col] = CellState.QUEEN;
    this.queensPlaced++;

    // Notify about queen placement
    this.onQueenPlacedCallback(this.queensPlaced);
  }

  public removeQueen(row: number, col: number): void {
    if (this.cellStates[row][col] !== CellState.QUEEN) return;

    if (this.gameObjects[row][col]) {
      this.gameObjects[row][col]?.destroy();
      this.gameObjects[row][col] = null;
    }
    this.cellStates[row][col] = CellState.EMPTY;
    this.queensPlaced--;

    // Notify about queen removal
    this.onQueenPlacedCallback(this.queensPlaced);
  }

  public clearAllFlags(): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.cellStates[row][col] === CellState.FLAG) {
          this.removeFlag(row, col);
        }
      }
    }
  }

  public resetBoard(): void {
    // Clear the grid
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.gameObjects[row][col]) {
          this.gameObjects[row][col]?.destroy();
          this.gameObjects[row][col] = null;
        }
        this.cellStates[row][col] = CellState.EMPTY;
      }
    }

    this.queensPlaced = 0;
    this.onQueenPlacedCallback(this.queensPlaced);
  }

  // Rest of board methods...
  // You can further extract the queen validation logic if needed

  public get getGridSize(): number {
    return this.gridSize;
  }

  public get getQueensPlaced(): number {
    return this.queensPlaced;
  }
}
