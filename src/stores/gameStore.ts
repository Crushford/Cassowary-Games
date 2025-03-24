import { defineStore } from 'pinia';
import type { GridSquare } from '../components/GameGrid.vue';

interface GameState {
  grid: GridSquare[][];
  gridSize: number;
  moveHistory: { grid: GridSquare[][] }[];
  currentLevel: number;
  availableMoves: { row: number; col: number }[];
  isComplete: boolean;
  errorMessage: string | null;
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    grid: Array(6)
      .fill(null)
      .map(() =>
        Array(6)
          .fill(null)
          .map(() => ({ state: 'empty' }))
      ),
    gridSize: 6,
    moveHistory: [],
    currentLevel: 1,
    availableMoves: [],
    isComplete: false,
    errorMessage: null,
  }),

  getters: {
    // Get all positions where queens are placed
    queenPositions: (state): { row: number; col: number }[] => {
      const positions: { row: number; col: number }[] = [];
      for (let row = 0; row < state.gridSize; row++) {
        for (let col = 0; col < state.gridSize; col++) {
          if (state.grid[row][col].state === 'queen') {
            positions.push({ row, col });
          }
        }
      }
      return positions;
    },

    isValidMove: (state) => (row: number, col: number) => {
      const square = state.grid[row][col];

      // Check if there's a queen in the same row or column
      for (let i = 0; i < state.gridSize; i++) {
        if (state.grid[row][i].state === 'queen' || state.grid[i][col].state === 'queen') {
          return false;
        }
      }

      // Check diagonally adjacent squares (one square away)
      const diagonalPositions = [
        { r: row - 1, c: col - 1 }, // top-left
        { r: row - 1, c: col + 1 }, // top-right
        { r: row + 1, c: col - 1 }, // bottom-left
        { r: row + 1, c: col + 1 }, // bottom-right
      ];

      for (const pos of diagonalPositions) {
        if (
          pos.r >= 0 &&
          pos.r < state.gridSize &&
          pos.c >= 0 &&
          pos.c < state.gridSize &&
          state.grid[pos.r][pos.c].state === 'queen'
        ) {
          return false;
        }
      }

      // Check color group (if the square has a group color)
      if (square.groupColor) {
        for (let r = 0; r < state.gridSize; r++) {
          for (let c = 0; c < state.gridSize; c++) {
            if (
              state.grid[r][c].state === 'queen' &&
              state.grid[r][c].groupColor === square.groupColor
            ) {
              return false;
            }
          }
        }
      }

      return true;
    },
  },

  actions: {
    initializeGrid() {
      this.grid = Array(this.gridSize)
        .fill(null)
        .map(() =>
          Array(this.gridSize)
            .fill(null)
            .map(() => ({ state: 'empty' }))
        );
      this.moveHistory = [];
      this.isComplete = false;
      this.updateAvailableMoves();
    },

    updateAvailableMoves() {
      this.availableMoves = [];
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].state === 'empty' && this.isValidMove(row, col)) {
            this.availableMoves.push({ row, col });
          }
        }
      }
    },

    placeFlag(row: number, col: number) {
      if (this.grid[row][col].state !== 'empty') return false;

      this.saveToHistory();
      this.grid[row][col].state = 'flag';
      return true;
    },

    placeQueen(row: number, col: number) {
      if (!this.isValidMove(row, col)) {
        this.grid[row][col].state = 'invalid';
        return false;
      }

      this.saveToHistory();
      this.grid[row][col].state = 'queen';
      this.updateBlockedMoves();
      this.updateAvailableMoves();
      this.checkCompletion();
      return true;
    },

    updateBlockedMoves() {
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].state !== 'queen') {
            if (!this.isValidMove(row, col)) {
              this.grid[row][col].state = 'flag';
            } else {
              this.grid[row][col].state = 'empty';
            }
          }
        }
      }
    },

    saveToHistory() {
      this.moveHistory.push({
        grid: JSON.parse(JSON.stringify(this.grid)),
      });
    },

    handleUndo() {
      if (this.moveHistory.length > 0) {
        const lastState = this.moveHistory.pop();
        if (lastState) {
          this.grid = lastState.grid;
          this.updateAvailableMoves();
          this.checkCompletion();
        }
      }
    },

    handleRestart() {
      this.initializeGrid();
    },

    handlePreviousLevel() {
      if (this.currentLevel > 1) {
        this.currentLevel--;
        this.initializeGrid();
      }
    },

    handleNextLevel() {
      this.currentLevel++;
      this.initializeGrid();
    },

    handleSquareClick(row: number, col: number) {
      const currentState = this.grid[row][col].state;
      if (currentState === 'empty') {
        this.placeFlag(row, col);
      } else if (currentState === 'flag') {
        this.placeQueen(row, col);
      }
    },

    placeRandomQueen() {
      if (this.availableMoves.length === 0) {
        this.setError('No valid moves available');
        return false;
      }
      const randomIndex = Math.floor(Math.random() * this.availableMoves.length);
      const { row, col } = this.availableMoves[randomIndex];
      this.setError(null);
      return this.placeQueen(row, col);
    },

    checkCompletion() {
      // Check if we have placed all required queens
      const requiredQueens = this.gridSize;
      this.isComplete = this.queenPositions.length === requiredQueens;
    },

    setError(message: string | null) {
      this.errorMessage = message;
    },

    setGridSize(size: number) {
      if (size < 4 || size > 8) {
        this.setError('Grid size must be between 4 and 8');
        return;
      }
      this.gridSize = size;
      this.initializeGrid();
      this.setError(null);
    },
  },
});
