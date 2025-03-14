import { GameState, StateManager } from '../state/StateManager';
import { ResourceManager } from '../state/ResourceManager';
import { RulesManager } from './RulesManager';
import { Board } from '../prefabs/Board';
import { GAME_CONSTANTS } from '../config/constants';

export class GameStateController {
  private stateManager: StateManager;
  private resourceManager: ResourceManager;
  private rulesManager: RulesManager;
  private board: Board;

  constructor(board: Board) {
    this.stateManager = StateManager.getInstance();
    this.resourceManager = new ResourceManager();
    this.rulesManager = new RulesManager(board.size);
    this.board = board;
  }

  // Start a new game
  public startGame(): void {
    // Reset board and resources if needed
    if (
      this.stateManager.getState().state === GameState.GAME_OVER_SUCCESS ||
      this.stateManager.getState().state === GameState.GAME_OVER_FAILURE
    ) {
      this.board.reset();
      this.resourceManager.resetResources();
    }

    // Set game state to playing
    this.stateManager.setState({ state: GameState.PLAYING });
    this.stateManager.setStatusMessage('Place your honey pot queens on the board!', false);
  }

  // Check if the game is over
  public checkGameOver(): void {
    const resources = this.resourceManager.getResources();
    const cellStates = this.board.getCellStates();
    const gameOverCheck = this.rulesManager.checkGameOver(
      { queens: resources.queens, gold: resources.gold },
      cellStates,
      GAME_CONSTANTS.PLOTS
    );

    if (gameOverCheck.isOver) {
      if (gameOverCheck.isVictory) {
        this.stateManager.setState({ state: GameState.GAME_OVER_SUCCESS });
        this.stateManager.setStatusMessage('Victory! Your honey pot ant colony thrives!', false);
        window.gameEvents?.emit('game-complete', true);
      } else {
        this.stateManager.setState({ state: GameState.GAME_OVER_FAILURE });
        this.stateManager.setStatusMessage('Game over! Your colony has failed!', true);
        window.gameEvents?.emit('game-complete', false);
      }
    }
  }

  // Restart the game
  public restartGame(): void {
    // Reset the board
    this.board.reset();

    // Reset resources
    this.resourceManager.resetResources();

    // Reset game state
    this.stateManager.resetState();

    // Update UI with new status
    this.stateManager.setStatusMessage('Game reset. Ready to start!', false);
    window.gameEvents?.emit('game-restart');
  }

  // End turn - check victory/loss conditions
  public endTurn(): void {
    this.checkGameOver();
  }

  // Get current game state
  public getGameState(): GameState {
    return this.stateManager.getState().state;
  }

  // Check if the game is in progress
  public isGameInProgress(): boolean {
    const state = this.stateManager.getState().state;
    return state === GameState.PLAYING || state === GameState.READY;
  }
}
