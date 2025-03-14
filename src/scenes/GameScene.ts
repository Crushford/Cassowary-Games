// src/scenes/GameScene.ts
import { BaseScene } from './BaseScene';
import { GameController } from '../core/GameController';
import { GAME_CONSTANTS } from '../config/constants';

export class GameScene extends BaseScene {
  private gameController!: GameController;

  constructor() {
    super('GameScene');
  }

  create(): void {
    // Create a clean white background for the game area
    this.cameras.main.setBackgroundColor(0xffffff);

    // Draw grid area background
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(
      0,
      GAME_CONSTANTS.UI.LAYOUT.TOP_BAR_HEIGHT,
      this.cameras.main.width,
      this.cameras.main.height -
        GAME_CONSTANTS.UI.LAYOUT.TOP_BAR_HEIGHT -
        GAME_CONSTANTS.UI.LAYOUT.BOTTOM_BAR_HEIGHT
    );

    // Initialize game controller
    this.gameController = new GameController(this);
    this.gameController.init();
  }

  shutdown(): void {
    // Clean up controller
    if (this.gameController) {
      this.gameController.destroy();
    }
  }
}
