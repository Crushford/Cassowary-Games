import { defineStore } from 'pinia';
import type { GridSquare } from '../types/types';
import { COLOR_SYMBOLS } from '../utils/colorPalette';
import { buildOddsRowsInteger, fairPayoutsTo1Integer } from '../lib/kenoOdds';

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
  showMaxReachedToast: boolean; // Whether to show the max selections reached toast
  shouldShake: boolean; // Whether to trigger screen shake animation
  activePopups: Map<string, number>; // Maps "row,col" to popup value (0 for ant, payout for honeypot)
  isFlippingCards: boolean; // Whether cards are currently being flipped
}

// Calculate fair payout for k matches out of g selections
// Returns the integer, floored fair payout (to-1) based on hypergeometric odds
// Returns 0 for 0 matches (no payout)
export function getFairPayoutForMatches(g: number, k: number): number {
  if (g <= 0 || k <= 0) return 0; // No payout for 0 matches
  const payouts = fairPayoutsTo1Integer(g);
  return payouts[k] || 0;
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
    showMaxReachedToast: false,
    shouldShake: false,
    activePopups: new Map(),
    isFlippingCards: false,
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
      // For display purposes, show the fair payout for 1 match (integer, floored)
      // The actual payout will depend on how many matches are found
      const g = state.selectedSquares.size;
      if (g === 0) return 0;
      const payouts = fairPayoutsTo1Integer(g);
      return payouts[1] || 0; // Show payout for 1 match
    },
    canSelectMore: (state) => {
      // Can select up to 5 squares, but not if already flipped or cards are being flipped
      if (state.waitingForNextTurn || state.gameOver || state.isFlippingCards) return false;
      return state.selectedSquares.size < 5;
    },
    canEndTurn: (state) => {
      // Can end turn if at least 1 square is selected and cards are not being flipped
      return (
        state.selectedSquares.size >= 1 &&
        !state.gameOver &&
        !state.waitingForNextTurn &&
        !state.isFlippingCards
      );
    },
    oddsRowsForCurrentSelection(
      state
    ): { k: number; probability: number; oneIn: number; fairPayoutTo1: number }[] {
      const g = state.selectedSquares.size;
      if (g === 0) return [];
      return buildOddsRowsInteger(g);
    },
    isShowingPopup: (state) => (row: number, col: number) => {
      const key = `${row},${col}`;
      return state.activePopups.has(key);
    },
    getPopupValue: (state) => (row: number, col: number) => {
      const key = `${row},${col}`;
      return state.activePopups.get(key) ?? null;
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
      this.showMaxReachedToast = false;
      this.shouldShake = false;
      this.activePopups.clear();
      this.isFlippingCards = false;
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
        // Hide toast when deselecting
        this.showMaxReachedToast = false;
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

      // Can only select up to 5 squares
      if (this.selectedSquares.size >= 5) {
        // Trigger shake and toast
        this.triggerMaxReached();
        return;
      }

      // Select the square
      this.selectedSquares.add(key);
      // Hide toast if it was showing
      this.showMaxReachedToast = false;
    },

    triggerMaxReached() {
      // Trigger shake animation
      this.shouldShake = true;
      // Reset shake after animation completes
      setTimeout(() => {
        this.shouldShake = false;
      }, 500);

      // Show toast
      this.showMaxReachedToast = true;
      // Auto-hide toast after 3 seconds
      setTimeout(() => {
        this.showMaxReachedToast = false;
      }, 3000);
    },

    async endTurn() {
      if (this.selectedSquares.size === 0) return;
      if (this.isFlippingCards) return; // Prevent multiple calls

      this.isFlippingCards = true;
      const g = this.selectedSquares.size;
      const payouts = fairPayoutsTo1Integer(g);
      let matchesFound = 0;

      // Convert selected squares to array for sequential processing
      const squaresToFlip = Array.from(this.selectedSquares);

      // Clear any existing popups
      this.activePopups.clear();

      // Flip each square one at a time with 0.5s delay
      for (let i = 0; i < squaresToFlip.length; i++) {
        const key = squaresToFlip[i];
        const [row, col] = key.split(',').map(Number);

        // Skip if already flipped
        if (this.flippedSquares.has(key)) {
          continue;
        }

        // Flip the square
        this.flippedSquares.add(key);

        // Check if it's a honeypot
        const isHoneypot = this.grid[row][col].isSolutionQueen;
        let popupValue = 0;

        if (isHoneypot) {
          matchesFound++;
          // Calculate incremental payout: payout for k matches minus payout for k-1 matches
          const payoutForK = payouts[matchesFound] || 0;
          const payoutForKMinus1 = matchesFound > 1 ? payouts[matchesFound - 1] || 0 : 0;
          popupValue = payoutForK - payoutForKMinus1;

          this.coinsEarnedSquares.add(key);
          this.coins += popupValue;
        }

        // Show popup
        this.activePopups.set(key, popupValue);

        // Hide popup after animation (1 second)
        setTimeout(() => {
          this.activePopups.delete(key);
        }, 1000);

        // Wait 0.5 seconds before flipping next card (except for the last one)
        if (i < squaresToFlip.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Clear selections after all cards are flipped
      this.selectedSquares.clear();
      // Clear toast notification
      this.showMaxReachedToast = false;
      this.isFlippingCards = false;

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
      this.showMaxReachedToast = false;
      this.shouldShake = false;
      this.activePopups.clear();
      this.isFlippingCards = false;
      // Note: coins persist across resets
    },
  },
});
