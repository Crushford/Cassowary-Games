import { defineStore } from 'pinia';

export interface GridSquare {
  state: 'empty' | 'flag' | 'queen' | 'invalid';
  groupColor?: string;
}

interface GameState {
  grid: GridSquare[];
  gridSize: number;
  history: {
    index: number;
    previousState: GridSquare[];
  }[];
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    grid: [],
    gridSize: 8, // Default grid size
    history: [],
  }),

  getters: {
    isValidMove: (state) => (index: number) => {
      const square = state.grid[index];
      if (square.state !== 'empty') return false;

      // Check if there's a queen in the same row, column, or diagonal
      const row = Math.floor(index / state.gridSize);
      const col = index % state.gridSize;

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
  },

  actions: {
    initializeGrid() {
      this.grid = Array(this.gridSize * this.gridSize)
        .fill(null)
        .map(() => ({
          state: 'empty',
        }));
      this.history = [];
    },

    saveToHistory() {
      this.history.push({
        index: this.history.length,
        previousState: JSON.parse(JSON.stringify(this.grid)),
      });
    },

    placeQueen(index: number) {
      if (!this.isValidMove(index)) {
        this.grid[index].state = 'invalid';
        return false;
      }

      this.saveToHistory();
      this.grid[index].state = 'queen';
      return true;
    },

    placeFlag(index: number) {
      if (this.grid[index].state !== 'empty') return false;

      this.saveToHistory();
      this.grid[index].state = 'flag';
      return true;
    },

    undo() {
      if (this.history.length === 0) return false;

      const lastState = this.history.pop();
      if (lastState) {
        this.grid = lastState.previousState;
        return true;
      }
      return false;
    },

    restart() {
      this.initializeGrid();
    },

    setGridSize(size: number) {
      this.gridSize = size;
      this.initializeGrid();
    },
  },
});
