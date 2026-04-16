import { defineStore } from 'pinia';
import { loadQueensPuzzleCatalogForSize } from '@/games/queens/utils/puzzleCatalog';
import type { GridSquare } from '@/games/queens/types/types';
import { SYMBOL_TO_COLOR } from '@/games/queens/utils/colorPalette';
import { createEmptyGrid } from '@/games/queens/stores/gridUtils';
import { buildOddsRowsInteger, fairPayoutsTo1Integer } from '../lib/kenoOdds';

interface TurnHistory {
  turn: number;
  action: 'forage' | 'nest' | 'hunt';
  selections: number;
  foodEarned: number;
  cassowariesGained: number;
  cassowariesLost: number;
  coinsEarned: number; // Keep for compatibility
}

interface KenoState {
  grid: GridSquare[][];
  gridSize: number;
  puzzleSize: string; // Puzzle size key like "4x4", "5x5", etc.
  squareNumbers: Map<string, number>; // Maps "row,col" to number 1-25
  flippedSquares: Set<string>; // Tracks flipped squares by "row,col"
  selectedSquares: Set<string>; // Tracks selected squares by "row,col"
  coinsEarnedSquares: Set<string>; // Tracks squares that earned coins (for coin emoji display)
  currentTurn: number; // Current turn number (1-based)
  maxTurns: number;
  gameOver: boolean;
  coins: number;
  food: number; // Food resource
  cassowaries: number; // Cassowaries resource
  selectedAction: 'forage' | 'nest' | 'hunt' | null; // Current action selection
  showMaxReachedToast: boolean; // Whether to show the max selections reached toast
  shouldShake: boolean; // Whether to trigger screen shake animation
  activePopups: Map<string, number>; // Maps "row,col" to popup value (0 for ant, payout for honeypot)
  isFlippingCards: boolean; // Whether cards are currently being flipped
  turnHistory: TurnHistory[]; // History of each turn
  roundComplete: boolean; // Whether the round is complete
  highScore: number; // High score from localStorage
  showBoard: boolean; // Whether to show the solution board overlay
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
    gridSize: 7,
    puzzleSize: '7x7',
    squareNumbers: new Map(),
    flippedSquares: new Set(),
    selectedSquares: new Set(),
    coinsEarnedSquares: new Set(),
    currentTurn: 1,
    maxTurns: 5,
    gameOver: false,
    coins: 0,
    food: 0,
    cassowaries: 0,
    selectedAction: 'forage',
    showMaxReachedToast: false,
    shouldShake: false,
    activePopups: new Map(),
    isFlippingCards: false,
    turnHistory: [],
    roundComplete: false,
    highScore: 0,
    showBoard: false,
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
      if (state.gameOver || state.isFlippingCards) return false;

      // Different limits based on action
      if (state.selectedAction === 'forage') {
        return state.selectedSquares.size < 5;
      } else if (state.selectedAction === 'nest' || state.selectedAction === 'hunt') {
        return state.selectedSquares.size < 1;
      }

