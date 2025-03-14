import Phaser from 'phaser';
import { TextDisplay, TextStyleType } from './TextDisplay';
import { GAME_CONSTANTS } from '../../config/constants';

export interface ResourceDisplayOptions {
  x: number;
  y: number;
  width?: number;
  padding?: number;
  backgroundColor?: number;
  borderColor?: number;
  spacing?: number;
}

/**
 * Reusable component for displaying resources in the game
 */
export class ResourceDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private resourceTexts: Map<string, Phaser.GameObjects.Text>;
  private options: ResourceDisplayOptions;

  constructor(scene: Phaser.Scene, options: ResourceDisplayOptions) {
    this.scene = scene;
    this.options = {
      width: GAME_CONSTANTS.UI.RESOURCE.DEFAULT_WIDTH,
      padding: 12,
      backgroundColor: GAME_CONSTANTS.COLORS.BG_SECONDARY,
      borderColor: GAME_CONSTANTS.COLORS.BORDER,
      spacing: 8,
      ...options,
    };

    this.container = scene.add.container(options.x, options.y);
    this.background = scene.add.graphics();
    this.resourceTexts = new Map();

    this.createBackground();
    this.container.add(this.background);
  }

  /**
   * Create the background panel
   */
  private createBackground(): void {
    const { width, padding, backgroundColor, borderColor } = this.options;

    // Clear any previous graphics
    this.background.clear();

    // Calculate the height based on the number of resources
    const height =
      this.resourceTexts.size * (20 + this.options.spacing!) + this.options.padding! * 2;

    // Draw background
    this.background.fillStyle(backgroundColor!, 1);
    this.background.fillRect(0, 0, width!, height);

    // Draw border
    this.background.lineStyle(1, borderColor!, 1);
    this.background.strokeRect(0, 0, width!, height);
  }

  /**
   * Update or create a resource display
   */
  public updateResource(key: string, value: string | number, index: number): void {
    const formattedKey = this.formatLabel(key);
    const text = `${formattedKey}: ${value}`;
    const { padding, width, spacing } = this.options;

    if (this.resourceTexts.has(key)) {
      // Update existing text
      this.resourceTexts.get(key)!.setText(text);
    } else {
      // Create label and value
      const y = padding! + index * (20 + spacing!);
      const resourceText = TextDisplay.createText(
        this.scene,
        padding!,
        y,
        text,
        TextStyleType.BODY
      );

      this.resourceTexts.set(key, resourceText);
      this.container.add(resourceText);
    }

    // Redraw background to fit content
    this.createBackground();
  }

  /**
   * Set multiple resources at once
   */
  public setResources(resources: Record<string, string | number>): void {
    // Clear existing texts
    this.resourceTexts.forEach((text) => text.destroy());
    this.resourceTexts.clear();

    // Add new resources
    Object.entries(resources).forEach(([key, value], index) => {
      this.updateResource(key, value, index);
    });
  }

  /**
   * Format a key into a readable label
   */
  private formatLabel(key: string): string {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
