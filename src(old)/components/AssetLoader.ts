// src/components/AssetLoader.ts
import Phaser from 'phaser';

export class AssetLoader {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public preloadAssets(): void {
    // Load rainforest themed assets
    this.scene.load.image(
      'soldier-ant',
      'https://labs.phaser.io/assets/sprites/bullets/bullet6.png'
    );
    this.scene.load.image('honey-queen', 'https://labs.phaser.io/assets/sprites/ufo.png');
    this.scene.load.image('rainforest', 'https://labs.phaser.io/assets/skies/sky3.png');
    this.scene.load.image('raindrop', 'https://labs.phaser.io/assets/particles/blue.png');
    this.scene.load.image('leaf', 'https://labs.phaser.io/assets/sprites/leaf-green.png');
    this.scene.load.image('gold-coin', 'https://labs.phaser.io/assets/sprites/coin.png');

    // Fallback options if the above URLs don't work
    this.scene.load.image(
      'soldier-ant-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/bullets/bullet6.png'
    );
    this.scene.load.image(
      'honey-queen-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/ufo.png'
    );
    this.scene.load.image(
      'rainforest-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/skies/sky3.png'
    );
    this.scene.load.image(
      'raindrop-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/particles/blue.png'
    );
    this.scene.load.image(
      'leaf-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/leaf-green.png'
    );
    this.scene.load.image(
      'gold-coin-alt',
      'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/coin.png'
    );
  }

  public ensureAssets(): void {
    // Handle potential loading errors by using alt textures if main ones aren't available
    const textureKeys = [
      'honey-queen',
      'soldier-ant',
      'rainforest',
      'raindrop',
      'leaf',
      'gold-coin',
    ];

    textureKeys.forEach((key) => {
      if (!this.scene.textures.exists(key)) {
        // Use the alt version instead
        const altKey = `${key}-alt`;
        if (this.scene.textures.exists(altKey)) {
          // Create a new texture alias in Phaser 3
          this.scene.textures.get(altKey).key = key;
        }
      }
    });
  }
}
