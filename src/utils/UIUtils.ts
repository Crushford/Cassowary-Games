import Phaser from 'phaser';
import { TextDisplay, TextStyleType } from '../components/ui/TextDisplay';
import { Dialog } from '../components/ui/Dialog';

/**
 * Utility class for UI-related operations
 */
export class UIUtils {
  /**
   * Create a panel with a background
   */
  static createPanel(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: number = 0xffffff,
    borderColor: number = 0x000000,
    borderWidth: number = 1,
    borderRadius: number = 0
  ): Phaser.GameObjects.Graphics {
    const panel = scene.add.graphics();

    // Draw background
    panel.fillStyle(backgroundColor, 1);
    if (borderRadius > 0) {
      panel.fillRoundedRect(x, y, width, height, borderRadius);
    } else {
      panel.fillRect(x, y, width, height);
    }

    // Draw border
    if (borderWidth > 0) {
      panel.lineStyle(borderWidth, borderColor, 1);
      if (borderRadius > 0) {
        panel.strokeRoundedRect(x, y, width, height, borderRadius);
      } else {
        panel.strokeRect(x, y, width, height);
      }
    }

    return panel;
  }

  /**
   * Create a game over dialog
   */
  static showGameOverDialog(
    scene: Phaser.Scene,
    title: string,
    message: string,
    isSuccess: boolean = false,
    onButtonClick: () => void = () => {}
  ): void {
    const dialog = new Dialog(scene, {
      borderColor: isSuccess ? 0x505050 : 0x505050, // Using grey instead of green/red for simplicity
    });

    dialog.showMessageDialog(title, message, 'PLAY AGAIN', () => {
      onButtonClick();
      dialog.close();
    });
  }

  /**
   * Create a resource display panel
   */
  static createResourceDisplay(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number
  ): {
    panel: Phaser.GameObjects.Graphics;
    resourceTexts: { [key: string]: Phaser.GameObjects.Text };
  } {
    // Create panel background
    const panel = this.createPanel(scene, x, y, width, height, 0xf5f5f5);

    // Create resource texts (empty initially)
    const resourceTexts: { [key: string]: Phaser.GameObjects.Text } = {};

    return { panel, resourceTexts };
  }

  /**
   * Update resource text
   */
  static updateResourceText(
    resourceTexts: { [key: string]: Phaser.GameObjects.Text },
    scene: Phaser.Scene,
    key: string,
    value: string | number,
    x: number,
    y: number
  ): void {
    // If text already exists, update it
    if (resourceTexts[key]) {
      resourceTexts[key].setText(`${key}: ${value}`);
    }
    // Otherwise create new text
    else {
      resourceTexts[key] = TextDisplay.createText(
        scene,
        x,
        y,
        `${key}: ${value}`,
        TextStyleType.BODY
      );
    }
  }
}
