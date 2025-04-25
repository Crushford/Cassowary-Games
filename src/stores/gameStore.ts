import { defineStore } from 'pinia';
import type { GridSquare } from '../components/GameGrid.vue';

export interface GameState {
  grid: GridSquare[][];
  gridSize: number;
  moveHistory: { grid: GridSquare[][] }[];
  currentLevel: number;
  availableMoves: { row: number; col: number }[];
  isComplete: boolean;
  errorMessage: string | null;
  savedPuzzles: { name: string; grid: GridSquare[][]; gridSize: number }[];
  currentPuzzle: string | null;
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
    savedPuzzles: [],
    currentPuzzle: null,
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
          if (this.grid[row][col].state === 'empty') {
            if (!this.isValidMove(row, col)) {
              this.grid[row][col].state = 'flag';
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
        // If we have no valid moves but not all queens are placed,
        // we're in a dead end. Reset the grid instead of showing error.
        if (this.queenPositions.length < this.gridSize) {
          this.handleRestart();
          return this.placeRandomQueen(); // Try again with fresh grid
        }

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

    // New function to assign color groups to ensure a unique solution
    assignColorGroups() {
      if (!this.isComplete) {
        this.setError('Need a complete solution before assigning color groups');
        return;
      }

      const colorPalette: ('red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink')[] = [
        'red',
        'blue',
        'green',
        'yellow',
        'purple',
        'pink',
      ];

      // Step 1: Reset all color groups
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.grid[row][col].groupColor = undefined;
        }
      }

      // Step 2: Find all queen positions
      const queens = this.queenPositions;

      // Step 3: Assign a unique color to each queen's square
      queens.forEach((queen, index) => {
        const colorIndex = index % colorPalette.length;
        this.grid[queen.row][queen.col].groupColor = colorPalette[colorIndex];
      });

      // Step 4: Expand color groups to create a unique solution
      this.expandColorGroups(queens, colorPalette);
    },

    // Helper function to expand color groups to ensure uniqueness
    expandColorGroups(queens: { row: number; col: number }[], colorPalette: string[]) {
      // For each queen, expand its color group strategically
      queens.forEach((queen, index) => {
        const color = this.grid[queen.row][queen.col].groupColor;

        // Strategy: Add horizontal and vertical squares to the color group
        // This creates constraints that force the queen's position

        // Add squares in horizontal and vertical directions
        const directions = [
          { dr: 1, dc: 0 }, // down
          { dr: -1, dc: 0 }, // up
          { dr: 0, dc: 1 }, // right
          { dr: 0, dc: -1 }, // left
        ];

        // For each direction, add 1-2 squares to this color group
        directions.forEach((dir) => {
          let r = queen.row + dir.dr;
          let c = queen.col + dir.dc;

          // First square in direction
          if (
            this.isValidPosition(r, c) &&
            this.grid[r][c].state !== 'queen' &&
            !this.grid[r][c].groupColor
          ) {
            this.grid[r][c].groupColor = color;
          }

          // Second square in direction
          r += dir.dr;
          c += dir.dc;
          if (
            this.isValidPosition(r, c) &&
            this.grid[r][c].state !== 'queen' &&
            !this.grid[r][c].groupColor
          ) {
            this.grid[r][c].groupColor = color;
          }
        });
      });

      // Ensure all squares have a color
      this.assignRemainingSquares(colorPalette);
    },

    // Helper to assign colors to any remaining squares
    assignRemainingSquares(colorPalette: string[]) {
      // First pass: Assign colors to squares adjacent to existing color groups
      let anyAssigned = true;
      while (anyAssigned) {
        anyAssigned = false;
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            if (!this.grid[row][col].groupColor) {
              // Check adjacent squares (horizontal and vertical)
              const directions = [
                { dr: 1, dc: 0 }, // down
                { dr: -1, dc: 0 }, // up
                { dr: 0, dc: 1 }, // right
                { dr: 0, dc: -1 }, // left
              ];

              for (const dir of directions) {
                const r = row + dir.dr;
                const c = col + dir.dc;
                if (this.isValidPosition(r, c) && this.grid[r][c].groupColor) {
                  this.grid[row][col].groupColor = this.grid[r][c].groupColor;
                  anyAssigned = true;
                  break;
                }
              }
            }
          }
        }
      }

      // Second pass: Assign any remaining squares randomly
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (!this.grid[row][col].groupColor) {
            const colorIndex = Math.floor(Math.random() * colorPalette.length);
            this.grid[row][col].groupColor = colorPalette[colorIndex];
          }
        }
      }
    },

    // Helper to check if a position is valid
    isValidPosition(row: number, col: number) {
      return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
    },

    // New method to generate a full solution
    generateFullSolution() {
      this.handleRestart();

      // Keep placing queens until we have a complete solution or no more moves
      let attempts = 0;
      const maxAttempts = 100;

      // Try to solve the puzzle
      while (!this.isComplete && attempts < maxAttempts) {
        const success = this.placeRandomQueen();
        if (!success) {
          // If we can't place more queens, restart and try again
          this.handleRestart();
        }
        attempts++;
      }
    },

    savePuzzleToLocalStorage() {
      if (!this.isComplete) {
        this.setError('You need a complete solution with color groups before saving');
        return false;
      }

      const timestamp = new Date().toISOString();
      const puzzleName = `Puzzle ${this.gridSize}x${this.gridSize} - ${timestamp}`;

      // Create a copy of the current grid with only queen positions and color groups
      const puzzleGrid = Array(this.gridSize)
        .fill(null)
        .map(() =>
          Array(this.gridSize)
            .fill(null)
            .map(() => ({ state: 'empty' }) as GridSquare)
        );

      // Copy only the queens and their color groups
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].state === 'queen') {
            puzzleGrid[row][col] = {
              state: 'queen',
              groupColor: this.grid[row][col].groupColor,
            } as GridSquare;
          } else if (this.grid[row][col].groupColor) {
            puzzleGrid[row][col] = {
              state: 'empty',
              groupColor: this.grid[row][col].groupColor,
            } as GridSquare;
          }
        }
      }

      // Add to saved puzzles list
      this.savedPuzzles.push({
        name: puzzleName,
        grid: puzzleGrid,
        gridSize: this.gridSize,
      });

      // Save to local storage
      localStorage.setItem('savedPuzzles', JSON.stringify(this.savedPuzzles));
      this.setError(null);
      return puzzleName;
    },

    loadPuzzlesFromLocalStorage() {
      const savedPuzzles = localStorage.getItem('savedPuzzles');
      if (savedPuzzles) {
        this.savedPuzzles = JSON.parse(savedPuzzles);
      }
    },

    loadPuzzle(puzzleName: string) {
      const puzzle = this.savedPuzzles.find((p) => p.name === puzzleName);
      if (!puzzle) {
        this.setError('Puzzle not found');
        return false;
      }

      // Set grid size and initialize an empty grid
      this.setGridSize(puzzle.gridSize);

      // Apply the puzzle grid (with color groups but no queens)
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (puzzle.grid[row][col].groupColor) {
            this.grid[row][col].groupColor = puzzle.grid[row][col].groupColor;
          }
        }
      }

      this.currentPuzzle = puzzleName;
      this.updateAvailableMoves();
      this.setError(null);
      return true;
    },

    deletePuzzle(puzzleName: string) {
      const index = this.savedPuzzles.findIndex((p) => p.name === puzzleName);
      if (index !== -1) {
        this.savedPuzzles.splice(index, 1);
        localStorage.setItem('savedPuzzles', JSON.stringify(this.savedPuzzles));
        return true;
      }
      return false;
    },
  },
});
