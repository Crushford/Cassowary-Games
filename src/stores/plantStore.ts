import { defineStore } from 'pinia';

// Configuration keys for localStorage
const CONFIG_KEYS = {
  GRID_SIZE: 'honey-pot-ant-farming-plant-grid-size',
  RULES_SEEN: 'honey-pot-ant-farming-plant-rules-seen',
} as const;

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
      try {
        // Load grid size
        const savedGridSize = localStorage.getItem(CONFIG_KEYS.GRID_SIZE);
        if (savedGridSize) {
          const size = parseInt(savedGridSize, 10);
          if ([4, 5, 6, 7, 8].includes(size)) {
            this.gridSize = size;
          }
        }
      } catch (error) {
        console.warn('Failed to load user configuration:', error);
      }
      this.initializeGrid();
    },

    saveUserConfiguration() {
      try {
        localStorage.setItem(CONFIG_KEYS.GRID_SIZE, this.gridSize.toString());
      } catch (error) {
        console.warn('Failed to save user configuration:', error);
      }
    },

    hasSeenRules(): boolean {
      try {
        return localStorage.getItem(CONFIG_KEYS.RULES_SEEN) === 'true';
      } catch (error) {
        console.warn('Failed to load rules seen state:', error);
        return false;
      }
    },

    markRulesAsSeen() {
      try {
        localStorage.setItem(CONFIG_KEYS.RULES_SEEN, 'true');
      } catch (error) {
        console.warn('Failed to save rules seen state:', error);
      }
    },

    resetRulesSeen() {
      try {
        localStorage.removeItem(CONFIG_KEYS.RULES_SEEN);
      } catch (error) {
        console.warn('Failed to reset rules seen state:', error);
      }
    },

    closeRulesModal() {
      this.markRulesAsSeen();
      this.showGameRules = false;
    },

    setGridSize(size: number) {
      if (size < 4 || size > 8) {
        console.warn('Grid size must be between 4 and 8');
        return;
      }
      this.gridSize = size;
      this.initializeGrid();
      this.saveUserConfiguration();
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
