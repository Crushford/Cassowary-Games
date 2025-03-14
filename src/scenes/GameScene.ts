// src/scenes/GameScene.ts
import { BaseScene } from './BaseScene';
import { GameController } from '../core/GameController';

export class GameScene extends BaseScene {
  private gameController!: GameController;

  constructor() {
    super('GameScene');
  }

  create(): void {
    // Create simple white background
    this.cameras.main.setBackgroundColor(0xffffff);

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
