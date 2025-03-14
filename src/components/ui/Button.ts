import Phaser from 'phaser';
import { TextDisplay, TextStyleType } from './TextDisplay';
import { GAME_CONSTANTS } from '../../config/constants';

export interface ButtonOptions {
  x: number;
  y: number;
  text: string;
  width?: number;
  height?: number;
  backgroundColor?: number;
  hoverColor?: number;
  textColor?: number;
  borderColor?: number;
  borderWidth?: number;
  padding?: {
    x?: number;
    y?: number;
  };
  fontSize?: string;
  borderRadius?: number;
}

/**
 * Reusable Button component
 */
export class Button {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private hitZone: Phaser.GameObjects.Rectangle;
  private textObject: Phaser.GameObjects.Text;
  private options: ButtonOptions;
  private isHovering: boolean = false;

  constructor(scene: Phaser.Scene, options: ButtonOptions, onClick: () => void) {
    this.scene = scene;
    this.options = {
      width: GAME_CONSTANTS.UI.BUTTON.DEFAULT_WIDTH,
      height: GAME_CONSTANTS.UI.BUTTON.DEFAULT_HEIGHT,
      backgroundColor: GAME_CONSTANTS.COLORS.BACKGROUND,
      hoverColor: GAME_CONSTANTS.COLORS.BG_SECONDARY,
      textColor: GAME_CONSTANTS.COLORS.PRIMARY,
      borderColor: GAME_CONSTANTS.COLORS.BORDER,
      borderWidth: 1,
      padding: {
        x: GAME_CONSTANTS.UI.BUTTON.PADDING_X,
        y: GAME_CONSTANTS.UI.BUTTON.PADDING_Y,
      },
      fontSize: '16px',
      borderRadius: 4,
      ...options,
    };

    this.container = scene.add.container(options.x, options.y);
    this.background = scene.add.graphics();
    this.container.add(this.background);

    // Create text
    this.textObject = TextDisplay.createText(scene, 0, 0, options.text, TextStyleType.BUTTON, {
      fontSize: this.options.fontSize,
      color: this.getHexColor(this.options.textColor || GAME_CONSTANTS.COLORS.PRIMARY),
    }).setOrigin(0.5);

    this.container.add(this.textObject);

    // Auto-size the button if width/height not specified
    if (!options.width) {
      const paddingX = this.options.padding?.x || GAME_CONSTANTS.UI.BUTTON.PADDING_X;
      this.options.width = this.textObject.width + paddingX * 2;
    }
    if (!options.height) {
      const paddingY = this.options.padding?.y || GAME_CONSTANTS.UI.BUTTON.PADDING_Y;
      this.options.height = this.textObject.height + paddingY * 2;
    }

    // Draw the button
    this.drawButton();

    // Handle auto-sizing and ensure defaults
    const finalWidth = this.options.width || GAME_CONSTANTS.UI.BUTTON.DEFAULT_WIDTH;
    const finalHeight = this.options.height || GAME_CONSTANTS.UI.BUTTON.DEFAULT_HEIGHT;

    // Create a rectangle to serve as a hit zone
    this.hitZone = scene.add.rectangle(0, 0, finalWidth, finalHeight, 0xffffff, 0);
    this.hitZone.setOrigin(0.5, 0.5);
    this.hitZone.setInteractive();
    this.container.add(this.hitZone);

    // Make sure the hit zone is on top to catch all pointer events
    this.hitZone.setDepth(1);

    // Set cursor style to indicate clickable element
    if (this.hitZone.input) {
      this.hitZone.input.cursor = 'pointer';
    }

    // Add event listeners to the hit zone
    this.hitZone.on('pointerover', this.onPointerOver, this);
    this.hitZone.on('pointerout', this.onPointerOut, this);
    this.hitZone.on('pointerdown', onClick);
  }

  /**
   * Convert a number color to hex string
   */
  private getHexColor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  /**
   * Handle pointer over event
   */
  private onPointerOver(): void {
    this.isHovering = true;
    this.drawButton();
  }

  /**
   * Handle pointer out event
   */
  private onPointerOut(): void {
    this.isHovering = false;
    this.drawButton();
  }

  /**
   * Draw the button background
   */
  private drawButton(): void {
    const { width, height, backgroundColor, hoverColor, borderColor, borderWidth, borderRadius } =
      this.options;
    const bgColor = this.isHovering
      ? hoverColor || GAME_CONSTANTS.COLORS.BG_SECONDARY
      : backgroundColor || GAME_CONSTANTS.COLORS.BACKGROUND;

    this.background.clear();

    // Position relative to center
    const x = -width! / 2;
    const y = -height! / 2;

    // Draw background
    this.background.fillStyle(bgColor, 1);

    if (borderRadius && borderRadius > 0) {
      this.background.fillRoundedRect(x, y, width!, height!, borderRadius);
    } else {
      this.background.fillRect(x, y, width!, height!);
    }

    // Draw border
    if (borderWidth && borderWidth > 0) {
      this.background.lineStyle(borderWidth, borderColor || GAME_CONSTANTS.COLORS.BORDER, 1);

      if (borderRadius && borderRadius > 0) {
        this.background.strokeRoundedRect(x, y, width!, height!, borderRadius);
      } else {
        this.background.strokeRect(x, y, width!, height!);
      }
    }
  }

  /**
   * Set the button text
   */
  public setText(text: string): void {
    this.textObject.setText(text);
  }

  /**
   * Get the container for this component
   */
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.hitZone) {
      this.hitZone.off('pointerover', this.onPointerOver, this);
      this.hitZone.off('pointerout', this.onPointerOut, this);
      this.hitZone.destroy();
    }
    this.container.destroy();
  }
}
