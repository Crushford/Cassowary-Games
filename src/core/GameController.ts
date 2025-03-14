// src/core/GameController.ts
import { Board } from '../prefabs/Board';
import { BoardInteractionManager } from './BoardInteractionManager';
import { GameStateController } from './GameStateController';

/**
 * Main game controller that coordinates all game components
 */
export class GameController {
  private board: Board;
  private boardInteractionManager: BoardInteractionManager;
  private gameStateController: GameStateController;

  constructor(scene: Phaser.Scene) {
    // Create the board
    this.board = new Board(scene);

    // Create the interaction manager
    this.boardInteractionManager = new BoardInteractionManager(this.board);

    // Create the game state controller
    this.gameStateController = new GameStateController(this.board);

    // Listen for global events
    this.setupEventListeners();
  }

  // Initialize the game
  public init(): void {
    // Start the game
    this.gameStateController.startGame();
  }

  // Setup global event listeners
  private setupEventListeners(): void {
    // Listen for restart event
    if (window.gameEvents) {
      window.gameEvents.on('restart-game', () => {
        this.restartGame();
      });
    }
  }

  // Restart the game
  public restartGame(): void {
    this.gameStateController.restartGame();
  }

  // Clean up event listeners and resources
  public destroy(): void {
    if (window.gameEvents) {
      window.gameEvents.off('restart-game');
    }
  }
}
