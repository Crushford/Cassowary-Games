// src/scenes/BaseScene.ts
import Phaser from 'phaser';

export class BaseScene extends Phaser.Scene {
  constructor(key: string) {
    super(key);
  }

  // Common functionality for all scenes
  protected createBackground(texture: string): void {
    this.add
      .image(this.cameras.main.width / 2, this.cameras.main.height / 2, texture)
      .setOrigin(0.5)
      .setDisplaySize(this.cameras.main.width, this.cameras.main.height);
  }

  // Helper to create centered text
  protected createText(
    x: number,
    y: number,
    text: string,
    fontSize: string = '16px',
    color: string = '#fff',
    stroke: string = '#000',
    strokeWidth: number = 1
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        fontFamily: 'Georgia',
        fontSize: fontSize,
        color: color,
        stroke: stroke,
        strokeThickness: strokeWidth,
        align: 'center',
      })
      .setOrigin(0.5);
  }

  // Position elements at screen percentages rather than fixed coordinates
  protected placeAt(
    percentX: number,
    percentY: number,
    gameObject: Phaser.GameObjects.GameObject
  ): void {
    const x = this.cameras.main.width * (percentX / 100);
    const y = this.cameras.main.height * (percentY / 100);

    if (
      gameObject instanceof Phaser.GameObjects.Container ||
      gameObject instanceof Phaser.GameObjects.Sprite ||
      gameObject instanceof Phaser.GameObjects.Image ||
      gameObject instanceof Phaser.GameObjects.Text
    ) {
      gameObject.setPosition(x, y);
    }
  }
}
