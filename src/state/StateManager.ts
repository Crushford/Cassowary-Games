import Phaser from 'phaser';
import { CellState } from '../prefabs/Cell';
import { GAME_CONSTANTS } from '../config/constants';

export enum GameState {
  READY = 'ready',
  PLAYING = 'playing',
  GAME_OVER_SUCCESS = 'success',
  GAME_OVER_FAILURE = 'failure',
}

export interface GameResources {
  queens: number;
  gold: number;
  acres: number;
  plots: number;
}

export interface GameStateData {
  state: GameState;
  resources: GameResources;
  statusMessage?: string;
  isStatusError?: boolean;
  selectedCell?: { row: number; col: number } | null;
}

export class StateManager {
  private static instance: StateManager;
  public events: Phaser.Events.EventEmitter;
  private _gameState: GameStateData;

  private constructor() {
    this.events = new Phaser.Events.EventEmitter();
    this._gameState = {
      state: GameState.READY,
      resources: {
        queens: GAME_CONSTANTS.INITIAL_QUEENS,
        gold: GAME_CONSTANTS.INITIAL_GOLD,
        acres: GAME_CONSTANTS.OWNED_ACRES,
        plots: GAME_CONSTANTS.PLOTS,
      },
      statusMessage: 'Welcome to Honey Pot Ant Colony!',
      isStatusError: false,
      selectedCell: null,
    };
  }

  // Singleton pattern to ensure only one instance
  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  // Get the current game state
  public getState(): GameStateData {
    return { ...this._gameState };
  }

  // Update the game state
  public setState(newState: Partial<GameStateData>): void {
    const previousState = { ...this._gameState };
    this._gameState = {
      ...this._gameState,
      ...newState,
    };

    // Emit events for state changes
    if (previousState.state !== this._gameState.state) {
      this.events.emit('state-changed', this._gameState.state, previousState.state);
    }

    if (previousState.resources !== this._gameState.resources) {
      this.events.emit('resources-updated', this._gameState.resources);
    }

    if (previousState.statusMessage !== this._gameState.statusMessage) {
      this.events.emit(
        'status-message',
        this._gameState.statusMessage,
        this._gameState.isStatusError
      );
    }

    if (previousState.selectedCell !== this._gameState.selectedCell) {
      this.events.emit('cell-selected', this._gameState.selectedCell);
    }
  }

  // Update game resources
  public updateResources(resources: Partial<GameResources>): void {
    this.setState({
      resources: {
        ...this._gameState.resources,
        ...resources,
      },
    });
  }

  // Set the game status message
  public setStatusMessage(message: string, isError: boolean = false): void {
    this.setState({
      statusMessage: message,
      isStatusError: isError,
    });
  }

  // Reset the game state
  public resetState(): void {
    this.setState({
      state: GameState.READY,
      resources: {
        queens: GAME_CONSTANTS.INITIAL_QUEENS,
        gold: GAME_CONSTANTS.INITIAL_GOLD,
        acres: GAME_CONSTANTS.OWNED_ACRES,
        plots: GAME_CONSTANTS.PLOTS,
      },
      statusMessage: 'Game reset. Ready to start!',
      isStatusError: false,
      selectedCell: null,
    });
  }
}
