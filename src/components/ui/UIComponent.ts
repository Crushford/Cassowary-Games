import { Scene } from 'phaser';

export class UIComponent extends Phaser.GameObjects.Container {
  public scene: Scene;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y);
    this.scene = scene;
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
  }

  protected createText(
    x: number,
    y: number,
    text: string,
    fontSize: string = '16px',
    color: string = '#000000',
    stroke: string = '#000000',
    strokeWidth: number = 1
  ): Phaser.GameObjects.Text {
    const textObject = this.scene.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: fontSize,
      color: color,
      stroke: stroke,
      strokeThickness: strokeWidth,
      align: 'center',
    });
    textObject.setOrigin(0.5);
    return textObject;
  }

  public setInteractive(shape?: Phaser.Types.Input.InputConfiguration): this {
    super.setInteractive(shape);
    return this;
  }

  public setDepth(value: number): this {
    super.setDepth(value);
    return this;
  }
}
