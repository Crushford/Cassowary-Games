// src/utils/tween.ts
import Phaser from 'phaser';

/**
 * Fade in a game object
 */
export function fadeIn(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  duration: number = 500,
  delay: number = 0,
  onComplete?: () => void
): Phaser.Tweens.Tween {
  // Set initial alpha to 0
  const targets = Array.isArray(target) ? target : [target];
  targets.forEach((obj) => {
    if ('alpha' in obj) {
      obj.alpha = 0;
    }
  });

  // Create the tween
  return scene.tweens.add({
    targets: target,
    alpha: 1,
    duration: duration,
    delay: delay,
    ease: 'Sine.easeOut',
    onComplete: onComplete,
  });
}

/**
 * Fade out a game object
 */
export function fadeOut(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  duration: number = 500,
  delay: number = 0,
  onComplete?: () => void
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    alpha: 0,
    duration: duration,
    delay: delay,
    ease: 'Sine.easeIn',
    onComplete: onComplete,
  });
}

/**
 * Create a pulsing effect on a game object
 */
export function pulse(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  scale: number = 1.2,
  duration: number = 800
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    scaleX: scale,
    scaleY: scale,
    duration: duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

export function bounce(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  amplitude: number = 10,
  duration: number = 1000
): Phaser.Tweens.Tween | undefined {
  const targets = Array.isArray(target) ? target : [target];

  // Check if targets have position properties
  const validTargets: Array<Phaser.GameObjects.GameObject & { y: number }> = [];
  const originalY: number[] = [];

  // Filter only targets that have 'y' property
  targets.forEach((obj) => {
    if ('y' in obj && typeof obj.y === 'number') {
      validTargets.push(obj as Phaser.GameObjects.GameObject & { y: number });
      originalY.push(obj.y);
    } else {
      console.warn('Object passed to bounce() does not have a y property');
    }
  });

  // If no valid targets, return early
  if (validTargets.length === 0) {
    return undefined;
  }

  return scene.tweens.add({
    targets: validTargets,
    y: validTargets.map((_, i) => originalY[i] - amplitude),
    duration: duration / 2,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

/**
 * Create a floating/hovering effect
 */
export function hover(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  distance: number = 5,
  duration: number = 1500
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    y: `-=${distance}`,
    duration: duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

/**
 * Shake a game object
 */
export function shake(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  intensity: number = 5,
  duration: number = 500,
  onComplete?: () => void
): Phaser.Tweens.Tween | undefined {
  const targets = Array.isArray(target) ? target : [target];

  // Check if targets have position properties
  const validTargets: Array<Phaser.GameObjects.GameObject & { x: number }> = [];
  const originalX: number[] = [];

  // Filter only targets that have 'x' property
  targets.forEach((obj) => {
    if ('x' in obj && typeof obj.x === 'number') {
      validTargets.push(obj as Phaser.GameObjects.GameObject & { x: number });
      originalX.push(obj.x);
    } else {
      console.warn('Object passed to shake() does not have an x property');
    }
  });

  // If no valid targets, return early
  if (validTargets.length === 0) {
    return undefined;
  }

  // Create a counter for tracking shake steps
  let shakeCount = 0;
  const shakeSteps = 10;

  // Create initial shake
  const tween = scene.tweens.add({
    targets: validTargets,
    x: validTargets.map((_, idx) => originalX[idx] + Phaser.Math.Between(-intensity, intensity)),
    duration: duration / shakeSteps,
    ease: 'Power0',
    onComplete: nextShake,
  });

  // Function to handle the next shake step
  function nextShake() {
    shakeCount++;

    if (shakeCount < shakeSteps) {
      // Continue shaking
      scene.tweens.add({
        targets: validTargets,
        x: validTargets.map(
          (_, idx) => originalX[idx] + Phaser.Math.Between(-intensity, intensity)
        ),
        duration: duration / shakeSteps,
        ease: 'Power0',
        onComplete: nextShake,
      });
    } else {
      // Final step to return to original position
      scene.tweens.add({
        targets: validTargets,
        x: originalX,
        duration: duration / shakeSteps,
        ease: 'Power0',
        onComplete: onComplete,
      });
    }
  }

  return tween;
}

export default {
  fadeIn,
  fadeOut,
  pulse,
  bounce,
  hover,
  shake,
};
