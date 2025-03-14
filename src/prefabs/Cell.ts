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

    // Add random soil decoration
    this.addSoilDecoration();

    // Setup interaction events
    this.setupInteraction();

    // Add to scene
    scene.add.existing(this);
  }

  // Add random soil decorations (roots, pebbles, etc)
  private addSoilDecoration(): void {
    // Remove existing decoration if any
    if (this.decoration) {
      this.remove(this.decoration, true);
      this.decoration = null;
    }

    const decorationChance = Math.random();

    if (decorationChance > 0.7) {
      // Green plant roots
      this.decoration = this.scene.add.circle(
        Math.random() * (this.size / 2) - this.size / 4,
        Math.random() * (this.size / 2) - this.size / 4,
        3 + Math.random() * 3,
        GAME_CONSTANTS.COLORS.LIGHT_GREEN
      );
      this.add(this.decoration);
    } else if (decorationChance > 0.5) {
      // Small pebble
      this.decoration = this.scene.add.circle(
        Math.random() * (this.size / 2) - this.size / 4,
        Math.random() * (this.size / 2) - this.size / 4,
        2 + Math.random() * 2,
        GAME_CONSTANTS.COLORS.PEBBLE_GRAY || 0x888888
      );
      this.add(this.decoration);
    }
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

      // Add subtle pulsing effect
      if (!this.scene.tweens.isTweening(this.background)) {
        this.scene.tweens.add({
          targets: this.background,
          alpha: 0.8,
          duration: 600,
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      // Remove threatened state
      this._cellState = CellState.EMPTY;
      this.background.setStrokeStyle(2, GAME_CONSTANTS.COLORS.DARK_GREEN);
      this.scene.tweens.killTweensOf(this.background);
      this.background.setAlpha(1);
    }
  }

  // Place soldier ant flag
  placeFlag(): boolean {
    if (this._cellState !== CellState.EMPTY) return false;

    this.contents = this.scene.add.sprite(0, 0, 'flag').setScale(0.4);
    this.add(this.contents);
    this._cellState = CellState.FLAGGED;

    // Add flag animation
    TweenHelper.popIn(this.scene, this.contents);

    // Add waving animation
    this.scene.tweens.add({
      targets: this.contents,
      angle: { from: -10, to: 10 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return true;
  }

  // Place queen ant
  placeQueen(): boolean {
    if (this._cellState !== CellState.EMPTY) return false;

    // Queen sprite with animations
    this.contents = this.scene.add.sprite(0, 0, 'queen').setScale(0.8);
    this.add(this.contents);
    this._cellState = CellState.QUEEN;

    // Entrance animation
    TweenHelper.popIn(this.scene, this.contents, {
      scale: { from: 0.4, to: 0.8 },
      duration: 500,
    });

    // Idle animation
    this.scene.tweens.add({
      targets: this.contents,
      y: -3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 500,
    });

    // Emit particles for celebrated placement
    this.emitPlacementParticles();

    return true;
  }

  // Emit particles when queen is placed
  private emitPlacementParticles(): void {
    const particles = this.scene.add.particles(0, 0, 'raindrop', {
      speed: { min: 20, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0.1 },
      blendMode: 'ADD',
      lifespan: 800,
      quantity: 15,
    });

    this.add(particles);

    // Stop emitting after a short time and then destroy
    this.scene.time.delayedCall(300, () => {
      particles.stop();
      this.scene.time.delayedCall(800, () => {
        particles.destroy();
      });
    });
  }

  // Clear cell contents
  clear(): boolean {
    if (this.contents) {
      // Fade out animation before removal
      this.scene.tweens.add({
        targets: this.contents,
        alpha: 0,
        scale: 0.5,
        duration: 200,
        onComplete: () => {
          if (this.contents) {
            this.remove(this.contents, true);
            this.contents = null;
          }
        },
      });
    }

    // Reset border and tween states
    this.background.setStrokeStyle(2, GAME_CONSTANTS.COLORS.DARK_GREEN);
    this.scene.tweens.killTweensOf(this.background);
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
    const flashRect = this.scene.add
      .rectangle(0, 0, this.size - 8, this.size - 8, color)
      .setAlpha(0.7);

    this.add(flashRect);

    this.scene.tweens.add({
      targets: flashRect,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.remove(flashRect, true);
      },
    });
  }

  // Shake the cell (for invalid moves)
  shake(): void {
    if (this.scene.tweens.isTweening(this)) return;

    this.scene.tweens.add({
      targets: this,
      x: { from: this.x - 5, to: this.x },
      duration: 50,
      repeat: 3,
      yoyo: true,
      ease: 'Bounce.easeInOut',
      onComplete: () => {
        this.x = this.x;
      },
    });
  }
}
