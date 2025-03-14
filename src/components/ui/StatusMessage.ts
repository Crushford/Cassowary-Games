import Phaser from 'phaser';
import { TextDisplay, TextStyleType } from './TextDisplay';
import { GAME_CONSTANTS } from '../../config/constants';

export interface StatusMessageOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  padding?: number;
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  errorColor?: number;
}

/**
 * Reusable component for displaying status messages
 */
export class StatusMessage {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private textObject: Phaser.GameObjects.Text;
  private options: StatusMessageOptions;
  private isError: boolean = false;

  constructor(scene: Phaser.Scene, options: StatusMessageOptions) {
    this.scene = scene;
    this.options = {
      width: GAME_CONSTANTS.UI.STATUS.DEFAULT_WIDTH,
      height: GAME_CONSTANTS.UI.STATUS.DEFAULT_HEIGHT,
      padding: 12,
      backgroundColor: GAME_CONSTANTS.COLORS.BG_SECONDARY,
      borderColor: GAME_CONSTANTS.COLORS.SECONDARY,
      borderWidth: 4,
      errorColor: GAME_CONSTANTS.COLORS.SECONDARY,
      ...options,
    };

    this.container = scene.add.container(options.x, options.y);
    this.background = scene.add.graphics();
    this.container.add(this.background);

    // Create the text object
    this.textObject = TextDisplay.createText(
      scene,
      this.options.width! / 2,
      this.options.height! / 2,
      '',
      TextStyleType.STATUS
    ).setOrigin(0.5);

    this.container.add(this.textObject);
    this.container.setVisible(false); // Hide initially
    this.drawBackground();
  }

  /**
   * Draw the status message background
   */
  private drawBackground(): void {
    const { width, height, backgroundColor, borderColor, borderWidth } = this.options;

    this.background.clear();

    // Draw background
    this.background.fillStyle(backgroundColor!, 1);
    this.background.fillRect(0, 0, width!, height!);

    // Draw left border (indicator)
    const borderLeft = this.isError ? this.options.errorColor! : borderColor!;
    this.background.fillStyle(borderLeft, 1);
    this.background.fillRect(0, 0, borderWidth!, height!);
  }

  /**
   * Set the status message text
   */
  public setMessage(message: string, isError: boolean = false): void {
    if (!message) {
      this.container.setVisible(false);
      return;
    }

    this.isError = isError;
    this.textObject.setText(message);
    this.textObject.setPosition(this.options.width! / 2, this.options.height! / 2);
    this.textObject.setStyle({
      color: isError ? '#505050' : '#000000',
    });

    this.drawBackground();
    this.container.setVisible(true);
  }

  /**
   * Clear the status message
   */
  public clear(): void {
    this.textObject.setText('');
    this.container.setVisible(false);
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
    this.container.destroy();
  }
}
