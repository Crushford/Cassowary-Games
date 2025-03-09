// src/managers/GameManager.ts
import Phaser from 'phaser';
import { Board } from '../prefabs/Board';
import { Cell, CellState } from '../prefabs/Cell';
import { RulesManager } from './RulesManager';
import { GAME_CONSTANTS } from '../config/constants';

export enum GameState {
  READY = 'ready',
  PLAYING = 'playing',
  GAME_OVER_SUCCESS = 'success',
  GAME_OVER_FAILURE = 'failure',
}

export class GameManager {
  private board: Board;
  private rules: RulesManager;
  private gameState: GameState = GameState.READY;
  private resources = {
    queens: GAME_CONSTANTS.INITIAL_QUEENS,
    gold: GAME_CONSTANTS.INITIAL_GOLD,
    acres: GAME_CONSTANTS.OWNED_ACRES,
    plots: GAME_CONSTANTS.PLOTS,
  };
  public scene: Phaser.Scene;
  public events: Phaser.Events.EventEmitter;

  constructor(scene: Phaser.Scene, board: Board) {
    this.scene = scene;
    this.board = board;
    this.rules = new RulesManager(board.size);
    this.events = new Phaser.Events.EventEmitter();

    // Setup cell click handling
    this.board.setClickHandler((cell) => this.handleCellClick(cell));

    // Set initial game state
    this.setState(GameState.READY);
  }

  // Handle cell clicks
  private handleCellClick(cell: Cell): void {
    if (this.gameState !== GameState.PLAYING && this.gameState !== GameState.READY) {
      return;
    }

    if (this.gameState === GameState.READY) {
      this.setState(GameState.PLAYING);
    }

    const { row, col } = cell.gridPosition;

    switch (cell.cellState) {
      case CellState.EMPTY:
        // Place a flag (threatened position)
        this.board.placeFlag(row, col);
        this.events.emit('status-message', 'Soldier ants will attack any queen placed here!', true);
        break;

      case CellState.FLAGGED:
        // Remove flag and try to place queen
        this.board.removeFlag(row, col);
        if (this.resources.queens > 0) {
          this.tryPlaceQueen(row, col);
        } else {
          this.events.emit('status-message', 'Not enough honey pot queens available!', true);
        }
        break;

      case CellState.QUEEN:
        // Remove queen
        if (this.board.removeQueen(row, col)) {
          this.resources.queens++;
          this.events.emit('resources-updated', this.resources);
          this.events.emit('status-message', 'Honey pot queen removed!', true);

          // Recalculate threatened positions
          this.board.clearAllFlags();
          this.updateAllThreatenedPositions();
        }
        break;
    }
  }

  // Try to place a queen at the given position
  private tryPlaceQueen(row: number, col: number): void {
    const cellStates = this.board.getCellStates();

    // Check if queen placement is valid
    if (this.rules.isValidQueenPlacement(row, col, cellStates)) {
      // Place queen
      this.board.placeQueen(row, col);
      this.resources.queens--;

      // Update UI and resources
      this.events.emit('queen-placed', this.board.queenCount);
      this.events.emit('resources-updated', this.resources);
      this.events.emit(
        'status-message',
        'Honey pot queen placed! She emits pheromones to control territory.',
        true
      );

      // Mark threatened positions
      this.markThreatenedPositions(row, col);

      // Show visual effects
      this.events.emit('queen-placement-effect', { row, col });

      // Check for no more valid moves
      if (this.board.queenCount > 0) {
        this.checkForNoValidMoves();
      }
    } else {
      // Invalid placement - game over
      this.events.emit('queen-death-effect', { row, col });
      this.endGame(false);
    }
  }

  // Mark all positions threatened by a queen
  private markThreatenedPositions(queenRow: number, queenCol: number): void {
    const cellStates = this.board.getCellStates();
    const threatened = this.rules.getThreatenedPositions(queenRow, queenCol, cellStates);

    threatened.forEach(({ row, col }) => {
      this.board.placeFlag(row, col);
    });
  }

  // Update all threatened positions
  private updateAllThreatenedPositions(): void {
    const queens = this.board.getCellsInState(CellState.QUEEN);
    queens.forEach((queen) => {
      const { row, col } = queen.gridPosition;
      this.markThreatenedPositions(row, col);
    });
  }

  // Check if there are no more valid moves
  private checkForNoValidMoves(): void {
    const cellStates = this.board.getCellStates();
    if (!this.rules.hasValidMoves(cellStates)) {
      this.endGame(true);
    }
  }

  // End the game
  private endGame(success: boolean): void {
    this.setState(success ? GameState.GAME_OVER_SUCCESS : GameState.GAME_OVER_FAILURE);

    if (success) {
      this.events.emit('status-message', 'Amazing! Your honey pot ant colony is thriving!');
      this.events.emit('success-effect');
    } else {
      this.events.emit('status-message', 'Oh no! The soldier ants attacked your queens!');
    }

    this.events.emit('game-over', {
      success,
      score: this.board.queenCount,
      resources: this.resources,
    });
  }

  // Restart the game
  public restartGame(): void {
    this.board.resetBoard();
    this.resetResources();
    this.setState(GameState.READY);
    this.events.emit(
      'status-message',
      'Place honey pot queens strategically to build your colony!'
    );
    this.events.emit('game-restarted');
  }

  // Reset resources
  private resetResources(): void {
    this.resources = {
      queens: GAME_CONSTANTS.INITIAL_QUEENS,
      gold: GAME_CONSTANTS.INITIAL_GOLD,
      acres: GAME_CONSTANTS.OWNED_ACRES,
      plots: GAME_CONSTANTS.PLOTS,
    };
    this.events.emit('resources-updated', this.resources);
  }

  // Set game state
  private setState(state: GameState): void {
    this.gameState = state;
    this.events.emit('state-changed', state);
  }

  // Get current resources
  public getResources() {
    return { ...this.resources };
  }

  // Get current game state
  public getState(): GameState {
    return this.gameState;
  }
}
