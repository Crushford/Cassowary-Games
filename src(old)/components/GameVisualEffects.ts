// src/components/GameVisualEffects.ts
import Phaser from 'phaser';

export class GameVisualEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public showGoldCoinAnimation(x?: number, y?: number): void {
    // Create gold coin that spins and vanishes
    const posX = x || this.scene.cameras.main.width - 50;
    const posY = y || 120;

    const coin = this.scene.add.image(posX, posY, 'gold-coin');
    coin.setScale(0.5);
    coin.setDepth(150);

    this.scene.tweens.add({
      targets: coin,
      angle: 360,
      alpha: { from: 1, to: 0 },
      y: posY + 30,
      duration: 1500,
      onComplete: () => {
        coin.destroy();
      },
    });
  }

  public showQueenPlacementEffect(x: number, y: number): void {
    // Create a circle that expands and fades out
    const circle = this.scene.add.circle(x, y, 5, 0xffd700, 0.7);
    circle.setDepth(120);

    this.scene.tweens.add({
      targets: circle,
      radius: 40,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        circle.destroy();
      },
    });
  }

  public showQueenDeathEffect(x: number, y: number): void {
    // Create particles for queen death
    const particles = this.scene.add.particles(x, y, 'raindrop', {
      speed: { min: 20, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0.1 },
      blendMode: 'ADD',
      lifespan: 800,
      quantity: 15,
    });

    // Stop emitting after a short time and then destroy
    this.scene.time.delayedCall(300, () => {
      particles.stop();
      this.scene.time.delayedCall(800, () => {
        particles.destroy();
      });
    });
  }

  public showSuccessEffect(): void {
    // Create colorful particles from the top of the screen
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(100, this.scene.cameras.main.width - 100);
      const particles = this.scene.add.particles(x, -20, 'leaf', {
        speed: { min: 100, max: 200 },
        angle: { min: 80, max: 100 },
        scale: { start: 0.2, end: 0.1 },
        lifespan: 3000,
        frequency: 100,
        quantity: 1,
      });

      // Stop emitting after 2 seconds and destroy
      this.scene.time.delayedCall(2000, () => {
        particles.stop();
        this.scene.time.delayedCall(3000, () => {
          particles.destroy();
        });
      });
    }
  }
}
