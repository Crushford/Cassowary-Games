// src/components/GameController.ts
import Phaser from 'phaser';
import { AntBoard } from './AntBoard';
import { QueenRules } from './QueenRules';
import { AntGameUI } from './AntGameUI';
import { GameResources } from './GameResources';
import { GameVisualEffects } from './GameVisualEffects';
import { CellState } from './AntGridScene';

export class GameController {
  private scene: Phaser.Scene;
  private board: AntBoard;
  private rules: QueenRules;
  private ui: AntGameUI;
  private resources: GameResources;
  private effects: GameVisualEffects;
  private gameOver: boolean = false;

  constructor(scene: Phaser.Scene, resources: GameResources, ui: AntGameUI) {
    this.scene = scene;
    this.resources = resources;
    this.ui = ui;
    this.effects = new GameVisualEffects(scene);

    // Initialize board and rules
    this.board = new AntBoard(
      scene,
      (count) => this.handleQueenCountChanged(count),
      (row, col) => this.handleCellClick(row, col)
    );

    this.rules = new QueenRules(this.board.getGridSize);
    this.ui.setupRestartButton(() => this.restartGame());
  }

  private handleQueenCountChanged(count: number): void {
    this.ui.updateScore(count);
    this.ui.updateResources();

    // Emit score changed event
    if (window.gameEvents) {
      window.gameEvents.emit('scoreChanged', count);
    }
  }

  public handleCellClick(row: number, col: number): void {
    if (this.gameOver) return;

    // Toggle cell state: EMPTY -> FLAG -> QUEEN -> EMPTY
    const currentState = this.board.getCellState(row, col);
    const cellX = (this.scene.cameras.main.width - this.board.getGridSize * 80) / 2 + col * 80 + 40;
    const cellY =
      (this.scene.cameras.main.height - this.board.getGridSize * 80) / 2 + row * 80 + 40 + 20;

    switch (currentState) {
      case CellState.EMPTY:
        this.board.placeFlag(row, col);
        this.ui.updateStatusText('Soldier ants will attack any queen placed here!', true);
        break;

      case CellState.FLAG:
        this.board.removeFlag(row, col);
        if (this.resources.useQueen()) {
          this.tryPlaceQueen(row, col, cellX, cellY);
          this.ui.updateResources();

          // Check for no more valid moves after queen placement
          if (!this.gameOver && this.board.getQueensPlaced > 0) {
            this.checkForNoValidMoves();
          }
        } else {
          this.ui.updateStatusText('Not enough honey pot queens available!', true);
        }
        break;

      case CellState.QUEEN:
        if (this.board.removeQueen(row, col)) {
          this.resources.returnQueen();
          this.ui.updateResources();
          this.ui.updateStatusText('Honey pot queen removed!', true);

          // Remove all flags and recalculate threatened positions
          this.board.clearAllFlags();
          this.updateAllThreatenedPositions();
        }
        break;
    }
  }

  private tryPlaceQueen(row: number, col: number, cellX: number, cellY: number): void {
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
      this.ui.updateStatusText(
        'Honey pot queen placed! She emits pheromones to control territory.',
        true
      );

      // Place flags in threatened positions
      this.markThreatenedPositions(row, col);

      // Show visual effects
      this.effects.showQueenPlacementEffect(cellX, cellY);
      this.effects.showGoldCoinAnimation();
    } else {
      // Game over - invalid queen placement
      this.effects.showQueenDeathEffect(cellX, cellY);
      this.endGame();
    }
  }

  private markThreatenedPositions(queenRow: number, queenCol: number): void {
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

  private updateAllThreatenedPositions(): void {
    // Mark all cells threatened by current queens
    for (let row = 0; row < this.board.getGridSize; row++) {
      for (let col = 0; col < this.board.getGridSize; col++) {
        if (this.board.getCellState(row, col) === CellState.QUEEN) {
          this.markThreatenedPositions(row, col);
        }
      }
    }
  }

  private checkForNoValidMoves(): void {
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

  public endGame(success: boolean = false): void {
    this.gameOver = true;

    if (success) {
      this.ui.updateStatusText('Amazing! Your honey pot ant colony is thriving!');
      this.effects.showSuccessEffect();
    } else {
      this.ui.updateStatusText('Oh no! The soldier ants attacked your queens!');
    }

    this.ui.showGameOver(success, this.board.getQueensPlaced);

    // Emit game over event
    if (window.gameEvents) {
      window.gameEvents.emit('gameOver', {
        success: success,
        score: this.board.getQueensPlaced,
      });
    }
  }

  public restartGame(): void {
    this.board.resetBoard();
    this.gameOver = false;
    this.resources.resetResources();
    this.ui.updateResources();
    this.ui.hideGameOver();
    this.ui.updateStatusText('Place honey pot queens strategically to build your colony!');

    // Emit game restart event
    if (window.gameEvents) {
      window.gameEvents.emit('gameRestarted');
    }
  }
}
