import Phaser from 'phaser';

/**
 * Text style configurations
 */
export enum TextStyleType {
  TITLE,
  SUBTITLE,
  BODY,
  BUTTON,
  STATUS,
}

/**
 * Standard text configurations for consistent UI styling
 */
export const TEXT_STYLES = {
  [TextStyleType.TITLE]: {
    fontFamily: 'Arial',
    fontSize: '24px',
    color: '#000000',
    fontStyle: 'bold',
  },
  [TextStyleType.SUBTITLE]: {
    fontFamily: 'Arial',
    fontSize: '18px',
    color: '#000000',
  },
  [TextStyleType.BODY]: {
    fontFamily: 'Arial',
    fontSize: '16px',
    color: '#000000',
  },
  [TextStyleType.BUTTON]: {
    fontFamily: 'Arial',
    fontSize: '16px',
    color: '#000000',
    backgroundColor: '#ffffff',
    padding: { left: 10, right: 10, top: 5, bottom: 5 },
  },
  [TextStyleType.STATUS]: {
    fontFamily: 'Arial',
    fontSize: '18px',
    color: '#000000',
    align: 'center',
  },
};

/**
 * Reusable text display component for creating consistent text elements
 */
export class TextDisplay {
  /**
   * Create a text object with predefined styling
   */
  static createText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    style: TextStyleType,
    customStyle: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}
  ): Phaser.GameObjects.Text {
    // Merge default style with any custom style overrides
    const textStyle = { ...TEXT_STYLES[style], ...customStyle };

    return scene.add.text(x, y, text, textStyle);
  }

  /**
   * Create a button with standardized styling and behavior
   */
  static createButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    customStyle: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}
  ): Phaser.GameObjects.Text {
    // Create button with standard text style
    const button = this.createText(scene, x, y, text, TextStyleType.BUTTON, customStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => {
        button.setStyle({ backgroundColor: '#f0f0f0' });
      })
      .on('pointerout', () => {
        button.setStyle({ backgroundColor: '#ffffff' });
      });

    return button;
  }

  /**
   * Create a status message
   */
  static createStatusText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string = '',
    isError: boolean = false
  ): Phaser.GameObjects.Text {
    const statusText = this.createText(scene, x, y, text, TextStyleType.STATUS, {
      color: isError ? '#505050' : '#000000',
    }).setOrigin(0.5);

    return statusText;
  }
}
