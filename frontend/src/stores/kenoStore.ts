import { defineStore } from 'pinia';
import type { GridSquare } from '../types/types';
import { COLOR_SYMBOLS } from '../utils/colorPalette';

// Create reverse mapping from symbols to color names
const SYMBOL_TO_COLOR: Record<string, string> = Object.entries(COLOR_SYMBOLS).reduce(
  (acc, [color, symbol]) => {
    if (color !== 'undefined') {
      acc[symbol] = color;
    }
    return acc;
  },
  {} as Record<string, string>
);

// Create an empty grid with specified dimensions
function createEmptyGrid(size: number): GridSquare[][] {
  return Array(size)
    .fill(null)
    .map((_, row) =>
      Array(size)
        .fill(null)
        .map(
          (_, col) =>
            ({
              position: { row, col },
              groupColor: undefined,
            }) as GridSquare
        )
    );
}

interface KenoState {
  grid: GridSquare[][];
  gridSize: number;
  squareNumbers: Map<string, number>; // Maps "row,col" to number 1-25
  flippedSquares: Set<string>; // Tracks flipped squares by "row,col"
  turnsRemaining: number;
  maxTurns: number;
  gameOver: boolean;
  honeypotsFound: number;
}

export const useKenoStore = defineStore('keno', {
  state: (): KenoState => ({
    grid: [],
    gridSize: 5,
    squareNumbers: new Map(),
    flippedSquares: new Set(),
    turnsRemaining: 10,
    maxTurns: 10,
    gameOver: false,
    honeypotsFound: 0,
  }),

  getters: {
    getSquareNumber: (state) => (row: number, col: number) => {
      const key = `${row},${col}`;
      return state.squareNumbers.get(key) || 0;
    },
    isFlipped: (state) => (row: number, col: number) => {
      const key = `${row},${col}`;
      return state.flippedSquares.has(key);
    },
  },

  actions: {
    async loadRandomPuzzle() {
      try {
        // Load puzzles.json
        const response = await fetch('/puzzles.json');
        if (!response.ok) {
          throw new Error(`Failed to load puzzles.json: ${response.status}`);
        }

        const data = await response.json();
        const puzzles5x5 = data['5x5'] || [];

        // Filter for puzzles ending in "-0"
        const validPuzzles = puzzles5x5.filter((puzzle: any) => puzzle.id.endsWith('-0'));

        if (validPuzzles.length === 0) {
          throw new Error('No valid 5x5 puzzles found');
        }

        // Select a random puzzle
        const randomIndex = Math.floor(Math.random() * validPuzzles.length);
        const selectedPuzzle = validPuzzles[randomIndex];

        console.log('Selected puzzle:', selectedPuzzle.id);

        // Parse the puzzle data
        this.parsePuzzleData(selectedPuzzle);
      } catch (error) {
        console.error('Error loading puzzle:', error);
        throw error;
      }
    },

    parsePuzzleData(puzzleData: any) {
      const gridSize = Math.sqrt(puzzleData.layout.length);
      this.gridSize = gridSize;

      // Initialize grid
      this.grid = createEmptyGrid(gridSize);

      // Parse layout (color groups) using SYMBOL_TO_COLOR mapping
      for (let i = 0; i < puzzleData.layout.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const symbol = puzzleData.layout[i];

        if (symbol !== '.') {
          const colorName = SYMBOL_TO_COLOR[symbol];
          if (colorName) {
            this.grid[row][col].groupColor = colorName;
          } else {
            console.warn(`Warning: Unknown color symbol '${symbol}' at position ${i}`);
          }
        }
      }

      // Parse queens (solution)
      for (let i = 0; i < puzzleData.queens.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;

        if (puzzleData.queens[i] === 'Q') {
          this.grid[row][col].isSolutionQueen = true;
        }
      }

      // Assign numbers 1-25 to each square
      this.assignSquareNumbers();

      // Reset flipped squares when loading a new puzzle
      this.flippedSquares.clear();
      // Reset turns
      this.turnsRemaining = this.maxTurns;
      this.gameOver = false;
      // Reset honeypot count
      this.honeypotsFound = 0;

      console.log('Parsed puzzle:', {
        id: puzzleData.id,
        gridSize: this.gridSize,
      });
    },

    assignSquareNumbers() {
      // Create an array of numbers 1-25 for a 5x5 grid
      const numbers = Array.from({ length: this.gridSize * this.gridSize }, (_, i) => i + 1);

      // Assign numbers sequentially (left to right, top to bottom)
      this.squareNumbers.clear();
      let numberIndex = 0;
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const key = `${row},${col}`;
          this.squareNumbers.set(key, numbers[numberIndex]);
          numberIndex++;
        }
      }
    },

    flipSquare(row: number, col: number) {
      // Don't allow flipping if game is over or no turns remaining
      if (this.gameOver || this.turnsRemaining <= 0) {
        return;
      }

      const key = `${row},${col}`;
      if (this.flippedSquares.has(key)) {
        // Already flipped, do nothing
        return;
      }

      // Flip the square
      this.flippedSquares.add(key);

      // Count honeypot if this is a solution queen
      if (this.grid[row][col].isSolutionQueen) {
        this.honeypotsFound++;
      }

      // Decrement turns
      this.turnsRemaining--;

      // If turns are exhausted, flip all remaining cards
      if (this.turnsRemaining === 0) {
        this.flipAllRemainingCards();
      }
    },

    flipAllRemainingCards() {
      // Flip all squares that haven't been flipped yet
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const key = `${row},${col}`;
          if (!this.flippedSquares.has(key)) {
            this.flippedSquares.add(key);
            // Count honeypots when auto-flipping
            if (this.grid[row][col].isSolutionQueen) {
              this.honeypotsFound++;
            }
          }
        }
      }
      this.gameOver = true;
    },

    resetGame() {
      // Reset game state without loading a new puzzle
      this.flippedSquares.clear();
      this.turnsRemaining = this.maxTurns;
      this.gameOver = false;
      this.honeypotsFound = 0;
    },
  },
});
