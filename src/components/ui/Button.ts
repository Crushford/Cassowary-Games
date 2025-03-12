import { Scene } from 'phaser';
import { UIComponent } from './UIComponent';
import { GAME_CONSTANTS } from '../../config/constants';

interface ButtonConfig {
  width?: number;
  height?: number;
  fontSize?: string;
  backgroundColor?: number;
  textColor?: string;
  strokeColor?: number;
  strokeWidth?: number;
}

export class Button extends UIComponent {
  private buttonText: Phaser.GameObjects.Text;
  private buttonBackground: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    config: ButtonConfig = {}
  ) {
    super(scene, x, y);

    const {
      width = 200,
      height = 50,
      fontSize = '24px',
      backgroundColor = GAME_CONSTANTS.COLORS.FOREST_GREEN,
      textColor = '#FFD700',
      strokeColor = GAME_CONSTANTS.COLORS.GOLD,
      strokeWidth = 2,
    } = config;

    // Create button background
    this.buttonBackground = scene.add.rectangle(0, 0, width, height, backgroundColor);
    this.buttonBackground.setStrokeStyle(strokeWidth, strokeColor);

    // Create button text
    this.buttonText = this.createText(0, 0, text, fontSize, textColor);

    // Add components to container
    this.add([this.buttonBackground, this.buttonText]);

    // Make interactive
    this.buttonBackground.setInteractive({ useHandCursor: true });

    // Add hover effects
    this.buttonBackground.on('pointerover', () => {
      this.buttonBackground.fillColor = GAME_CONSTANTS.COLORS.LIGHT_GREEN;
    });

    this.buttonBackground.on('pointerout', () => {
      this.buttonBackground.fillColor = backgroundColor;
    });

    // Add click handler
    this.buttonBackground.on('pointerdown', onClick);
  }

  public setText(text: string): this {
    this.buttonText.setText(text);
    return this;
  }

  public setBackgroundColor(color: number): this {
    this.buttonBackground.fillColor = color;
    return this;
  }
}
