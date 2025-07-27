import { defineStore } from 'pinia';
import { rulesStorage } from '../utils/rulesStorage';
import { COLOR_PALETTE } from '../utils/colorPalette';

// Configuration keys for localStorage
const CONFIG_KEYS = {
  GRID_SIZE: 'honey-pot-ant-farming-plant-grid-size',
} as const;

export const usePlantStore = defineStore('plant', {
  state: () => ({
    // Basic game state
    isComplete: false,
    showGameRules: false,
    gridSize: 4, // Default grid size

    // Puzzle step management
    currentStep: 1, // 1 = place honey pots, 2 = place color cards

    // Grid state
    grid: [] as any[][], // Empty grid for plant game

    // Card placement state
    selectedCard: null as any, // Currently selected card for placement

    // Card deck state
    availableColors: [] as string[], // Colors available for current grid size
  }),

  getters: {
    // Check if a color has cards available (always true for unlimited deck)
    hasCardsAvailable: () => (color: string) => {
      return true; // Unlimited cards
    },

    // Get the count of honey pots on the grid
    honeyPotsPlaced(): number {
      let count = 0;
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (!this.grid[row][col].isEmpty && this.grid[row][col].card?.type === 'honey') {
            count++;
          }
        }
      }
      return count;
    },

    // Check if next step button should be enabled
    canProceedToNextStep(): boolean {
      if (this.currentStep === 1) {
        // In step 1, need same number of honey pots as grid size
        return this.honeyPotsPlaced === this.gridSize;
      }
      return false;
    },

    // Check if we're in step 1 (honey pot placement)
    isHoneyPotStep(): boolean {
      return this.currentStep === 1;
    },

    // Check if we're in step 2 (color card placement)
    isColorCardStep(): boolean {
      return this.currentStep === 2;
    },

    // Step information for UI
    stepTitle(): string {
      switch (this.currentStep) {
        case 1:
          return 'Place Honey Pots';
        case 2:
          return 'Place Color Cards';
        default:
          return 'Unknown Step';
      }
    },

    stepDescription(): string {
      switch (this.currentStep) {
        case 1:
          return `Place exactly ${this.gridSize} honey pots on the grid. You can change the grid size using the dropdown.`;
        case 2:
          return 'Place color cards to complete the puzzle.';
        default:
          return '';
      }
    },
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
      this.initializeCardDeck();
    },

    saveUserConfiguration() {
      try {
        localStorage.setItem(CONFIG_KEYS.GRID_SIZE, this.gridSize.toString());
      } catch (error) {
        console.warn('Failed to save user configuration:', error);
      }
    },

    hasSeenRules(): boolean {
      return rulesStorage.hasSeenRules('plant');
    },

    markRulesAsSeen() {
      rulesStorage.markRulesAsSeen('plant');
    },

    resetRulesSeen() {
      rulesStorage.resetRulesSeen('plant');
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
      this.initializeCardDeck();
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

    initializeCardDeck() {
      // Select colors based on grid size (same number of colors as grid size)
      this.availableColors = COLOR_PALETTE.slice(0, this.gridSize);
    },

    selectCard(color: string) {
      this.selectedCard = {
        color: color,
        colorGroup: color,
        imageUrl: `/assets/ant-nest-colors/${color}.png`,
      };
    },

    selectHoneyPot() {
      this.selectedCard = {
        type: 'honey',
        imageUrl: '/assets/card-backs/honey.png',
      };
    },

    nextStep() {
      if (this.canProceedToNextStep) {
        this.currentStep++;
        this.selectedCard = null; // Clear any selected card
      }
    },

    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep--;
        this.selectedCard = null; // Clear any selected card
      }
    },

    placeCard(row: number, col: number) {
      if (this.selectedCard && this.isValidPosition(row, col)) {
        // Check if cell is empty
        if (this.grid[row][col].isEmpty) {
          // Place the card at the specified position
          this.grid[row][col] = {
            isEmpty: false,
            card: this.selectedCard,
            colorGroup: this.selectedCard.colorGroup || null,
          };

          // Update honey pot count if placing a honey pot
          if (this.selectedCard.type === 'honey') {
            // Place ants on all blocked positions
            this.placeAntsForHoneyPot(row, col);
          }

          // Clear the selected card
          this.selectedCard = null;

          console.log(`Card placed at (${row}, ${col})`);
        }
      }
    },

    placeAntsForHoneyPot(honeyPotRow: number, honeyPotCol: number) {
      // Place ants on all positions that this honey pot blocks
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          // Skip the honey pot position itself
          if (row === honeyPotRow && col === honeyPotCol) {
            continue;
          }

          // Check if this position should be blocked by the honey pot
          if (this.isBlockedByHoneyPot(row, col, honeyPotRow, honeyPotCol)) {
            // Only place an ant if the cell is empty
            if (this.grid[row][col].isEmpty) {
              this.grid[row][col] = {
                isEmpty: false,
                card: {
                  type: 'ant',
                  imageUrl: '/assets/card-backs/ant.png ', // Using player image as ant for now
                },
                colorGroup: null,
              };
            }
          }
        }
      }
    },

    isBlockedByHoneyPot(
      row: number,
      col: number,
      honeyPotRow: number,
      honeyPotCol: number
    ): boolean {
      // A position is blocked if it's in the same row, column, or diagonally adjacent
      const sameRow = row === honeyPotRow;
      const sameCol = col === honeyPotCol;
      const diagonalAdjacent =
        Math.abs(row - honeyPotRow) === 1 && Math.abs(col - honeyPotCol) === 1;

      return sameRow || sameCol || diagonalAdjacent;
    },

    isValidPosition(row: number, col: number): boolean {
      return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
    },

    clearCell(row: number, col: number) {
      if (this.isValidPosition(row, col)) {
        const cell = this.grid[row][col];

        // Check if removing a honey pot
        if (!cell.isEmpty && cell.card?.type === 'honey') {
          // Remove ants that were placed by this honey pot
          this.removeAntsForHoneyPot(row, col);
        }

        this.grid[row][col] = {
          isEmpty: true,
          card: null,
          colorGroup: null,
        };
      }
    },

    removeAntsForHoneyPot(honeyPotRow: number, honeyPotCol: number) {
      // Remove ants from positions that were blocked by this honey pot
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          // Skip the honey pot position itself
          if (row === honeyPotRow && col === honeyPotCol) {
            continue;
          }

          // Check if this position was blocked by the honey pot
          if (this.isBlockedByHoneyPot(row, col, honeyPotRow, honeyPotCol)) {
            const cell = this.grid[row][col];
            // Only remove if it's an ant (not another honey pot or color card)
            if (!cell.isEmpty && cell.card?.type === 'ant') {
              this.grid[row][col] = {
                isEmpty: true,
                card: null,
                colorGroup: null,
              };
            }
          }
        }
      }
    },

    // Reset the game
    resetGame() {
      this.initializeGrid();
      this.initializeCardDeck();
      this.selectedCard = null;
      this.isComplete = false;
      this.currentStep = 1;
    },

    // Add more actions as needed
  },
});
