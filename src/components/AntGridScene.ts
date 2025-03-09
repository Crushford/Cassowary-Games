// src/components/AntGridScene.ts
import Phaser from 'phaser';
import { AntBoard } from './AntBoard';
import { QueenRules } from './QueenRules';
import { AntGameUI } from './AntGameUI';
import { GameResources } from './GameResources';

// Using latest stable version of Phaser (3.60.0 as of March 2025)

export enum CellState {
  EMPTY = 0,
  FLAG = 1, // Now represents soldier ants
  QUEEN = 2, // Now represents honey pot ant queens
}

export class AntGridScene extends Phaser.Scene {
  private ui!: AntGameUI;
  private board!: AntBoard;
  private rules!: QueenRules;
  private gameOver: boolean = false;
  private resources!: GameResources;
  private raindrops: Phaser.GameObjects.Image[] = [];
  private leaves: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'AntGridScene' });
  }

  preload(): void {
    // Load rainforest themed assets
    this.load.image('soldier-ant', 'https://labs.phaser.io/assets/sprites/bullets/bullet6.png'); // Soldier ant
    this.load.image('honey-queen', 'https://labs.phaser.io/assets/sprites/ufo.png'); // Honey pot queen
    this.load.image('rainforest', 'https://labs.phaser.io/assets/skies/sky3.png'); // Rainforest bg
    this.load.image('raindrop', 'https://labs.phaser.io/assets/particles/blue.png'); // For rainforest ambiance
    this.load.image('leaf', 'https://labs.phaser.io/assets/sprites/leaf-green.png'); // For rainforest ambiance
    this.load.image('gold-coin', 'https://labs.phaser.io/assets/sprites/coin.png'); // Gold coin

    // Fallback options if the above URLs don't work
    this.load.image(
      'soldier-ant-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/bullets/bullet6.png'
    );
    this.load.image(
      'honey-queen-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/ufo.png'
    );
    this.load.image(
      'rainforest-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/skies/sky3.png'
    );
    this.load.image(
      'raindrop-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/particles/blue.png'
    );
    this.load.image(
      'leaf-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/leaf-green.png'
    );
    this.load.image(
      'gold-coin-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/coin.png'
    );
  }

  create(): void {
    // Handle potential loading errors by using alt textures if main ones aren't available
    const textureKeys = [
      'honey-queen',
      'soldier-ant',
      'rainforest',
      'raindrop',
      'leaf',
      'gold-coin',
    ];

    textureKeys.forEach((key) => {
      if (!this.textures.exists(key)) {
        // Use the alt version instead
        const altKey = `${key}-alt`;
        if (this.textures.exists(altKey)) {
          // Create a new texture alias in Phaser 3
          this.textures.get(altKey).key = key;
        }
      }
    });

    // Create rainforest background with a darker tint for more atmosphere
    const bg = this.add.image(400, 300, 'rainforest');
    bg.setTint(0x88aa88); // Give a slight green tint for rainforest feel

    // Create rainforest ambiance
    this.createRainforestAmbiance();

    // Initialize resources
    this.resources = new GameResources();

    // Initialize game components
    this.ui = new AntGameUI(this, this.resources);
    this.ui.setupRestartButton(() => this.restartGame());

    this.board = new AntBoard(
      this,
      (count) => this.handleQueenCountChanged(count),
      (row, col) => this.handleCellClick(row, col)
    );

    this.rules = new QueenRules(this.board.getGridSize);
    this.gameOver = false;

    // Set initial status
    this.ui.updateStatusText('Place honey pot queens strategically to build your colony!');
    this.ui.updateResources();

    // Emit game started event
    if (window.gameEvents) {
      window.gameEvents.emit('gameStarted');
    }
  }

  private createRainforestAmbiance(): void {
    // Create occasional falling raindrops
    this.time.addEvent({
      delay: 800,
      callback: () => {
        if (this.raindrops.length > 10) return; // Limit number of raindrops

        const x = Phaser.Math.Between(0, this.cameras.main.width);
        const raindrop = this.add.image(x, -20, 'raindrop');
        raindrop.setAlpha(0.6);
        raindrop.setScale(0.5);

        this.raindrops.push(raindrop);

        this.tweens.add({
          targets: raindrop,
          y: this.cameras.main.height + 50,
          duration: Phaser.Math.Between(1500, 2500),
          onComplete: () => {
            // Remove raindrop from array and destroy
            const index = this.raindrops.indexOf(raindrop);
            if (index > -1) {
              this.raindrops.splice(index, 1);
            }
            raindrop.destroy();
          },
        });
      },
      callbackScope: this,
      loop: true,
    });

    // Create occasional falling leaves
    this.time.addEvent({
      delay: 3000,
      callback: () => {
        if (this.leaves.length > 5) return; // Limit number of leaves

        const x = Phaser.Math.Between(0, this.cameras.main.width);
        const leaf = this.add.image(x, -20, 'leaf');
        leaf.setAlpha(0.8);
        leaf.setScale(0.3);
        leaf.setAngle(Phaser.Math.Between(0, 360));

        this.leaves.push(leaf);

        this.tweens.add({
          targets: leaf,
          y: this.cameras.main.height + 50,
          x: x + Phaser.Math.Between(-100, 100),
          angle: leaf.angle + Phaser.Math.Between(180, 360),
          duration: Phaser.Math.Between(4000, 6000),
          onComplete: () => {
            // Remove leaf from array and destroy
            const index = this.leaves.indexOf(leaf);
            if (index > -1) {
              this.leaves.splice(index, 1);
            }
            leaf.destroy();
          },
        });
      },
      callbackScope: this,
      loop: true,
    });
  }

  handleQueenCountChanged(count: number): void {
    this.ui.updateScore(count);
    this.ui.updateResources();

    // Emit score changed event
    if (window.gameEvents) {
      window.gameEvents.emit('scoreChanged', count);
    }
  }

  handleCellClick(row: number, col: number): void {
    if (this.gameOver) return;

    // Toggle cell state: EMPTY -> FLAG -> QUEEN -> EMPTY
    const currentState = this.board.getCellState(row, col);

    switch (currentState) {
      case CellState.EMPTY:
        this.board.placeFlag(row, col);
        this.ui.updateStatusText('Soldier ants will attack any queen placed here!');
        break;
      case CellState.FLAG:
        this.board.removeFlag(row, col);
        if (this.resources.useQueen()) {
          this.tryPlaceQueen(row, col);
          this.ui.updateResources();

          // Check for no more valid moves after queen placement
          if (!this.gameOver && this.board.getQueensPlaced > 0) {
            this.checkForNoValidMoves();
          }
        } else {
          this.ui.updateStatusText('Not enough honey pot queens available!');
        }
        break;
      case CellState.QUEEN:
        if (this.board.removeQueen(row, col)) {
          this.resources.returnQueen();
          this.ui.updateResources();
          this.ui.updateStatusText('Honey pot queen removed!');

          // Remove all flags and recalculate threatened positions
          this.board.clearAllFlags();
          this.updateAllThreatenedPositions();
        }
        break;
    }
  }

  tryPlaceQueen(row: number, col: number): void {
    // Get cell states for rules checking
    const cellStates = Array(this.board.getGridSize)
      .fill(0)
      .map((_, r) =>
        Array(this.board.getGridSize)
          .fill(0)
          .map((_, c) => this.board.getCellState(r, c))
      );

    // Check if queen placement is valid
    if (this.rules.isValidQueenPlacement(row, col, cellStates)) {
      this.board.placeQueen(row, col);
      this.ui.updateStatusText(
        'Honey pot queen placed! She emits pheromones to control territory.'
      );

      // Place flags in threatened positions
      this.markThreatenedPositions(row, col);

      // Show gold coin animation
      this.showGoldCoinAnimation();
    } else {
      // Game over - invalid queen placement
      this.endGame();
    }
  }

  showGoldCoinAnimation(): void {
    // Create gold coin that spins and vanishes
    const coin = this.add.image(this.cameras.main.width - 50, 120, 'gold-coin');
    coin.setScale(0.5);

    this.tweens.add({
      targets: coin,
      angle: 360,
      alpha: { from: 1, to: 0 },
      y: 150,
      duration: 1500,
      onComplete: () => {
        coin.destroy();
      },
    });
  }

  markThreatenedPositions(queenRow: number, queenCol: number): void {
    // Get cell states for rules checking
    const cellStates = Array(this.board.getGridSize)
      .fill(0)
      .map((_, r) =>
        Array(this.board.getGridSize)
          .fill(0)
          .map((_, c) => this.board.getCellState(r, c))
      );

    // Get threatened positions
    const threatened = this.rules.getThreatenedPositions(queenRow, queenCol, cellStates);

    // Place flags on threatened positions
    threatened.forEach((pos) => {
      this.board.placeFlag(pos.row, pos.col);
    });
  }

  updateAllThreatenedPositions(): void {
    // Mark all cells threatened by current queens
    for (let row = 0; row < this.board.getGridSize; row++) {
      for (let col = 0; col < this.board.getGridSize; col++) {
        if (this.board.getCellState(row, col) === CellState.QUEEN) {
          this.markThreatenedPositions(row, col);
        }
      }
    }
  }

  checkForNoValidMoves(): void {
    // Get cell states for rules checking
    const cellStates = Array(this.board.getGridSize)
      .fill(0)
      .map((_, r) =>
        Array(this.board.getGridSize)
          .fill(0)
          .map((_, c) => this.board.getCellState(r, c))
      );

    if (!this.rules.hasValidMoves(cellStates)) {
      this.endGame(true); // Success - no more valid moves
    }
  }

  endGame(success: boolean = false): void {
    this.gameOver = true;

    if (success) {
      this.ui.updateStatusText('Amazing! Your honey pot ant colony is thriving!');
    } else {
      this.ui.updateStatusText('Oh no! The soldier ants attacked your queens!');
    }

    this.ui.showGameOver(success, this.board.getQueensPlaced);

    // Emit game over event
    if (window.gameEvents) {
      window.gameEvents.emit('gameOver', {
        success: success,
        score: this.board.getQueensPlaced,
      });
    }
  }

  restartGame(): void {
    this.board.resetBoard();
    this.gameOver = false;
    this.resources.resetResources();
    this.ui.updateResources();
    this.ui.hideGameOver();
    this.ui.updateStatusText('Place honey pot queens strategically to build your colony!');

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
