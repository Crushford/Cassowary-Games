// src/prefabs/Cell.ts
import Phaser from 'phaser';
import { GAME_CONSTANTS } from '../config/constants';

export enum CellState {
  EMPTY = 'empty',
  FLAGGED = 'flagged',
  QUEEN = 'queen',
}

export class Cell extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private contents: Phaser.GameObjects.Image | null = null;
  private _cellState: CellState = CellState.EMPTY; // Renamed from _state
  private row: number;
  private col: number;
  private size: number;

  constructor(scene: Phaser.Scene, row: number, col: number, size: number, x: number, y: number) {
    super(scene, x, y);
    this.row = row;
    this.col = col;
    this.size = size;

    // Create cell background
    this.background = this.scene.add.rectangle(
      0,
      0,
      size - 4,
      size - 4,
      GAME_CONSTANTS.COLORS.SOIL_BROWN
    );
    this.background.setStrokeStyle(2, GAME_CONSTANTS.COLORS.DARK_GREEN);
    this.background.setInteractive({ useHandCursor: true });

    // Add to container
    this.add(this.background);

    // Optional: Add decoration to some cells
    if (Math.random() > 0.7) {
      const decoration = this.scene.add.circle(
        Math.random() * 30 - 15,
        Math.random() * 30 - 15,
        5,
        GAME_CONSTANTS.COLORS.LIGHT_GREEN
      );
      this.add(decoration);
    }

    // Add to scene
    scene.add.existing(this);
  }

  // Getters and setters
  get cellState(): CellState {
    // Renamed from state
    return this._cellState;
  }

  // Place soldier ant
  placeFlag(): boolean {
    if (this._cellState !== CellState.EMPTY) return false;

    this.contents = this.scene.add.image(0, 0, 'soldier-ant').setScale(0.4);
    this.add(this.contents);
    this._cellState = CellState.FLAGGED;

    return true;
  }

  // Place queen ant
  placeQueen(): boolean {
    if (this._cellState !== CellState.EMPTY) return false;

    this.contents = this.scene.add.image(0, 0, 'honey-queen').setScale(0.8);
    this.add(this.contents);
    this._cellState = CellState.QUEEN;

    // Add animation effect for queen
    this.scene.tweens.add({
      targets: this.contents,
      y: -5,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    return true;
  }

  // Clear cell contents
  clear(): boolean {
    if (this.contents) {
      this.remove(this.contents, true);
      this.contents = null;
    }
    this._cellState = CellState.EMPTY;
    return true;
  }

  // Get cell grid position
  get gridPosition(): { row: number; col: number } {
    return { row: this.row, col: this.col };
  }

  // Setup click handler
  setClickHandler(handler: (cell: Cell) => void): void {
    this.background.on('pointerdown', () => {
      handler(this);
    });
  }
}
