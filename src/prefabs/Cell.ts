// src/prefabs/Cell.ts
import Phaser from 'phaser';
import { GAME_CONSTANTS } from '../config/constants';
import TweenHelper from '../utils/TweenHelper';

export enum CellState {
  EMPTY = 'empty',
  THREATENED = 'threatened',
  FLAGGED = 'flagged',
  QUEEN = 'queen',
}

export class Cell extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private highlight: Phaser.GameObjects.Rectangle;
  private contents: Phaser.GameObjects.Sprite | null = null;
  private decoration: Phaser.GameObjects.GameObject | null = null;
  private _cellState: CellState = CellState.EMPTY;
  private row: number;
  private col: number;
  private size: number;
  private isHovered: boolean = false;

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

    // Create highlight overlay (initially invisible)
    this.highlight = this.scene.add
      .rectangle(0, 0, size - 8, size - 8, GAME_CONSTANTS.COLORS.HIGHLIGHT_YELLOW)
      .setAlpha(0);

    // Add to container
    this.add(this.background);
    this.add(this.highlight);

    // Setup interaction events
    this.setupInteraction();

    // Add to scene
    scene.add.existing(this);
  }

  // Empty method that does nothing - keeping it for compatibility
  private addSoilDecoration(): void {
    // Method intentionally left empty to remove decorative elements
  }

  // Setup interaction events
  private setupInteraction(): void {
    this.background
      .on('pointerover', () => {
        if (this._cellState === CellState.EMPTY) {
          this.isHovered = true;
          this.scene.tweens.add({
            targets: this.highlight,
            alpha: 0.3,
            duration: 100,
          });
        }
      })
      .on('pointerout', () => {
        this.isHovered = false;
        this.scene.tweens.add({
          targets: this.highlight,
          alpha: 0,
          duration: 100,
        });
      });
  }

  // Getters and setters
  get cellState(): CellState {
    return this._cellState;
  }

  // Mark cell as threatened by a queen
  markThreatened(threatened: boolean = true): void {
    if (this._cellState !== CellState.EMPTY && this._cellState !== CellState.THREATENED) {
      return; // Can't mark non-empty cells as threatened
    }

    if (threatened) {
      this._cellState = CellState.THREATENED;
      this.background.setStrokeStyle(2, GAME_CONSTANTS.COLORS.DANGER_RED);

      // Remove pulsing effect
      this.background.setAlpha(0.8); // Just use a static alpha instead
    } else {
      // Remove threatened state
      this._cellState = CellState.EMPTY;
      this.background.setStrokeStyle(2, GAME_CONSTANTS.COLORS.DARK_GREEN);
      this.background.setAlpha(1);
    }
  }

  // Place soldier ant flag
  placeFlag(): boolean {
    if (this._cellState !== CellState.EMPTY) return false;

    this.contents = this.scene.add.sprite(0, 0, 'flag').setScale(0.4);
    this.add(this.contents);
    this._cellState = CellState.FLAGGED;

    return true;
  }

  // Place queen ant
  placeQueen(): boolean {
    if (this._cellState !== CellState.EMPTY) return false;

    this.contents = this.scene.add.sprite(0, 0, 'queen').setScale(0.8);
    this.add(this.contents);
    this._cellState = CellState.QUEEN;

    return true;
  }

  // Clear cell contents
  clear(): boolean {
    if (this.contents) {
      this.remove(this.contents, true);
      this.contents = null;
    }

    // Reset border
    this.background.setStrokeStyle(2, GAME_CONSTANTS.COLORS.DARK_GREEN);
    this.background.setAlpha(1);

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

  // Flash the cell to indicate an action
  flash(color: number = GAME_CONSTANTS.COLORS.HIGHLIGHT_YELLOW): void {
    // Simplified version - just change the background color briefly
    const originalColor = this.background.fillColor;
    this.background.fillColor = color;

    // Use a simple timeout instead of a tween
    setTimeout(() => {
      this.background.fillColor = originalColor;
    }, 300);
  }

  // Shake the cell (for invalid moves)
  shake(): void {
    // Simplified version - just flash red instead of shaking
    this.flash(GAME_CONSTANTS.COLORS.DANGER_RED);
  }
}
