import { Board } from '../prefabs/Board';
import { Cell, CellState } from '../prefabs/Cell';
import { StateManager } from '../state/StateManager';
import { ResourceManager } from '../state/ResourceManager';
import { RulesManager } from './RulesManager';

export class BoardInteractionManager {
  private board: Board;
  private stateManager: StateManager;
  private resourceManager: ResourceManager;
  private rulesManager: RulesManager;

  constructor(board: Board) {
    this.board = board;
    this.stateManager = StateManager.getInstance();
    this.resourceManager = new ResourceManager();
    this.rulesManager = new RulesManager(board.size);

    // Setup click handler for the board
    this.board.setClickHandler((cell) => this.handleCellClick(cell));
  }

  // Handle cell clicks
  public handleCellClick(cell: Cell): void {
    const gameState = this.stateManager.getState();
    if (gameState.state !== 'playing' && gameState.state !== 'ready') {
      return;
    }

    const { row, col } = cell.gridPosition;

    switch (cell.cellState) {
      case CellState.EMPTY:
        this.handleEmptyCellClick(row, col);
        break;

      case CellState.FLAGGED:
        this.handleFlaggedCellClick(row, col);
        break;

      case CellState.QUEEN:
        this.handleQueenCellClick(row, col);
        break;

      case CellState.THREATENED:
        this.stateManager.setStatusMessage('This position is threatened by another queen!', true);
        break;
    }
  }

  // Handle clicking on an empty cell
  private handleEmptyCellClick(row: number, col: number): void {
    // Place a flag on the cell
    this.board.placeFlag(row, col);

    // Check if position is threatened by existing queens
    const cellStates = this.board.getCellStates();
    const queens = this.board.getCellsInState(CellState.QUEEN);

    let isThreatened = false;
    for (const queen of queens) {
      const { row: qRow, col: qCol } = queen.gridPosition;
      const threatened = this.rulesManager.getThreatenedPositions(qRow, qCol, cellStates);
      if (threatened.some((pos) => pos.row === row && pos.col === col)) {
        isThreatened = true;
        break;
      }
    }

    // Show appropriate message based on whether position is threatened
    if (isThreatened) {
      this.stateManager.setStatusMessage('Soldier ants will attack any queen placed here!', true);
    } else {
      this.stateManager.setStatusMessage('Click again to place a honey pot queen here.', false);
    }
  }

  // Handle clicking on a flagged cell
  private handleFlaggedCellClick(row: number, col: number): void {
    // Remove flag
    this.board.removeFlag(row, col);

    // Try to place a queen if we have resources
    if (this.resourceManager.hasQueensAvailable()) {
      this.tryPlaceQueen(row, col);
    } else {
      this.stateManager.setStatusMessage('Not enough honey pot queens available!', true);
    }
  }

  // Handle clicking on a queen cell
  private handleQueenCellClick(row: number, col: number): void {
    // Remove queen
    if (this.board.removeQueen(row, col)) {
      this.resourceManager.refundQueen();
      this.stateManager.setStatusMessage('Honey pot queen removed!', false);

      // Update threatened cells
      this.updateThreatenedCells();
    }
  }

  // Try to place a queen at the given position
  private tryPlaceQueen(row: number, col: number): boolean {
    const cellStates = this.board.getCellStates();

    // Check if placement is valid
    if (!this.rulesManager.isValidQueenPlacement(row, col, cellStates)) {
      this.stateManager.setStatusMessage('Cannot place a queen in a threatened position!', true);
      return false;
    }

    // Place the queen
    if (this.board.placeQueen(row, col)) {
      this.resourceManager.spendQueen();
      this.stateManager.setStatusMessage('Honey pot queen placed!', false);

      // Update threatened cells
      this.updateThreatenedCells();

      return true;
    }

    return false;
  }

  // Update all threatened cells based on current queen positions
  private updateThreatenedCells(): void {
    const cellStates = this.board.getCellStates();
    const queens = this.board.getCellsInState(CellState.QUEEN);

    // Clear all threatened markers first
    this.board.clearThreatenedCells();

    // For each queen, mark the threatened cells
    for (const queen of queens) {
      const { row, col } = queen.gridPosition;
      const threatened = this.rulesManager.getThreatenedPositions(row, col, cellStates);

      for (const pos of threatened) {
        const cell = this.board.getCell(pos.row, pos.col);
        if (cell && cell.cellState === CellState.EMPTY) {
          cell.markThreatened(true);
        }
      }
    }
  }

  // Reset the board
  public resetBoard(): void {
    this.board.reset();
    this.resourceManager.resetResources();
    this.stateManager.setStatusMessage('Game reset. Ready to start!', false);
  }
}
