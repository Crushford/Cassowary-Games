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
  borderRadius?: number;
  horizontalLayout?: boolean;
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
      borderRadius: 8,
      horizontalLayout: true,
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
    const { width, padding, backgroundColor, borderColor, borderRadius } = this.options;

    // Clear any previous graphics
    this.background.clear();

    // Draw the background panel
    this.background.fillStyle(backgroundColor!, 1);

    // Use rounded rectangle for mobile style if borderRadius is set
    if (borderRadius) {
      this.background.fillRoundedRect(0, 0, width!, 40, borderRadius);
    } else {
      this.background.fillRect(0, 0, width!, 40);
    }
  }

  /**
   * Update a single resource display
   */
  public updateResource(key: string, value: string | number, index: number): void {
    const { padding, spacing, width, horizontalLayout } = this.options;
    const formattedLabel = this.formatLabel(key);

    // Calculate position based on layout type
    let xPos, yPos;
    if (horizontalLayout) {
      // For horizontal layout, space items evenly across the width
      const itemWidth = width! / 4; // Assuming up to 4 resources
      xPos = index * itemWidth + itemWidth / 2;
      yPos = 20; // Center vertically in the bar
    } else {
      // For vertical layout, stack items
      xPos = width! / 2;
      yPos = padding! + index * (spacing! + 20);
    }

    let text = this.resourceTexts.get(key);

    if (text) {
      // Update existing text
      text.setText(`${formattedLabel}: ${value}`);
      text.setPosition(xPos, yPos);
    } else {
      // Create new text
      text = TextDisplay.createText(
        this.scene,
        xPos,
        yPos,
        `${formattedLabel}: ${value}`,
        TextStyleType.RESOURCE
      );

      // Set origin to center for horizontal layout, or center-top for vertical
      text.setOrigin(horizontalLayout ? 0.5 : 0.5, 0.5);

      this.container.add(text);
      this.resourceTexts.set(key, text);
    }
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
