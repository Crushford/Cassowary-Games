// src/scenes/MainMenuScene.ts
import { BaseScene } from './BaseScene';
import { GAME_CONSTANTS } from '../config/constants';

export class MainMenuScene extends BaseScene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    // Create rainforest background
    this.createBackground('rainforest');

    // Apply a dark green tint to background for more atmosphere
    const bg = this.children
      .getAll()
      .find((child) => child.type === 'Image') as Phaser.GameObjects.Image;
    if (bg) {
      bg.setTint(0x88aa88);
    }

    // Create title
    const title = this.createText(
      this.cameras.main.width / 2,
      120,
      'HONEY POT ANT COLONY',
      '48px',
      '#FFD700',
      '#006400',
      4
    );
    title.setShadow(2, 2, '#000000', 5, true);

    // Create subtitle
    this.createText(
      this.cameras.main.width / 2,
      190,
      'Strategic Queen Placement',
      '24px',
      '#FFFFFF',
      '#000000',
      2
    );

    // Create start button
    const startButton = this.add.container(this.cameras.main.width / 2, 300);

    const buttonBg = this.add.rectangle(0, 0, 220, 60, GAME_CONSTANTS.COLORS.FOREST_GREEN);
    buttonBg.setStrokeStyle(3, GAME_CONSTANTS.COLORS.GOLD);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.createText(0, 0, 'Start Game', '24px', '#FFD700');

    startButton.add([buttonBg, buttonText]);

    // Button hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.fillColor = GAME_CONSTANTS.COLORS.LIGHT_GREEN;
    });

    buttonBg.on('pointerout', () => {
      buttonBg.fillColor = GAME_CONSTANTS.COLORS.FOREST_GREEN;
    });

    // Start game on click
    buttonBg.on('pointerdown', () => {
      this.startGame();
    });

    // Create how to play section
    this.createText(
      this.cameras.main.width / 2,
      400,
      'How to Play:',
      '28px',
      '#FFFFFF',
      '#000000',
      2
    );

    const instructions = [
      'Place queens strategically to claim territory',
      'Queens cannot threaten each other',
      'Fill the grid with queens to succeed',
      'Invalid placement will end your colony',
    ];

    instructions.forEach((text, index) => {
      this.createText(
        this.cameras.main.width / 2,
        450 + index * 32,
        text,
        '18px',
        '#FFFFFF',
        '#000000',
        1
      );
    });

    // Create decorative ants
    this.createDecorativeElements();
  }

  private createDecorativeElements(): void {
    // Add some animated leaves falling
    for (let i = 0; i < 5; i++) {
      const leaf = this.add.image(
        Phaser.Math.Between(100, this.cameras.main.width - 100),
        Phaser.Math.Between(-100, -300),
        'leaf'
      );
      leaf.setScale(0.3);
      leaf.setAlpha(0.8);

      this.tweens.add({
        targets: leaf,
        y: this.cameras.main.height + 100,
        x: leaf.x + Phaser.Math.Between(-150, 150),
        angle: Phaser.Math.Between(180, 360),
        duration: Phaser.Math.Between(6000, 10000),
        ease: 'Sine.easeInOut',
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      });
    }

    // Add a decorative queen ant
    const queen = this.add.image(150, 520, 'honey-queen');
    queen.setScale(1.2);

    this.tweens.add({
      targets: queen,
      y: queen.y - 10,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Add a decorative soldier ant
    const soldier = this.add.image(this.cameras.main.width - 150, 520, 'soldier-ant');
    soldier.setScale(0.8);

    this.tweens.add({
      targets: soldier,
      angle: 15,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startGame(): void {
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
