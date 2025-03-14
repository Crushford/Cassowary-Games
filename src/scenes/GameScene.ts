// src/scenes/GameScene.ts
import { BaseScene } from './BaseScene';
import { Board } from '../prefabs/Board';
import { GameManager, GameState } from '../managers/GameManager';
import { Cell } from '../prefabs/Cell';

export class GameScene extends BaseScene {
  private board!: Board;
  private gameManager!: GameManager;

  constructor() {
    super('GameScene');
  }

  create(): void {
    // Create simple white background
    this.cameras.main.setBackgroundColor(0xffffff);

    // Initialize game board
    this.board = new Board(this);

    // Initialize game manager
    this.gameManager = new GameManager(this, this.board);

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (window.gameEvents) {
      // Listen for restart from UI buttons
      window.gameEvents.on('restart-game', () => {
        if (this.gameManager) {
          this.gameManager.restartGame();
        }
      });
    }
  }

  private getWorldPosition(cell: Cell): { x: number; y: number } {
    // Convert cell container position to world position
    const worldX = this.board.x + cell.x;
    const worldY = this.board.y + cell.y;
    return { x: worldX, y: worldY };
  }

  shutdown(): void {
    // Clean up event listeners
    if (window.gameEvents) {
      window.gameEvents.off('restart-game');
    }

    if (this.gameManager) {
      this.gameManager.events.removeAllListeners();
    }
  }
}