      return false;
    },
    canEndTurn: (state) => {
      // Can end turn if action is selected, cards are not being flipped, and selection count meets action requirements
      if (!state.selectedAction || state.gameOver || state.isFlippingCards) return false;

      // Different minimums based on action
      if (state.selectedAction === 'forage') {
        return state.selectedSquares.size === 5;
      } else if (state.selectedAction === 'nest' || state.selectedAction === 'hunt') {
        return state.selectedSquares.size === 1;
      }

      return false;
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
    async loadRandomPuzzle(puzzleSize?: string) {
      try {
        // Use provided size or default to current puzzleSize
        const size = puzzleSize || this.puzzleSize;

        const data = await loadQueensPuzzleCatalogForSize(size);
        const puzzlesForSize = data[size] || [];

        // Filter for puzzles ending in "-0"
        const validPuzzles = puzzlesForSize.filter((puzzle: any) => puzzle.id.endsWith('-0'));

        if (validPuzzles.length === 0) {
          throw new Error(`No valid ${size} puzzles found`);
        }

        // Select a random puzzle
        const randomIndex = Math.floor(Math.random() * validPuzzles.length);
        const selectedPuzzle = validPuzzles[randomIndex];

        console.log('Selected puzzle:', selectedPuzzle.id);

        // Update puzzleSize state
        this.puzzleSize = size;

        // Parse the puzzle data
        this.parsePuzzleData(selectedPuzzle);
      } catch (error) {
        console.error('Error loading puzzle:', error);
        throw error;
      }
    },

    setPuzzleSize(size: string) {
      if (this.puzzleSize !== size) {
        this.puzzleSize = size;
        this.loadRandomPuzzle(size);
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

      // Mark squares adjacent to honeypots as having fruit
      this.markFruitAroundHoneypots();

      // Assign numbers 1-25 to each square
      this.assignSquareNumbers();

      // Reset flipped squares when loading a new puzzle
      this.flippedSquares.clear();
      this.selectedSquares.clear();
      this.coinsEarnedSquares.clear();
      // Reset turns
      this.currentTurn = 1;
      this.gameOver = false;
      this.roundComplete = false;
      this.showMaxReachedToast = false;
      this.shouldShake = false;
      this.activePopups.clear();
      this.isFlippingCards = false;
      this.turnHistory = [];
      this.coins = 0;
      this.food = 0;
      this.cassowaries = 0;
      this.selectedAction = 'forage'; // Reset to default action
      // Load high score from localStorage
      this.loadHighScore();
      // Note: highScore persists across rounds

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

    markFruitAroundHoneypots() {
      // Find all honeypots and mark adjacent squares as having fruit
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].isSolutionQueen) {
            // Mark all adjacent squares (including diagonal) as having fruit
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                // Skip the honeypot itself
                if (dr === 0 && dc === 0) continue;

                const adjRow = row + dr;
                const adjCol = col + dc;

                // Check bounds
                if (
                  adjRow >= 0 &&
                  adjRow < this.gridSize &&
                  adjCol >= 0 &&
                  adjCol < this.gridSize
                ) {
                  // Mark as having fruit (only if it's not a honeypot itself)
                  if (!this.grid[adjRow][adjCol].isSolutionQueen) {
                    this.grid[adjRow][adjCol].hasFruit = true;
                  }
                }
              }
            }
          }
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

      // Don't allow selection if game over or cards are being flipped
      if (this.gameOver || this.isFlippingCards) {
        return;
      }

      // Check action-based limits
      if (this.selectedAction === 'forage') {
        if (this.selectedSquares.size >= 5) {
          this.triggerMaxReached();
          return;
        }
      } else if (this.selectedAction === 'nest' || this.selectedAction === 'hunt') {
        if (this.selectedSquares.size >= 1) {
          this.triggerMaxReached();
          return;
        }
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
      if (this.selectedSquares.size === 0 || !this.selectedAction) return;
      if (this.isFlippingCards) return; // Prevent multiple calls

      this.isFlippingCards = true;
      const action = this.selectedAction;

      // Track resources earned/lost this turn
      let foodEarned = 0;
      let cassowariesEarned = 0;
      let cassowariesLost = 0;

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

        // Determine what's in this square
        const isLion = this.grid[row][col].isSolutionQueen;
        const hasFruit = this.grid[row][col].hasFruit;
        const isNest = !isLion && !hasFruit;

        let popupValue = 0;

        // Apply rewards based on action
        if (action === 'forage') {
          if (hasFruit) {
            foodEarned += 1;
            popupValue = 1;
          }
          // Lion or nest = nothing
        } else if (action === 'nest') {
          if (isNest) {
            cassowariesEarned += 3;
            popupValue = 3;
          } else if (isLion) {
            cassowariesLost += 1;
            popupValue = -1;
          }
          // Fruit = nothing (no gain, no loss)
        } else if (action === 'hunt') {
          if (isLion) {
            foodEarned += 5;
            popupValue = 5;
          } else if (hasFruit) {
            foodEarned += 1;
            popupValue = 1;
          }
          // Nest = nothing
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

      // Apply resource changes
      this.food += foodEarned;
      this.cassowaries = Math.max(0, this.cassowaries + cassowariesEarned - cassowariesLost);

      // Record turn history
      this.turnHistory.push({
        turn: this.currentTurn,
        action: action,
        selections: squaresToFlip.length,
        foodEarned: foodEarned,
        cassowariesGained: cassowariesEarned,
        cassowariesLost: cassowariesLost,
        coinsEarned: 0, // Keep for compatibility, but not used
      });

      // Clear selections and action after all cards are flipped
      this.selectedSquares.clear();
      this.selectedAction = 'forage'; // Reset to default action
      // Clear toast notification
      this.showMaxReachedToast = false;
      this.isFlippingCards = false;

      // Move to next turn automatically
      this.currentTurn++;

      // If all turns are complete, end the round
      if (this.currentTurn > this.maxTurns) {
        this.completeRound();
      }
      // Otherwise, automatically proceed to next turn (no waiting needed)
    },

    countHoneypotsFound(): number {
      let count = 0;
      for (const key of this.flippedSquares) {
        const [row, col] = key.split(',').map(Number);
        if (this.grid[row]?.[col]?.isSolutionQueen) {
          count++;
        }
      }
      return count;
    },

    completeRound() {
      // Flip all remaining cards
      this.flipAllRemainingCards();

      // Save high score if this is a new record
      if (this.coins > this.highScore) {
        this.highScore = this.coins;
        this.saveHighScore();
      }

      // Mark round as complete
      this.roundComplete = true;
    },

    saveHighScore() {
      try {
        localStorage.setItem('keno-high-score', this.highScore.toString());
      } catch (error) {
        console.warn('Failed to save high score:', error);
      }
    },

    loadHighScore() {
      try {
        const saved = localStorage.getItem('keno-high-score');
        if (saved) {
          this.highScore = parseInt(saved, 10);
        }
      } catch (error) {
        console.warn('Failed to load high score:', error);
      }
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

    setAction(action: 'forage' | 'nest' | 'hunt') {
      this.selectedAction = action;
    },

    resetGame() {
      // Reset game state without loading a new puzzle
      this.flippedSquares.clear();
      this.selectedSquares.clear();
      this.coinsEarnedSquares.clear();
      this.currentTurn = 1;
      this.gameOver = false;
      this.roundComplete = false;
      this.showMaxReachedToast = false;
      this.shouldShake = false;
      this.activePopups.clear();
      this.isFlippingCards = false;
      this.turnHistory = [];
      this.coins = 0;
      this.food = 0;
      this.cassowaries = 0;
      this.selectedAction = 'forage'; // Reset to default action
      // Note: highScore persists across resets
    },

    restartGame() {
      // Reset game and load a new puzzle
      this.resetGame();
      this.loadRandomPuzzle();
    },

    toggleShowBoard() {
      const wasShowing = this.showBoard;
      this.showBoard = !this.showBoard;

      // If we're turning on show board, flip all squares
      if (!wasShowing && this.showBoard) {
        this.flipAllSquaresForShowBoard();
      }
    },

    flipAllSquaresForShowBoard() {
      // Flip all squares without ending the game (for show board preview)
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const key = `${row},${col}`;
          if (!this.flippedSquares.has(key)) {
            this.flippedSquares.add(key);
          }
        }
      }
    },
  },
});
