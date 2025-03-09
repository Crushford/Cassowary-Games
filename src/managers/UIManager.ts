// src/managers/UIManager.ts
import Phaser from 'phaser';
import { GAME_CONSTANTS } from '../config/constants';

export class UIManager {
  private scene: Phaser.Scene;
  private elements: Map<string, Phaser.GameObjects.GameObject> = new Map();
  private statusClearTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create a UI text element
   */
  public createText(
    key: string,
    x: number,
    y: number,
    text: string,
    fontSize: string = '16px',
    color: string = '#FFFFFF',
    stroke: string = '#000000',
    strokeWidth: number = 1,
    depth: number = 100
  ): Phaser.GameObjects.Text {
    const textElement = this.scene.add.text(x, y, text, {
      fontFamily: 'Georgia',
      fontSize: fontSize,
      color: color,
      stroke: stroke,
      strokeThickness: strokeWidth,
      align: 'center',
    });
    textElement.setOrigin(0.5).setDepth(depth);

    this.elements.set(key, textElement);
    return textElement;
  }

  /**
   * Create a UI panel/background
   */
  public createPanel(
    key: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number = GAME_CONSTANTS.COLORS.DARK_GREEN,
    alpha: number = 0.9,
    strokeColor: number = GAME_CONSTANTS.COLORS.GOLD,
    strokeWidth: number = 2,
    depth: number = 90
  ): Phaser.GameObjects.Rectangle {
    const panel = this.scene.add.rectangle(x, y, width, height, fillColor, alpha);
    panel.setStrokeStyle(strokeWidth, strokeColor);
    panel.setDepth(depth);

    this.elements.set(key, panel);
    return panel;
  }

  /**
   * Create a button with hover effects
   */
  public createButton(
    key: string,
    x: number,
    y: number,
    text: string,
    callback: Function,
    width: number = 200,
    height: number = 50,
    fontSize: string = '20px',
    depth: number = 100
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);
    button.setDepth(depth);

    // Create background
    const bg = this.scene.add.rectangle(0, 0, width, height, GAME_CONSTANTS.COLORS.FOREST_GREEN);
    bg.setStrokeStyle(2, GAME_CONSTANTS.COLORS.GOLD);
    bg.setInteractive({ useHandCursor: true });

    // Create text
    const buttonText = this.scene.add
      .text(0, 0, text, {
        fontFamily: 'Georgia',
        fontSize: fontSize,
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 1,
        align: 'center',
      })
      .setOrigin(0.5);

    // Add hover effects
    bg.on('pointerover', () => {
      bg.fillColor = GAME_CONSTANTS.COLORS.LIGHT_GREEN;
    });

    bg.on('pointerout', () => {
      bg.fillColor = GAME_CONSTANTS.COLORS.FOREST_GREEN;
    });

    // Add click handler
    bg.on('pointerdown', () => {
      callback();
    });

    button.add([bg, buttonText]);

    this.elements.set(key, button);
    return button;
  }

  /**
   * Update text content
   */
  public updateText(key: string, newText: string): void {
    const element = this.elements.get(key);
    if (element instanceof Phaser.GameObjects.Text) {
      element.setText(newText);
    }
  }

  /**
   * Show status message with optional auto-hide
   */
  public showStatusMessage(message: string, autoHide: boolean = false): void {
    const statusText = this.elements.get('statusText');
    if (!(statusText instanceof Phaser.GameObjects.Text)) return;

    statusText.setText(message);

    // Clear any existing timer
    if (this.statusClearTimer) {
      this.statusClearTimer.destroy();
      this.statusClearTimer = null;
    }

    // Auto-hide if requested
    if (autoHide) {
      this.statusClearTimer = this.scene.time.delayedCall(3000, () => {
        statusText.setText('Place honey pot queens strategically to build your colony!');
        this.statusClearTimer = null;
      });
    }
  }

  /**
   * Show/hide a UI element
   */
  public setElementVisible(key: string, visible: boolean): void {
    const element = this.elements.get(key);
    if (element) {
      // Handle different types that have the setVisible method
      if (
        element instanceof Phaser.GameObjects.Container ||
        element instanceof Phaser.GameObjects.Image ||
        element instanceof Phaser.GameObjects.Sprite ||
        element instanceof Phaser.GameObjects.Rectangle ||
        element instanceof Phaser.GameObjects.Text
      ) {
        element.setVisible(visible);
      } else {
        console.warn(`Element ${key} doesn't support setVisible`);
      }
    }
  }

  /**
   * Format resources text
   */
  public formatResourcesText(resources: any): string {
    return (
      `Plots: ${resources.plots}\n` +
      `Land Area: ${resources.acres}/${GAME_CONSTANTS.TOTAL_ACRES} m²\n` +
      `Honey Pot Queens: ${resources.queens}\n` +
      `Gold Coins: ${resources.gold}`
    );
  }

  /**
   * Clear all UI elements
   */
  public destroy(): void {
    this.elements.forEach((element) => {
      element.destroy();
    });

    this.elements.clear();

    if (this.statusClearTimer) {
      this.statusClearTimer.destroy();
      this.statusClearTimer = null;
    }
  }
}
