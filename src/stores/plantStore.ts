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

    // Grid state - use same structure as harvestStore
    grid: [] as Array<
      Array<{
        position: { row: number; col: number };
        groupColor?: string | null;
        base?: 'honey' | 'ant' | null;
      }>
    >,

    // Card placement state
    selectedCard: null as any, // Currently selected card for placement

    // Card deck state
    availableColors: [] as string[], // Colors available for current grid size

    // Undo functionality
    placementHistory: [] as Array<{
      row: number;
      col: number;
      previousState: any;
      step: number;
    }>,
  }),

  getters: {
    // Check if a color has cards available (always true for unlimited deck)
    hasCardsAvailable: () => (color: string) => {
      return true; // Unlimited cards
    },

    // Get the count of honey pots on the grid
    honeyPotsPlaced(): number {
      let count = 0;
      // Check if grid is initialized
      if (!this.grid || this.grid.length === 0) {
        return count;
      }

      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].base === 'honey') {
            count++;
          }
        }
      }
      return count;
    },

    // Get the count of remaining honey pot cards
    honeyPotsRemaining(): number {
      return this.gridSize - this.honeyPotsPlaced;
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

    // Check if undo is available
    canUndo(): boolean {
      return this.placementHistory.length > 0;
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

      // Check if we're on step 2 but have no honey pots placed - if so, go back to step 1
      if (this.currentStep === 2 && this.honeyPotsPlaced === 0) {
        this.currentStep = 1;
      }

      // Auto-select honey pot card when starting at step 1
      if (this.currentStep === 1) {
        this.selectHoneyPot();
      }
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

      // Auto-select honey pot card if we're in step 1
      if (this.currentStep === 1) {
        this.selectHoneyPot();
      }
    },

    initializeGrid() {
      // Create an empty grid of the specified size
      this.grid = Array(this.gridSize)
        .fill(null)
        .map((_, row) =>
          Array(this.gridSize)
            .fill(null)
            .map((_, col) => ({
              position: { row, col },
              groupColor: null,
              base: null,
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

        // Assign random colors to honey pots when transitioning to step 2
        if (this.currentStep === 2) {
          this.assignColorsToHoneyPots();
        }
      }
    },

    assignColorsToHoneyPots() {
      // Get all honey pot positions
      const honeyPotPositions: Array<{ row: number; col: number }> = [];

      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row] && this.grid[row][col] && this.grid[row][col].base === 'honey') {
            honeyPotPositions.push({ row, col });
          }
        }
      }

      // Use all available colors and shuffle them
      const shuffledColors = [...this.availableColors].sort(() => Math.random() - 0.5);

      // Assign a unique color to each honey pot
      honeyPotPositions.forEach((pos, index) => {
        const color = shuffledColors[index];
        // Set the groupColor on the grid cell (this is what PlantSquare will read)
        this.grid[pos.row][pos.col].groupColor = color;
      });
    },

    placeCard(row: number, col: number) {
      if (
        this.selectedCard &&
        this.isValidPosition(row, col) &&
        this.grid &&
        this.grid[row] &&
        this.grid[row][col]
      ) {
        // Check if cell is empty (no base)
        if (!this.grid[row][col].base) {
          // Store the previous state for undo
          const previousState = JSON.parse(JSON.stringify(this.grid[row][col]));

          // Place the card at the specified position
          this.grid[row][col] = {
            position: { row, col },
            groupColor: this.selectedCard.colorGroup || null,
            base: this.selectedCard.type === 'honey' ? 'honey' : null,
          };

          // If placing a honey pot, recalculate all ant positions
          if (this.selectedCard.type === 'honey') {
            this.recalculateAntPositions();
          }

          // Add to placement history for undo
          this.placementHistory.push({
            row,
            col,
            previousState,
            step: this.currentStep,
          });
        }
      }
    },

    // Recalculate all ant positions based on current honey pot placements
    recalculateAntPositions() {
      // First, remove all existing ants
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row] && this.grid[row][col] && this.grid[row][col].base === 'ant') {
            this.grid[row][col] = {
              position: { row, col },
              groupColor: null,
              base: null,
            };
          }
        }
      }

      // Then place ants for all honey pots
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row] && this.grid[row][col] && this.grid[row][col].base === 'honey') {
            this.placeAntsForHoneyPot(row, col);
          }
        }
      }
    },

    placeAntsForHoneyPot(honeyPotRow: number, honeyPotCol: number) {
      // Place ants on all positions that this honey pot blocks
      if (!this.grid || this.grid.length === 0) {
        return;
      }

      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          // Skip the honey pot position itself
          if (row === honeyPotRow && col === honeyPotCol) {
            continue;
          }

          // Check if this position should be blocked by the honey pot
          if (this.isBlockedByHoneyPot(row, col, honeyPotRow, honeyPotCol)) {
            // Only place an ant if the cell is empty
            if (this.grid[row] && this.grid[row][col] && !this.grid[row][col].base) {
              this.grid[row][col] = {
                position: { row, col },
                groupColor: null,
                base: 'ant',
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
      if (this.isValidPosition(row, col) && this.grid && this.grid[row] && this.grid[row][col]) {
        const cell = this.grid[row][col];

        // Check if removing a honey pot
        if (cell.base === 'honey') {
          // Clear the cell first
          this.grid[row][col] = {
            position: { row, col },
            groupColor: null,
            base: null,
          };

          // Then recalculate all ant positions
          this.recalculateAntPositions();
        } else {
          // For non-honey pot cells, just clear normally
          this.grid[row][col] = {
            position: { row, col },
            groupColor: null,
            base: null,
          };
        }
      }
    },

    removeAntsForHoneyPot(honeyPotRow: number, honeyPotCol: number) {
      // Remove ants from positions that were blocked by this honey pot
      if (!this.grid || this.grid.length === 0) {
        return;
      }

      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          // Skip the honey pot position itself
          if (row === honeyPotRow && col === honeyPotCol) {
            continue;
          }

          // Check if this position was blocked by the honey pot
          if (this.isBlockedByHoneyPot(row, col, honeyPotRow, honeyPotCol)) {
            if (this.grid[row] && this.grid[row][col]) {
              const cell = this.grid[row][col];
              // Only remove if it's an ant (not another honey pot or color card)
              if (cell.base === 'ant') {
                this.grid[row][col] = {
                  position: { row, col },
                  groupColor: null,
                  base: null,
                };
              }
            }
          }
        }
      }
    },

    // Undo the last placement
    undo() {
      if (this.placementHistory.length > 0 && this.grid) {
        const lastPlacement = this.placementHistory.pop()!;

        // Restore the previous state
        if (this.grid[lastPlacement.row] && this.grid[lastPlacement.row][lastPlacement.col]) {
          this.grid[lastPlacement.row][lastPlacement.col] = lastPlacement.previousState;

          // Always recalculate ant positions after any undo operation
          // This ensures ants are properly placed based on current honey pot positions
          this.recalculateAntPositions();
        }
      }
    },

    // Reset the game
    resetGame() {
      this.initializeGrid();
      this.initializeCardDeck();
      this.isComplete = false;
      this.currentStep = 1;
      this.placementHistory = []; // Clear placement history on reset
      // Auto-select honey pot card when starting at step 1
      this.selectHoneyPot();
    },

    // Add more actions as needed
  },
});
