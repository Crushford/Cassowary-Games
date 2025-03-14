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
    // Create white background
    this.cameras.main.setBackgroundColor(0xffffff);

    // Create title panel
    const titlePanel = new Panel(this, this.cameras.main.width / 2, 120, {
      width: 600,
      height: 100,
      backgroundColor: 0xffffff,
      alpha: 1.0,
    });

    // Add title text
    const title = this.createText(0, 0, 'HONEY POT ANT COLONY', '48px', '#000000', '#000000', 1);
    titlePanel.addContent(title);

    // Create subtitle
    const subtitle = this.createText(
      this.cameras.main.width / 2,
      190,
      'Strategic Queen Placement',
      '24px',
      '#000000',
      '#000000',
      1
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
        backgroundColor: 0xffffff,
        textColor: '#000000',
        strokeColor: 0x000000,
        strokeWidth: 2,
      }
    );

    // Create instructions panel
    const instructionsPanel = new Panel(this, this.cameras.main.width / 2, 500, {
      width: 500,
      height: 200,
      backgroundColor: 0xffffff,
      alpha: 1.0,
    });

    // Add instructions title
    const instructionsTitle = this.createText(
      0,
      -70,
      'How to Play:',
      '28px',
      '#000000',
      '#000000',
      1
    );

    // Add instructions text
    const instructions = this.createText(
      0,
      0,
      'Place honey pot queens on the board to expand your colony.\nQueens cannot threaten each other.\nFill the board with as many queens as possible!',
      '18px',
      '#000000',
      '#000000',
      1
    );

    // Add elements to panel
    instructionsPanel.addContent([instructionsTitle, instructions]);
  }

  private startGame(): void {
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
