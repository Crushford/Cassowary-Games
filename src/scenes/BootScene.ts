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
      '#FFD700'
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
    // Wait briefly then start the game
    this.time.delayedCall(1000, () => {
      this.scene.start('GameScene');
    });
  }

  private loadGameAssets(): void {
    // Load image assets
    this.load.image('rainforest', 'assets/images/rainforest.png');
    this.load.image('honey-queen', 'assets/images/honey-queen.png');
    this.load.image('soldier-ant', 'assets/images/soldier-ant.png');
    this.load.image('leaf', 'assets/images/leaf.png');
    this.load.image('raindrop', 'assets/images/raindrop.png');
    this.load.image('gold-coin', 'assets/images/gold-coin.png');

    // Load fallbacks using absolute URLs (can be replaced with your own hosted assets)
    this.load.image(
      'soldier-ant-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/bullets/bullet6.png'
    );
    this.load.image(
      'honey-queen-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/ufo.png'
    );
    this.load.image(
      'rainforest-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/skies/sky3.png'
    );
    this.load.image(
      'raindrop-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/particles/blue.png'
    );
    this.load.image(
      'leaf-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/leaf-green.png'
    );
    this.load.image(
      'gold-coin-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/coin.png'
    );
  }
}
