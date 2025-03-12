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
      backgroundColor = GAME_CONSTANTS.COLORS.DARK_GREEN,
      alpha = 0.9,
      strokeColor = GAME_CONSTANTS.COLORS.GOLD,
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
