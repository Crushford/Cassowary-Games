// src/scenes/MainMenuScene.ts
import { BaseScene } from './BaseScene';
import { GAME_CONSTANTS } from '../config/constants';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';

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

    // Create title panel
    const titlePanel = new Panel(this, this.cameras.main.width / 2, 120, {
      width: 600,
      height: 100,
      backgroundColor: GAME_CONSTANTS.COLORS.DARK_GREEN,
      alpha: 0.8,
    });

    // Add title text
    const title = this.createText(0, 0, 'HONEY POT ANT COLONY', '48px', '#FFD700', '#006400', 4);
    title.setShadow(2, 2, '#000000', 5, true);
    titlePanel.addContent(title);

    // Create subtitle
    const subtitle = this.createText(
      this.cameras.main.width / 2,
      190,
      'Strategic Queen Placement',
      '24px',
      '#FFFFFF',
      '#000000',
      2
    );

    // Create start button
    const startButton = new Button(
      this,
      this.cameras.main.width / 2,
      300,
      'Start Game',
      () => this.startGame(),
      {
        width: 220,
        height: 60,
        fontSize: '24px',
        backgroundColor: GAME_CONSTANTS.COLORS.FOREST_GREEN,
        textColor: '#FFD700',
        strokeColor: GAME_CONSTANTS.COLORS.GOLD,
        strokeWidth: 3,
      }
    );

    // Create instructions panel
    const instructionsPanel = new Panel(this, this.cameras.main.width / 2, 500, {
      width: 500,
      height: 200,
      backgroundColor: GAME_CONSTANTS.COLORS.DARK_GREEN,
      alpha: 0.8,
    });

    // Add instructions title
    const instructionsTitle = this.createText(
      0,
      -70,
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

    // Create instruction text objects
    const instructionTexts = instructions.map((text, index) =>
      this.createText(0, -30 + index * 32, text, '18px', '#FFFFFF', '#000000', 1)
    );

    // Add all instruction elements to panel
    instructionsPanel.addContent([instructionsTitle, ...instructionTexts]);

    // Create decorative elements
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

    // Add decorative ants
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
