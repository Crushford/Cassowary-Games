import { defineStore } from 'pinia';

export const usePlantStore = defineStore('plant', {
  state: () => ({
    // Basic game state
    isComplete: false,
    showGameRules: false,
    gridSize: 4, // Default grid size

    // Grid state
    grid: [] as any[][], // Empty grid for plant game

    // Card placement state
    selectedCard: null as any, // Currently selected card for placement

    // Add more state as needed
  }),

  getters: {
    // Add getters as needed
  },

  actions: {
    // Configuration management
    loadUserConfiguration() {
      // Load any saved configuration
      this.initializeGrid();
    },

    hasSeenRules(): boolean {
      try {
        return localStorage.getItem('plant-game-rules-seen') === 'true';
      } catch (error) {
        console.warn('Failed to load rules seen state:', error);
        return false;
      }
    },

    markRulesAsSeen() {
      try {
        localStorage.setItem('plant-game-rules-seen', 'true');
      } catch (error) {
        console.warn('Failed to save rules seen state:', error);
      }
    },

    setGridSize(size: number) {
      if (size < 4 || size > 8) {
        console.warn('Grid size must be between 4 and 8');
        return;
      }
      this.gridSize = size;
      this.initializeGrid();
    },

    initializeGrid() {
      // Create an empty grid of the specified size
      this.grid = Array(this.gridSize)
        .fill(null)
        .map(() =>
          Array(this.gridSize)
            .fill(null)
            .map(() => ({
              // Empty cell structure - can be extended later
              isEmpty: true,
              card: null, // No card placed yet
              colorGroup: null, // No color group assigned yet
              // Add more properties as needed for plant game
            }))
        );
    },

    selectCard(card: any) {
      this.selectedCard = card;
    },

    placeCard(row: number, col: number) {
      if (this.selectedCard && this.isValidPosition(row, col)) {
        // Place the card at the specified position
        this.grid[row][col] = {
          isEmpty: false,
          card: this.selectedCard,
          colorGroup: this.selectedCard.colorGroup || null,
        };

        // Clear the selected card
        this.selectedCard = null;

        console.log(`Card placed at (${row}, ${col})`);
      }
    },

    isValidPosition(row: number, col: number): boolean {
      return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
    },

    clearCell(row: number, col: number) {
      if (this.isValidPosition(row, col)) {
        this.grid[row][col] = {
          isEmpty: true,
          card: null,
          colorGroup: null,
        };
      }
    },

    // Add more actions as needed
  },
});
