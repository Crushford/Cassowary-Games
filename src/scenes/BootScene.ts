// src/scenes/BootScene.ts
import { BaseScene } from './BaseScene';

export class BootScene extends BaseScene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Show loading indicator
    const loadingText = this.createText(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'Loading...',
      '32px',
      '#000000'
    );

    // Load all game assets
    this.loadGameAssets();

    // Loading progress
    this.load.on('progress', (value: number) => {
      loadingText.setText(`Loading: ${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      loadingText.setText('Ready!');
    });
  }

  create(): void {
    // Wait briefly then start both game and UI scenes
    this.time.delayedCall(1000, () => {
      this.scene.start('GameScene');
      this.scene.launch('UIScene'); // Launch UI scene in parallel
    });
  }

  private loadGameAssets(): void {
    // Load only essential image assets
    this.load.image(
      'queen',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/queen.png'
    );
    this.load.image(
      'flag',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/flag.png'
    );
  }
}
