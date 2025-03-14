import Phaser from 'phaser';

/**
 * Helper class for common animation tweens
 */
export default class TweenHelper {
  /**
   * Create a bounce effect on a game object
   */
  static bounce(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    duration: number = 100,
    scale: number = 1.2
  ): Phaser.Tweens.Tween {
    return scene.tweens.add({
      targets: target,
      scaleX: { from: 1, to: scale },
      scaleY: { from: 1, to: scale },
      ease: 'Bounce.easeOut',
      duration: duration,
      repeat: 0,
      yoyo: true,
    });
  }

  /**
   * Create a pulse effect (fade in/out) on a game object
   */
  static pulse(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    duration: number = 700,
    repeat: number = -1
  ): Phaser.Tweens.Tween {
    return scene.tweens.add({
      targets: target,
      alpha: { from: 0.6, to: 1 },
      ease: 'Sine.easeInOut',
      duration: duration,
      repeat: repeat,
      yoyo: true,
    });
  }

  /**
   * Create a fade in effect
   */
  static fadeIn(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.GameObject,
    duration: number = 300
  ): Phaser.Tweens.Tween {
    target.alpha = 0;
    return scene.tweens.add({
      targets: target,
      alpha: { from: 0, to: 1 },
      ease: 'Power1',
      duration: duration,
    });
  }

  /**
   * Create a fade out effect
   */
  static fadeOut(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    duration: number = 300
  ): Phaser.Tweens.Tween {
    return scene.tweens.add({
      targets: target,
      alpha: { from: 1, to: 0 },
      ease: 'Power1',
      duration: duration,
    });
  }

  /**
   * Create a shake effect
   */
  static shake(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    duration: number = 100,
    intensity: number = 5
  ): Phaser.Tweens.Tween {
    const originalX = target.x;
    const originalY = target.y;

    return scene.tweens.add({
      targets: target,
      x: { from: originalX - intensity, to: originalX + intensity },
      y: { from: originalY - intensity, to: originalY + intensity },
      ease: 'Power1',
      duration: duration,
      repeat: 3,
      yoyo: true,
      onComplete: () => {
        target.x = originalX;
        target.y = originalY;
      },
    });
  }
}
