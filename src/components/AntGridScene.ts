// At the top of your AntGridScene.ts file
import Phaser from 'phaser';
import { AntBoard } from './AntBoard'; // Make sure the path is correct
import { QueenRules } from './QueenRules'; // Make sure the path is correct
import { AntGameUI } from './AntGameUI'; // Make sure the path is correct

export enum CellState {
  EMPTY = 0,
  FLAG = 1,
  QUEEN = 2,
}

export class AntGridScene extends Phaser.Scene {
  private ui!: AntGameUI;
  private board!: AntBoard;
  private rules!: QueenRules;
  private gameOver: boolean = false;

  constructor() {
    super({ key: 'AntGridScene' });
  }

  preload(): void {
    // Load assets for flags and queens
    this.load.image('flag', 'https://examples.phaser.io/assets/sprites/red_ball.png');
    this.load.image('queen', 'https://examples.phaser.io/assets/sprites/phaser-dude.png');
    this.load.image('background', 'https://examples.phaser.io/assets/skies/sky3.png');
  }

  create(): void {
    // Add background
    this.add.image(400, 300, 'background');

    // Initialize game components
    this.ui = new AntGameUI(this);
    this.ui.setupRestartButton(() => this.restartGame());

    this.board = new AntBoard(
      this,
      (count) => this.handleQueenCountChanged(count),
      (row, col) => this.handleCellClick(row, col)
    );

    this.rules = new QueenRules(this.board.getGridSize);
    this.gameOver = false;

    // Emit game started event
    if (window.gameEvents) {
      window.gameEvents.emit('gameStarted');
    }
  }

  handleQueenCountChanged(count: number): void {
    this.ui.updateScore(count);

    // Emit score changed event
    if (window.gameEvents) {
      window.gameEvents.emit('scoreChanged', count);
    }
  }

  handleCellClick(row: number, col: number): void {
    if (this.gameOver) return;

    // Toggle cell state: EMPTY -> FLAG -> QUEEN -> EMPTY
    const currentState = this.board.getCellState(row, col);

    switch (currentState) {
      case CellState.EMPTY:
        this.board.placeFlag(row, col);
        break;
      case CellState.FLAG:
        this.board.removeFlag(row, col);
        this.tryPlaceQueen(row, col);

        // Check for no more valid moves after queen placement
        if (!this.gameOver && this.board.getQueensPlaced > 0) {
          this.checkForNoValidMoves();
        }
        break;
      case CellState.QUEEN:
        this.board.removeQueen(row, col);
        // Remove all flags and recalculate threatened positions
        this.board.clearAllFlags();
        this.updateAllThreatenedPositions();
        break;
    }
  }

  tryPlaceQueen(row: number, col: number): void {
    // Get cell states for rules checking
    const cellStates = Array(this.board.getGridSize)
      .fill(0)
      .map((_, r) =>
        Array(this.board.getGridSize)
          .fill(0)
          .map((_, c) => this.board.getCellState(r, c))
      );

    // Check if queen placement is valid
    if (this.rules.isValidQueenPlacement(row, col, cellStates)) {
      this.board.placeQueen(row, col);

      // Place flags in threatened positions
      this.markThreatenedPositions(row, col);
    } else {
      // Game over - invalid queen placement
      this.endGame();
    }
  }

  markThreatenedPositions(queenRow: number, queenCol: number): void {
    // Get cell states for rules checking
    const cellStates = Array(this.board.getGridSize)
      .fill(0)
      .map((_, r) =>
        Array(this.board.getGridSize)
          .fill(0)
          .map((_, c) => this.board.getCellState(r, c))
      );

    // Get threatened positions
    const threatened = this.rules.getThreatenedPositions(queenRow, queenCol, cellStates);

    // Place flags on threatened positions
    threatened.forEach((pos) => {
      this.board.placeFlag(pos.row, pos.col);
    });
  }

  updateAllThreatenedPositions(): void {
    // Mark all cells threatened by current queens
    for (let row = 0; row < this.board.getGridSize; row++) {
      for (let col = 0; col < this.board.getGridSize; col++) {
        if (this.board.getCellState(row, col) === CellState.QUEEN) {
          this.markThreatenedPositions(row, col);
        }
      }
    }
  }

  checkForNoValidMoves(): void {
    // Get cell states for rules checking
    const cellStates = Array(this.board.getGridSize)
      .fill(0)
      .map((_, r) =>
        Array(this.board.getGridSize)
          .fill(0)
          .map((_, c) => this.board.getCellState(r, c))
      );

    if (!this.rules.hasValidMoves(cellStates)) {
      this.endGame(true); // Success - no more valid moves
    }
  }

  endGame(success: boolean = false): void {
    this.gameOver = true;

    this.ui.showGameOver(success, this.board.getQueensPlaced);

    // Emit game over event
    if (window.gameEvents) {
      window.gameEvents.emit('gameOver', {
        success: success,
        score: this.board.getQueensPlaced,
      });
    }
  }

  restartGame(): void {
    this.board.resetBoard();
    this.gameOver = false;
    this.ui.hideGameOver();

    // Emit game restart event
    if (window.gameEvents) {
      window.gameEvents.emit('gameRestarted');
    }
  }
}

// Add global type definitions
declare global {
  interface Window {
    gameEvents?: Phaser.Events.EventEmitter;
  }
}
