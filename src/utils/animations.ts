// src/utils/animations.ts
import Phaser from 'phaser';

/**
 * Register queen ant animations
 */
export function createQueenAnimations(scene: Phaser.Scene): void {
  // Gentle hovering animation for honey pot ants
  scene.anims.create({
    key: 'queen-hover',
    frames: scene.anims.generateFrameNumbers('queen-sprite', { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1,
  });
}

/**
 * Create a raindrop animation effect
 */
export function createRaindropEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count: number = 5,
  duration: number = 1500
): void {
  // Create raindrops at the specified position
  for (let i = 0; i < count; i++) {
    const raindrop = scene.add.image(
      x + Phaser.Math.Between(-20, 20),
      y + Phaser.Math.Between(-10, 10),
      'raindrop'
    );

    raindrop.setAlpha(0.6);
    raindrop.setScale(0.5);
    raindrop.setDepth(200);

    // Tween the raindrop falling
    scene.tweens.add({
      targets: raindrop,
      y: raindrop.y + 100,
      alpha: 0,
      duration: duration + Phaser.Math.Between(-300, 300),
      onComplete: () => {
        raindrop.destroy();
      },
    });
  }
}

/**
 * Create leaf falling animation
 */
export function createFallingLeaf(
  scene: Phaser.Scene,
  startX: number = -1,
  startY: number = -1
): void {
  // Use random position if not specified
  const x = startX < 0 ? Phaser.Math.Between(100, scene.cameras.main.width - 100) : startX;
  const y = startY < 0 ? -20 : startY;

  const leaf = scene.add.image(x, y, 'leaf');
  leaf.setAlpha(0.8);
  leaf.setScale(0.3);
  leaf.setAngle(Phaser.Math.Between(0, 360));
  leaf.setDepth(5);

  // Create swaying motion
  scene.tweens.add({
    targets: leaf,
    y: scene.cameras.main.height + 50,
    x: x + Phaser.Math.Between(-100, 100),
    angle: leaf.angle + Phaser.Math.Between(180, 360),
    duration: Phaser.Math.Between(4000, 6000),
    ease: 'Sine.easeInOut',
    onComplete: () => {
      leaf.destroy();
    },
  });
}

/**
 * Create sparkle effect
 */
export function createSparkleEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number = 0xffd700
): void {
  const particles = scene.add.particles(x, y, 'spark', {
    speed: { min: 40, max: 120 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.6, end: 0 },
    blendMode: 'ADD',
    lifespan: 800,
    tint: color,
    quantity: 8,
  });

  // Auto-destroy after animation completes
  scene.time.delayedCall(800, () => {
    particles.destroy();
  });
}
