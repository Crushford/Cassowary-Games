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
  selectedSquares: Set<string>; // Tracks selected squares by "row,col"
  coinsEarnedSquares: Set<string>; // Tracks squares that earned coins (for coin emoji display)
  currentTurn: number; // Current turn number (1-based)
  maxTurns: number;
  gameOver: boolean;
  coins: number;
  waitingForNextTurn: boolean; // Whether waiting for user to click "Next Turn" button
}

// Calculate payout per honeypot based on number of selections
// More selections = lower payout per honeypot
export function getPayoutForSelectionCount(selectionCount: number): number {
  if (selectionCount <= 0) return 0;

  // Payout structure:
  // 1 selection = 10 coins per honeypot
  // 2-3 selections = 5 coins per honeypot
  // 4-5 selections = 3 coins per honeypot
  // 6-7 selections = 2 coins per honeypot
  // 8-10 selections = 1 coin per honeypot
  if (selectionCount === 1) return 10;
  if (selectionCount <= 3) return 5;
  if (selectionCount <= 5) return 3;
  if (selectionCount <= 7) return 2;
  return 1;
}

export const useKenoStore = defineStore('keno', {
  state: (): KenoState => ({
    grid: [],
    gridSize: 5,
    squareNumbers: new Map(),
    flippedSquares: new Set(),
    selectedSquares: new Set(),
    coinsEarnedSquares: new Set(),
    currentTurn: 1,
    maxTurns: 5,
    gameOver: false,
    coins: 0,
    waitingForNextTurn: false,
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
    isSelected: (state) => (row: number, col: number) => {
      const key = `${row},${col}`;
      return state.selectedSquares.has(key);
    },
    earnedCoin: (state) => (row: number, col: number) => {
      const key = `${row},${col}`;
      return state.coinsEarnedSquares.has(key);
    },
    selectedCount: (state) => {
      return state.selectedSquares.size;
    },
    requiredSelections: (state) => {
      return state.selectedSquares.size;
    },
    currentPayout: (state) => {
      return getPayoutForSelectionCount(state.selectedSquares.size);
    },
    canSelectMore: (state) => {
      // Can select up to 10 squares, but not if already flipped
      return state.selectedSquares.size < 10 && !state.gameOver && !state.waitingForNextTurn;
    },
    canEndTurn: (state) => {
      // Can end turn if at least 1 square is selected
      return state.selectedSquares.size >= 1 && !state.gameOver && !state.waitingForNextTurn;
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
      this.selectedSquares.clear();
      this.coinsEarnedSquares.clear();
      // Reset turns
      this.currentTurn = 1;
      this.gameOver = false;
      this.waitingForNextTurn = false;
      // Note: coins persist across rounds

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

    selectSquare(row: number, col: number) {
      // Don't allow selection if game is over
      if (this.gameOver) {
        return;
      }

      const key = `${row},${col}`;

      // If already selected, deselect it
      if (this.selectedSquares.has(key)) {
        this.selectedSquares.delete(key);
        return;
      }

      // If already flipped, can't select
      if (this.flippedSquares.has(key)) {
        return;
      }

      // Don't allow selection if waiting for next turn or game over
      if (this.waitingForNextTurn || this.gameOver) {
        return;
      }

      // Can only select up to 10 squares
      if (this.selectedSquares.size >= 10) {
        return;
      }

      // Select the square
      this.selectedSquares.add(key);
    },

    endTurn() {
      if (this.selectedSquares.size === 0) return;

      // Get payout multiplier for current selection count
      const payoutPerHoneypot = getPayoutForSelectionCount(this.selectedSquares.size);

      // Flip all selected squares
      for (const key of this.selectedSquares) {
        const [row, col] = key.split(',').map(Number);

        // Flip the square if not already flipped
        if (!this.flippedSquares.has(key)) {
          this.flippedSquares.add(key);

          // Award coins if this is a honeypot (solution queen)
          if (this.grid[row][col].isSolutionQueen) {
            this.coins += payoutPerHoneypot;
            // Track this square as earning coins (for coin emoji display)
            this.coinsEarnedSquares.add(key);
          }
        }
      }

      // Clear selections after ending turn
      this.selectedSquares.clear();

      // Move to next turn
      this.currentTurn++;

      // If all turns are complete, flip all remaining cards
      if (this.currentTurn > this.maxTurns) {
        this.flipAllRemainingCards();
      } else {
        // Wait for user to click "Next Turn" before allowing new selections
        this.waitingForNextTurn = true;
      }
    },

    startNextTurn() {
      // Called when user clicks "Next Turn" button
      this.waitingForNextTurn = false;
    },

    flipSquare(row: number, col: number) {
      // Internal method to flip a square (used by flipAllRemainingCards)
      const key = `${row},${col}`;
      if (this.flippedSquares.has(key)) {
        return;
      }
      this.flippedSquares.add(key);
    },

    flipAllRemainingCards() {
      // Flip all squares that haven't been flipped yet
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const key = `${row},${col}`;
          if (!this.flippedSquares.has(key)) {
            this.flippedSquares.add(key);
            // Note: No coins awarded for auto-flipped cards at game end
          }
        }
      }
      this.gameOver = true;
    },

    resetGame() {
      // Reset game state without loading a new puzzle
      this.flippedSquares.clear();
      this.selectedSquares.clear();
      this.coinsEarnedSquares.clear();
      this.currentTurn = 1;
      this.gameOver = false;
      this.waitingForNextTurn = false;
      // Note: coins persist across resets
    },
  },
});
