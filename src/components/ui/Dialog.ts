import Phaser from 'phaser';
import { TextDisplay, TextStyleType } from './TextDisplay';
import { GAME_CONSTANTS } from '../../config/constants';

export interface DialogOptions {
  width?: number;
  height?: number;
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
}

/**
 * Reusable Dialog component for creating modal dialogs
 */
export class Dialog {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Graphics;
  private options: DialogOptions;

  constructor(scene: Phaser.Scene, options: DialogOptions = {}) {
    this.scene = scene;
    this.options = {
      width: GAME_CONSTANTS.UI.DIALOG.DEFAULT_WIDTH,
      height: GAME_CONSTANTS.UI.DIALOG.DEFAULT_HEIGHT,
      backgroundColor: GAME_CONSTANTS.COLORS.BACKGROUND,
      borderColor: GAME_CONSTANTS.COLORS.BORDER,
      borderWidth: 2,
      borderRadius: GAME_CONSTANTS.UI.DIALOG.BORDER_RADIUS,
      padding: 20,
      ...options,
    };

    this.container = scene.add.container(0, 0);
    this.background = scene.add.graphics();
    this.overlay = scene.add.graphics();

    this.container.setDepth(1000); // Ensure dialog appears on top
    this.createOverlay();
  }

  /**
   * Create a semi-transparent overlay behind the dialog
   */
  private createOverlay(): void {
    this.overlay.fillStyle(GAME_CONSTANTS.COLORS.PRIMARY, 0.5);
    this.overlay.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
    this.container.add(this.overlay);

    // Make overlay interactive to prevent clicking through
    const hitArea = new Phaser.Geom.Rectangle(
      0,
      0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height
    );
    this.overlay.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
  }

  /**
   * Create the dialog box
   */
  private createDialogBox(): void {
    const { width, height, backgroundColor, borderColor, borderWidth, borderRadius } = this.options;
    const x = (this.scene.cameras.main.width - width!) / 2;
    const y = (this.scene.cameras.main.height - height!) / 2;

    // Create dialog background
    this.background.fillStyle(backgroundColor!, 1);
    this.background.fillRoundedRect(x, y, width!, height!, borderRadius!);

    // Create dialog border
    this.background.lineStyle(borderWidth!, borderColor!, 1);
    this.background.strokeRoundedRect(x, y, width!, height!, borderRadius!);

    this.container.add(this.background);
  }

  /**
   * Show a simple dialog with title, message and a button
   */
  public showMessageDialog(
    title: string,
    message: string,
    buttonText: string = 'OK',
    onButtonClick: () => void = () => this.close()
  ): this {
    this.createDialogBox();

    const { width, height } = this.options;
    const centerX = this.scene.cameras.main.width / 2;
    const startY = (this.scene.cameras.main.height - height!) / 2;

    // Add title
    const titleText = TextDisplay.createText(
      this.scene,
      centerX,
      startY + 50,
      title,
      TextStyleType.TITLE
    ).setOrigin(0.5);

    // Add message
    const messageText = TextDisplay.createText(
      this.scene,
      centerX,
      startY + 100,
      message,
      TextStyleType.BODY
    ).setOrigin(0.5);

    // Add button
    const button = TextDisplay.createButton(this.scene, centerX, startY + 170, buttonText, () => {
      onButtonClick();
      this.close();
    });

    this.container.add([titleText, messageText, button]);

    return this;
  }

  /**
   * Close the dialog
   */
  public close(): void {
    this.container.destroy();
  }
}
