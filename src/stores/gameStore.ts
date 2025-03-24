import { defineStore } from 'pinia';
import type { GridSquare } from '../components/GameGrid.vue';

interface GameState {
  grid: GridSquare[];
  gridSize: number;
  moveHistory: { grid: GridSquare[] }[];
  currentLevel: number;
  availableMoves: number[];
  isComplete: boolean;
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    grid: Array(6 * 6)
      .fill(null)
      .map(() => ({ state: 'empty' })),
    gridSize: 6,
    moveHistory: [],
    currentLevel: 1,
    availableMoves: [],
    isComplete: false,
  }),

  getters: {
    // Get all positions where queens are placed
    queenPositions: (state): number[] => {
      return state.grid
        .map((square, index) => ({ square, index }))
        .filter(({ square }) => square.state === 'queen')
        .map(({ index }) => index);
    },

    isValidMove: (state) => (index: number) => {
      const square = state.grid[index];
      if (square.state !== 'empty') return false;

      const row = Math.floor(index / state.gridSize);
      const col = index % state.gridSize;

      // Check if there's a queen in the same row, column, or diagonal
      for (let i = 0; i < state.grid.length; i++) {
        if (state.grid[i].state === 'queen') {
          const queenRow = Math.floor(i / state.gridSize);
          const queenCol = i % state.gridSize;

          if (
            row === queenRow ||
            col === queenCol ||
            Math.abs(row - queenRow) === Math.abs(col - queenCol)
          ) {
            return false;
          }
        }
      }

      return true;
    },

    getAttackedSquares:
      (state) =>
      (index: number): number[] => {
        const row = Math.floor(index / state.gridSize);
        const col = index % state.gridSize;
        const attackedSquares: number[] = [];

        // Add all squares in the same row
        for (let c = 0; c < state.gridSize; c++) {
          if (c !== col) {
            attackedSquares.push(row * state.gridSize + c);
          }
        }

        // Add all squares in the same column
        for (let r = 0; r < state.gridSize; r++) {
          if (r !== row) {
            attackedSquares.push(r * state.gridSize + col);
          }
        }

        // Add all squares in the diagonals
        // Diagonal going up-right
        for (let r = row - 1, c = col + 1; r >= 0 && c < state.gridSize; r--, c++) {
          attackedSquares.push(r * state.gridSize + c);
        }
        // Diagonal going down-right
        for (let r = row + 1, c = col + 1; r < state.gridSize && c < state.gridSize; r++, c++) {
          attackedSquares.push(r * state.gridSize + c);
        }
        // Diagonal going down-left
        for (let r = row + 1, c = col - 1; r < state.gridSize && c >= 0; r++, c--) {
          attackedSquares.push(r * state.gridSize + c);
        }
        // Diagonal going up-left
        for (let r = row - 1, c = col - 1; r >= 0 && c >= 0; r--, c--) {
          attackedSquares.push(r * state.gridSize + c);
        }

        return attackedSquares;
      },

    isUnderAttack:
      (state) =>
      (index: number): boolean => {
        const row = Math.floor(index / state.gridSize);
        const col = index % state.gridSize;

        for (let i = 0; i < state.grid.length; i++) {
          if (state.grid[i].state === 'queen') {
            const queenRow = Math.floor(i / state.gridSize);
            const queenCol = i % state.gridSize;

            // Check if in same row, column, or diagonal
            if (
              row === queenRow ||
              col === queenCol ||
              Math.abs(row - queenRow) === Math.abs(col - queenCol)
            ) {
              return true;
            }
          }
        }
        return false;
      },
  },

  actions: {
    initializeGrid() {
      this.grid = Array(this.gridSize * this.gridSize)
        .fill(null)
        .map(() => ({ state: 'empty' }));
      this.moveHistory = [];
      this.isComplete = false;
      this.updateAvailableMoves();
    },

    updateAvailableMoves() {
      this.availableMoves = this.grid
        .map((square, index) => ({ square, index }))
        .filter(({ square, index }) => square.state === 'empty' && !this.isUnderAttack(index))
        .map(({ index }) => index);
    },

    placeFlag(index: number) {
      if (this.grid[index].state !== 'empty') return false;

      this.saveToHistory();
      this.grid[index].state = 'flag';
      return true;
    },

    placeQueen(index: number) {
      if (!this.isValidMove(index)) {
        this.grid[index].state = 'invalid';
        return false;
      }

      this.saveToHistory();
      this.grid[index].state = 'queen';
      this.updateAvailableMoves();
      this.checkCompletion();
      return true;
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

    handleDebugMove(index: number) {
      const currentState = this.grid[index].state;
      if (currentState === 'empty') {
        this.placeFlag(index);
      } else if (currentState === 'flag') {
        this.placeQueen(index);
      }
    },

    placeRandomQueen() {
      if (this.availableMoves.length === 0) return false;

      const randomIndex = Math.floor(Math.random() * this.availableMoves.length);
      const moveIndex = this.availableMoves[randomIndex];
      return this.placeQueen(moveIndex);
    },

    checkCompletion() {
      // Check if we have placed all required queens
      const requiredQueens = this.gridSize;
      this.isComplete = this.queenPositions.length === requiredQueens;
    },

    setGridSize(size: number) {
      this.gridSize = size;
      this.initializeGrid();
    },
  },
});
