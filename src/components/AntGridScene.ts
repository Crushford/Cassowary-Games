import Phaser from 'phaser';

export enum CellState {
  EMPTY = 0,
  FLAG = 1,
  QUEEN = 2,
}

export class AntGridScene extends Phaser.Scene {
  private gridSize: number = 6;
  private cellSize: number = 80;
  private gridCells: Phaser.GameObjects.Rectangle[][] = [];
  private cellStates: CellState[][] = [];
  private gameObjects: (Phaser.GameObjects.GameObject | null)[][] = [];
  private queensPlaced: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private gameOver: boolean = false;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'AntGridScene' });
  }

  preload(): void {
    // Load assets for flags and queens
    this.load.image('flag', 'https://examples.phaser.io/assets/sprites/red_ball.png');
    this.load.image('queen', 'https://examples.phaser.io/assets/sprites/phaser-dude.png');
    this.load.image('background', 'https://examples.phaser.io/assets/skies/sky3.png');
  }

  create(): void {
    // Add background
    this.add.image(400, 300, 'background');

    // Calculate grid dimensions
    const gridWidth = this.gridSize * this.cellSize;
    const gridHeight = this.gridSize * this.cellSize;
    const startX = (this.cameras.main.width - gridWidth) / 2;
    const startY = (this.cameras.main.height - gridHeight) / 2 + 20; // Add some space for the score

    // Initialize cell states array
    this.cellStates = Array(this.gridSize)
      .fill(0)
      .map(() => Array(this.gridSize).fill(CellState.EMPTY));
    this.gameObjects = Array(this.gridSize)
      .fill(0)
      .map(() => Array(this.gridSize).fill(null));
    this.queensPlaced = 0;
    this.gameOver = false;

    // Create grid of cells
    for (let row = 0; row < this.gridSize; row++) {
      this.gridCells[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        // Create cell rectangle
        const cellX = startX + col * this.cellSize + this.cellSize / 2;
        const cellY = startY + row * this.cellSize + this.cellSize / 2;

        const cell = this.add.rectangle(
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
          if (!this.gameOver) {
            this.handleCellClick(row, col);
          }
        });

        this.gridCells[row][col] = cell;
      }
    }

    // Create score text
    this.scoreText = this.add.text(16, 16, 'Queens Placed: 0', {
      fontSize: '24px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 4,
    });

    this.statusText = this.add.text(
      16,
      50,
      'Place queens - none can share row, column, or diagonal',
      {
        fontSize: '16px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 2,
      }
    );

    // Game over text (hidden initially)
    this.gameOverText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2, '', {
        fontSize: '36px',
        color: '#ff0000',
        stroke: '#000',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Restart button (hidden initially)
    this.restartButton = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 60, 'Restart Game', {
        fontSize: '24px',
        color: '#fff',
        backgroundColor: '#1a5e1a',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive()
      .setVisible(false);

    this.restartButton.on('pointerdown', () => this.restartGame());

    // Emit game started event
    if (window.gameEvents) {
      window.gameEvents.emit('gameStarted');
    }
  }

  handleCellClick(row: number, col: number): void {
    // Toggle cell state: EMPTY -> FLAG -> QUEEN -> EMPTY
    const currentState = this.cellStates[row][col];

    switch (currentState) {
      case CellState.EMPTY:
        this.placeFlag(row, col);
        break;
      case CellState.FLAG:
        this.removeFlag(row, col);
        this.tryPlaceQueen(row, col);
        break;
      case CellState.QUEEN:
        this.removeQueen(row, col);
        break;
    }

    // Check if there are no more valid moves
    if (!this.gameOver && this.queensPlaced > 0) {
      this.checkForNoValidMoves();
    }
  }

  placeFlag(row: number, col: number): void {
    if (this.cellStates[row][col] !== CellState.EMPTY) return;

    const cellX = this.gridCells[row][col].x;
    const cellY = this.gridCells[row][col].y;

    const flag = this.add.image(cellX, cellY, 'flag');
    flag.setScale(0.5); // Make flag smaller

    // Store reference to the flag
    this.gameObjects[row][col] = flag;
    this.cellStates[row][col] = CellState.FLAG;
  }

  removeFlag(row: number, col: number): void {
    if (this.cellStates[row][col] !== CellState.FLAG) return;

    if (this.gameObjects[row][col]) {
      this.gameObjects[row][col]?.destroy();
      this.gameObjects[row][col] = null;
    }
    this.cellStates[row][col] = CellState.EMPTY;
  }

  tryPlaceQueen(row: number, col: number): void {
    // Check if queen placement is valid
    if (this.isValidQueenPlacement(row, col)) {
      const cellX = this.gridCells[row][col].x;
      const cellY = this.gridCells[row][col].y;

      const queen = this.add.image(cellX, cellY, 'queen');
      queen.setScale(0.8); // Scale queen to fit cell

      // Add a tween animation
      this.tweens.add({
        targets: queen,
        y: { value: queen.y - 5, yoyo: true, duration: 500 },
        repeat: -1,
      });

      // Store reference to the queen
      this.gameObjects[row][col] = queen;
      this.cellStates[row][col] = CellState.QUEEN;
      this.queensPlaced++;

      // Update score
      this.updateScore();

      // Place flags in threatened positions
      this.markThreatenedPositions(row, col);
    } else {
      // Game over - invalid queen placement
      this.endGame();
    }
  }

  removeQueen(row: number, col: number): void {
    if (this.cellStates[row][col] !== CellState.QUEEN) return;

    if (this.gameObjects[row][col]) {
      this.gameObjects[row][col]?.destroy();
      this.gameObjects[row][col] = null;
    }
    this.cellStates[row][col] = CellState.EMPTY;
    this.queensPlaced--;

    // Update score
    this.updateScore();

    // Remove all flags and recalculate threatened positions
    this.clearAllFlags();
    this.updateAllThreatenedPositions();
  }

  clearAllFlags(): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.cellStates[row][col] === CellState.FLAG) {
          this.removeFlag(row, col);
        }
      }
    }
  }

  updateAllThreatenedPositions(): void {
    // Mark all cells threatened by current queens
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.cellStates[row][col] === CellState.QUEEN) {
          this.markThreatenedPositions(row, col);
        }
      }
    }
  }

  isValidQueenPlacement(row: number, col: number): boolean {
    // Check if there's already a queen in the same row
    for (let c = 0; c < this.gridSize; c++) {
      if (c !== col && this.cellStates[row][c] === CellState.QUEEN) {
        return false;
      }
    }

    // Check if there's already a queen in the same column
    for (let r = 0; r < this.gridSize; r++) {
      if (r !== row && this.cellStates[r][col] === CellState.QUEEN) {
        return false;
      }
    }

    // Check diagonals
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (r !== row && c !== col && this.cellStates[r][c] === CellState.QUEEN) {
          // Check if (r,c) is on the same diagonal as (row,col)
          if (Math.abs(r - row) === Math.abs(c - col)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  markThreatenedPositions(queenRow: number, queenCol: number): void {
    // Mark row
    for (let c = 0; c < this.gridSize; c++) {
      if (c !== queenCol && this.cellStates[queenRow][c] === CellState.EMPTY) {
        this.placeFlag(queenRow, c);
      }
    }

    // Mark column
    for (let r = 0; r < this.gridSize; r++) {
      if (r !== queenRow && this.cellStates[r][queenCol] === CellState.EMPTY) {
        this.placeFlag(r, queenCol);
      }
    }

    // Mark diagonals
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (r !== queenRow && c !== queenCol && this.cellStates[r][c] === CellState.EMPTY) {
          // Check if (r,c) is on the same diagonal as (queenRow,queenCol)
          if (Math.abs(r - queenRow) === Math.abs(c - queenCol)) {
            this.placeFlag(r, c);
          }
        }
      }
    }
  }

  updateScore(): void {
    this.scoreText.setText(`Queens Placed: ${this.queensPlaced}`);

    // Emit score changed event
    if (window.gameEvents) {
      window.gameEvents.emit('scoreChanged', this.queensPlaced);
    }
  }

  checkForNoValidMoves(): void {
    let validMovesExist = false;

    // Check if there are any empty cells left that aren't threatened
    for (let row = 0; row < this.gridSize && !validMovesExist; row++) {
      for (let col = 0; col < this.gridSize && !validMovesExist; col++) {
        if (this.cellStates[row][col] === CellState.EMPTY) {
          // Check if a queen can be placed here
          if (this.isValidQueenPlacement(row, col)) {
            validMovesExist = true;
          }
        }
      }
    }

    if (!validMovesExist) {
      this.endGame(true); // Success - no more valid moves
    }
  }

  endGame(success: boolean = false): void {
    this.gameOver = true;

    if (success) {
      this.gameOverText.setText(`Level Complete!\nYou placed ${this.queensPlaced} queens`);
      this.gameOverText.setColor('#00ff00');
    } else {
      this.gameOverText.setText(
        `Game Over!\nQueens cannot attack each other\nFinal Score: ${this.queensPlaced}`
      );
      this.gameOverText.setColor('#ff0000');
    }

    this.gameOverText.setVisible(true);
    this.restartButton.setVisible(true);

    // Emit game over event
    if (window.gameEvents) {
      window.gameEvents.emit('gameOver', {
        success: success,
        score: this.queensPlaced,
      });
    }
  }

  restartGame(): void {
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

    // Reset game state
    this.queensPlaced = 0;
    this.gameOver = false;
    this.updateScore();

    // Hide game over elements
    this.gameOverText.setVisible(false);
    this.restartButton.setVisible(false);

    // Update status text
    this.statusText.setText('Place queens - none can share row, column, or diagonal');

    // Emit game restart event
    if (window.gameEvents) {
      window.gameEvents.emit('gameRestarted');
    }
  }
}

// Add global type definitions
declare global {
  interface Window {
    gameEvents?: Phaser.Events.EventEmitter;
  }
}
