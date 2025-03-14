import { Scene } from 'phaser';
import { UIComponent } from './UIComponent';
import { GAME_CONSTANTS } from '../../config/constants';

interface PanelConfig {
  width: number;
  height: number;
  backgroundColor?: number;
  alpha?: number;
  strokeColor?: number;
  strokeWidth?: number;
}

export class Panel extends UIComponent {
  private background: Phaser.GameObjects.Rectangle;

  constructor(scene: Scene, x: number, y: number, config: PanelConfig) {
    super(scene, x, y);

    const {
      width,
      height,
      backgroundColor = 0xffffff, // White background
      alpha = 1.0,
      strokeColor = 0x000000, // Black border
      strokeWidth = 2,
    } = config;

    // Create panel background
    this.background = scene.add.rectangle(0, 0, width, height, backgroundColor, alpha);
    this.background.setStrokeStyle(strokeWidth, strokeColor);

    // Add background to container
    this.add(this.background);
  }

  public addContent(
    content: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]
  ): this {
    if (Array.isArray(content)) {
      this.add(content);
    } else {
      this.add(content);
    }
    return this;
  }

  public setBackgroundColor(color: number, alpha?: number): this {
    this.background.setFillStyle(color, alpha ?? this.background.alpha);
    return this;
  }

  public setStroke(width: number, color: number): this {
    this.background.setStrokeStyle(width, color);
    return this;
  }
}
