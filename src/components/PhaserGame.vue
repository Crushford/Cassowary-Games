<template>
  <div class="game-container">
    <div id="phaser-game"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted } from 'vue';
import Phaser from 'phaser';

enum CellState {
  EMPTY = 0,
  DOT = 1,
  QUEEN = 2,
}

class AntGridScene extends Phaser.Scene {
  private gridSize: number = 6;
  private cellSize: number = 80;
  private gridCells: Phaser.GameObjects.Rectangle[][] = [];
  private cellStates: CellState[][] = [];
  private gameObjects: (Phaser.GameObjects.GameObject | null)[][] = [];
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'AntGridScene' });
  }

  preload(): void {
    // Load assets for dots and queens
    this.load.image('dot', 'https://examples.phaser.io/assets/sprites/yellow_ball.png');
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
    const startY = (this.cameras.main.height - gridHeight) / 2;

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
        cell.on('pointerdown', () => this.handleCellClick(row, col));

        this.gridCells[row][col] = cell;
      }
    }

    // Create score text
    this.scoreText = this.add.text(16, 16, 'Colony Score: 0', {
      fontSize: '24px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 4,
    });

    // Emit game started event
    if (window.gameEvents) {
      window.gameEvents.emit('gameStarted');
    }
  }

  handleCellClick(row: number, col: number): void {
    // Toggle cell state: EMPTY -> DOT -> QUEEN -> EMPTY
    const currentState = this.cellStates[row][col];
    let newState: CellState;

    if (currentState === CellState.EMPTY) {
      newState = CellState.DOT;
      this.addDot(row, col);
    } else if (currentState === CellState.DOT) {
      newState = CellState.QUEEN;
      this.removeDot(row, col);
      this.addQueen(row, col);
    } else {
      newState = CellState.EMPTY;
      this.removeQueen(row, col);
    }

    this.cellStates[row][col] = newState;
    this.updateScore();
  }

  addDot(row: number, col: number): void {
    const cellX = this.gridCells[row][col].x;
    const cellY = this.gridCells[row][col].y;

    const dot = this.add.image(cellX, cellY, 'dot');
    dot.setScale(0.5); // Make dot smaller

    // Store reference to the dot
    this.gameObjects[row][col] = dot;
  }

  removeDot(row: number, col: number): void {
    if (this.gameObjects[row][col]) {
      this.gameObjects[row][col].destroy();
      this.gameObjects[row][col] = null;
    }
  }

  addQueen(row: number, col: number): void {
    const cellX = this.gridCells[row][col].x;
    const cellY = this.gridCells[row][col].y;

    const queen = this.add.image(cellX, cellY, 'queen');
    queen.setScale(0.8); // Scale queen to fit cell

    // Add a tween animation to show it's a queen
    this.tweens.add({
      targets: queen,
      y: { value: queen.y - 5, yoyo: true, duration: 500 },
      repeat: -1,
    });

    // Store reference to the queen
    this.gameObjects[row][col] = queen;
  }

  removeQueen(row: number, col: number): void {
    if (this.gameObjects[row][col]) {
      this.gameObjects[row][col].destroy();
      this.gameObjects[row][col] = null;
    }
  }

  updateScore(): void {
    // Count dots and queens
    let dots = 0;
    let queens = 0;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.cellStates[row][col] === CellState.DOT) {
          dots++;
        } else if (this.cellStates[row][col] === CellState.QUEEN) {
          queens++;
        }
      }
    }

    // Calculate score: queens are worth more than dots
    this.score = dots * 10 + queens * 50;
    this.scoreText.setText(`Colony Score: ${this.score}`);

    // Emit score changed event
    if (window.gameEvents) {
      window.gameEvents.emit('scoreChanged', this.score);
    }
  }
}

// Add type definitions for the global event emitter
declare global {
  interface Window {
    gameEvents?: Phaser.Events.EventEmitter;
  }
}

export default defineComponent({
  name: 'PhaserGame',
  emits: ['score-changed', 'game-started'],
  setup(props, { emit }) {
    let game: Phaser.Game | null = null;

    onMounted(() => {
      // Create event emitter for communication
      window.gameEvents = new Phaser.Events.EventEmitter();

      // Setup event listeners
      window.gameEvents.on('scoreChanged', (score: number) => {
        emit('score-changed', score);
      });

      window.gameEvents.on('gameStarted', () => {
        emit('game-started');
      });

      // Game config
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 600,
        height: 600,
        parent: 'phaser-game',
        backgroundColor: '#87CEEB', // Sky blue background
        scene: AntGridScene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      // Initialize Phaser game
      game = new Phaser.Game(config);
    });

    onUnmounted(() => {
      // Clean up
      if (game) {
        game.destroy(true);
        game = null;
      }

      if (window.gameEvents) {
        window.gameEvents.removeAllListeners();
        window.gameEvents = undefined;
      }
    });

    return {};
  },
});
</script>

<style>
.game-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: #000;
}

#phaser-game {
  max-width: 100%;
  max-height: 100%;
}
</style>
