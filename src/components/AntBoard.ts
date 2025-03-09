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
  private boardContainer!: Phaser.GameObjects.Container;

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
    // Create a container for the board elements
    this.boardContainer = this.scene.add.container(0, 0);
    this.boardContainer.setDepth(10); // Above background, below UI

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
          0x3d1c00, // Dark rich soil color
          1
        );

        // Add border
        cell.setStrokeStyle(2, 0x006400); // Dark green border for forest feel

        // Make cell interactive
        cell.setInteractive();

        // Add click event
        cell.on('pointerdown', () => {
          this.onCellClickCallback(row, col);
        });

        this.gridCells[row][col] = cell;
        this.boardContainer.add(cell);

        // Add some plant decoration to random cells to enhance rainforest feel
        if (Math.random() > 0.7) {
          const plantDecoration = this.scene.add.circle(
            cellX + (Math.random() * 30 - 15),
            cellY + (Math.random() * 30 - 15),
            5,
            0x32cd32 // Lime green for plants
          );
          this.boardContainer.add(plantDecoration);
        }
      }
    }
  }

  public getCellState(row: number, col: number): CellState {
    return this.cellStates[row][col];
  }

  public placeFlag(row: number, col: number): void {
    if (this.cellStates[row][col] !== CellState.EMPTY) return;

    const cellX = this.gridCells[row][col].x;
    const cellY = this.gridCells[row][col].y;

    const flag = this.scene.add.image(cellX, cellY, 'soldier-ant');
    flag.setScale(0.4); // Make soldier ant smaller
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

    const queen = this.scene.add.image(cellX, cellY, 'honey-queen');
    queen.setScale(0.8); // Scale queen to fit cell
    queen.setDepth(30); // Above flags and grid cells

    // Add a tween animation to simulate honey pot ant swaying
    this.scene.tweens.add({
      targets: queen,
      y: { value: queen.y - 5, yoyo: true, duration: 800 },
      angle: { value: 5, yoyo: true, duration: 1200 },
      repeat: -1,
    });

    // Store reference to the queen
    this.gameObjects[row][col] = queen;
    this.cellStates[row][col] = CellState.QUEEN;
    this.queensPlaced++;

    // Notify about queen placement
    this.onQueenPlacedCallback(this.queensPlaced);
  }

  public removeQueen(row: number, col: number): boolean {
    if (this.cellStates[row][col] !== CellState.QUEEN) return false;

    if (this.gameObjects[row][col]) {
      this.gameObjects[row][col]?.destroy();
      this.gameObjects[row][col] = null;
    }
    this.cellStates[row][col] = CellState.EMPTY;
    this.queensPlaced--;

    // Notify about queen removal
    this.onQueenPlacedCallback(this.queensPlaced);

    return true; // Signal successful removal
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

  public get getGridSize(): number {
    return this.gridSize;
  }

  public get getQueensPlaced(): number {
    return this.queensPlaced;
  }
}
