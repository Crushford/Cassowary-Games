// src/components/RainforestAmbiance.ts
import Phaser from 'phaser';

export class RainforestAmbiance {
  private scene: Phaser.Scene;
  private raindrops: Phaser.GameObjects.Image[] = [];
  private leaves: Phaser.GameObjects.Image[] = [];
  private rainTimer!: Phaser.Time.TimerEvent;
  private leavesTimer!: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createBackground();
    this.startAmbiance();
  }

  private createBackground(): void {
    // Create rainforest background with a darker tint for more atmosphere
    const bg = this.scene.add.image(400, 300, 'rainforest');
    bg.setTint(0x88aa88); // Give a slight green tint for rainforest feel
  }

  private startAmbiance(): void {
    // Create occasional falling raindrops
    this.rainTimer = this.scene.time.addEvent({
      delay: 800,
      callback: this.createRaindrop,
      callbackScope: this,
      loop: true,
    });

    // Create occasional falling leaves
    this.leavesTimer = this.scene.time.addEvent({
      delay: 3000,
      callback: this.createLeaf,
      callbackScope: this,
      loop: true,
    });
  }

  private createRaindrop(): void {
    if (this.raindrops.length > 10) return; // Limit number of raindrops

    const x = Phaser.Math.Between(0, this.scene.cameras.main.width);
    const raindrop = this.scene.add.image(x, -20, 'raindrop');
    raindrop.setAlpha(0.6);
    raindrop.setScale(0.5);

    this.raindrops.push(raindrop);

    this.scene.tweens.add({
      targets: raindrop,
      y: this.scene.cameras.main.height + 50,
      duration: Phaser.Math.Between(1500, 2500),
      onComplete: () => {
        // Remove raindrop from array and destroy
        const index = this.raindrops.indexOf(raindrop);
        if (index > -1) {
          this.raindrops.splice(index, 1);
        }
        raindrop.destroy();
      },
    });
  }

  private createLeaf(): void {
    if (this.leaves.length > 5) return; // Limit number of leaves

    const x = Phaser.Math.Between(0, this.scene.cameras.main.width);
    const leaf = this.scene.add.image(x, -20, 'leaf');
    leaf.setAlpha(0.8);
    leaf.setScale(0.3);
    leaf.setAngle(Phaser.Math.Between(0, 360));

    this.leaves.push(leaf);

    this.scene.tweens.add({
      targets: leaf,
      y: this.scene.cameras.main.height + 50,
      x: x + Phaser.Math.Between(-100, 100),
      angle: leaf.angle + Phaser.Math.Between(180, 360),
      duration: Phaser.Math.Between(4000, 6000),
      onComplete: () => {
        // Remove leaf from array and destroy
        const index = this.leaves.indexOf(leaf);
        if (index > -1) {
          this.leaves.splice(index, 1);
        }
        leaf.destroy();
      },
    });
  }

  public destroy(): void {
    if (this.rainTimer) this.rainTimer.destroy();
    if (this.leavesTimer) this.leavesTimer.destroy();

    // Clean up existing raindrops and leaves
    this.raindrops.forEach((raindrop) => raindrop.destroy());
    this.leaves.forEach((leaf) => leaf.destroy());

    this.raindrops = [];
    this.leaves = [];
  }
}
