import { defineStore } from 'pinia';
import { rulesStorage } from '../utils/rulesStorage';
import { COLOR_PALETTE, COLOR_SYMBOLS } from '../utils/colorPalette';

// Configuration keys for localStorage
const CONFIG_KEYS = {
  GRID_SIZE: 'honey-pot-ant-farming-plant-grid-size',
} as const;

export const usePlantStore = defineStore('plant', {
  state: () => ({
    // Basic game state
    isComplete: false,
    showGameRules: false,
    showValidationModal: false,
    showSaveModal: false,
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

    // Initial step 2 grid state (saved when transitioning to step 2)
    initialColorPlacements: null as any,
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

    // Check if undo is available (only for flower tile placements)
    canUndo(): boolean {
      return this.placementHistory.some((placement) => placement.step === 2);
    },

    // Get the currently selected color
    selectedColor(): string | null {
      return this.selectedCard?.colorGroup || null;
    },

    // Get a boolean grid indicating valid placements for the currently selected color
    validPlacements(): boolean[][] {
      const validGrid: boolean[][] = [];

      // Initialize the grid with false values
      for (let row = 0; row < this.gridSize; row++) {
        validGrid[row] = [];
        for (let col = 0; col < this.gridSize; col++) {
          validGrid[row][col] = false;
        }
      }

      // Only calculate valid placements if we're in step 2 and have a selected color
      if (this.currentStep === 2 && this.selectedColor) {
        const selectedColor = this.selectedColor;

        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            // Check if position is valid
            if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
              continue;
            }

            // Check if there's already a color placed at this position
            if (this.grid[row][col].groupColor) {
              continue;
            }

            // Check if there's a honey pot at this position (can't place colors on honey pots)
            if (this.grid[row][col].base === 'honey') {
              continue;
            }

            // Check if the position is adjacent (directly vertical or horizontal) to a square with the same color
            const adjacentPositions = [
              { row: row - 1, col: col }, // top
              { row: row + 1, col: col }, // bottom
              { row: row, col: col - 1 }, // left
              { row: row, col: col + 1 }, // right
            ];

            for (const pos of adjacentPositions) {
              if (
                pos.row >= 0 &&
                pos.row < this.gridSize &&
                pos.col >= 0 &&
                pos.col < this.gridSize &&
                this.grid[pos.row][pos.col].groupColor === selectedColor
              ) {
                validGrid[row][col] = true;
                break;
              }
            }
          }
        }
      }

      return validGrid;
    },

    // Check if honey pot is currently selected in step 1
    hasSelectedHoneyPot(): boolean {
      return this.selectedCard && this.selectedCard.type === 'honey' && this.currentStep === 1;
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

      // Show rules if user hasn't seen them before
      if (!this.hasSeenRules()) {
        this.showGameRules = true;
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

    openValidationModal() {
      this.showValidationModal = true;
    },

    closeValidationModal() {
      this.showValidationModal = false;
    },

    openSaveModal() {
      this.showSaveModal = true;
    },

    closeSaveModal() {
      this.showSaveModal = false;
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
        // Delay color assignment to allow flip animation to start first
        if (this.currentStep === 2) {
          // Delay by 300ms to allow flip animation to start
          setTimeout(() => {
            this.assignColorsToHoneyPots();
            // Save the initial step 2 grid state after assigning colors
            this.initialColorPlacements = JSON.parse(JSON.stringify(this.grid));
            this.selectCard(this.availableColors[0]);
          }, 300);
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
      // Assign a unique color to each honey pot
      honeyPotPositions.forEach((pos, index) => {
        const color = this.availableColors[index];
        // Set the groupColor on the grid cell (this is what PlantSquare will read)
        this.grid[pos.row][pos.col].groupColor = color;
      });
    },

    // Place honey pot in step 1
    placeHoneyPot(row: number, col: number) {
      if (this.selectedCard.type === 'honey' && this.grid[row][col]) {
        // Check if cell is empty (no base)
        if (!this.grid[row][col].base) {
          // Store the previous state for undo
          const previousState = JSON.parse(JSON.stringify(this.grid[row][col]));

          // Place the honey pot
          this.grid[row][col] = {
            position: { row, col },
            groupColor: null,
            base: 'honey',
          };

          // Recalculate all ant positions
          this.recalculateAntPositions();

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

    // Assign color to an empty square in step 2
    assignColorToSquare(row: number, col: number) {
      if (this.selectedCard.colorGroup && this.grid[row][col]) {
        // Store the previous state for undo
        const previousState = JSON.parse(JSON.stringify(this.grid[row][col]));

        // Assign the color to the square
        this.grid[row][col].groupColor = this.selectedCard.colorGroup;

        // Add to placement history for undo
        this.placementHistory.push({
          row,
          col,
          previousState,
          step: this.currentStep,
        });
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

    // Undo the last placed flower tile (color card placement only)
    undo() {
      if (this.placementHistory.length > 0 && this.grid) {
        // Find the last flower tile placement (step 2) from the end of the history
        let lastFlowerPlacementIndex = -1;
        for (let i = this.placementHistory.length - 1; i >= 0; i--) {
          if (this.placementHistory[i].step === 2) {
            lastFlowerPlacementIndex = i;
            break;
          }
        }

        // If no flower tile placement found, do nothing
        if (lastFlowerPlacementIndex === -1) {
          return;
        }

        // Remove the last flower tile placement from history
        const lastFlowerPlacement = this.placementHistory.splice(lastFlowerPlacementIndex, 1)[0];

        // Restore the previous state
        if (
          this.grid[lastFlowerPlacement.row] &&
          this.grid[lastFlowerPlacement.row][lastFlowerPlacement.col]
        ) {
          this.grid[lastFlowerPlacement.row][lastFlowerPlacement.col] =
            lastFlowerPlacement.previousState;
        }
      }
    },

    // Reset the current step only
    resetCurrentStep() {
      if (this.currentStep === 1) {
        // Reset step 1: Clear all honey pots and ants
        this.initializeGrid();
        this.placementHistory = [];
        this.initialColorPlacements = null; // Clear the saved step 2 state
        this.selectHoneyPot();
      } else if (this.currentStep === 2) {
        // Reset step 2: Restore to the initial step 2 grid state
        if (this.initialColorPlacements) {
          this.grid = JSON.parse(JSON.stringify(this.initialColorPlacements));
        }
        // Remove all step 2 placements from history
        this.placementHistory = this.placementHistory.filter((placement) => placement.step === 1);
      }
    },
    // Export current puzzle state in the required JSON format
    exportPuzzleData(): { id: string; layout: string; queens: string; createdAt: string } {
      // Generate a unique ID (you might want to make this more sophisticated)
      const id = `plant-${Date.now()}`;

      let layout = '';
      let queens = '';

      // Encode the grid into layout and queens strings
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const cell = this.grid[row][col];

          // Encode queen position (honey pots are the "queens" in plant game)
          queens += cell.base === 'honey' ? 'Q' : '.';

          // Encode color using COLOR_SYMBOLS mapping
          if (cell.groupColor) {
            layout += COLOR_SYMBOLS[cell.groupColor as keyof typeof COLOR_SYMBOLS];
          } else {
            layout += COLOR_SYMBOLS['undefined'];
          }
        }
      }

      return {
        id,
        layout,
        queens,
        createdAt: new Date().toISOString(),
      };
    },

    // Parse puzzle data from JSON format (for validation)
    parsePuzzleData(puzzleData: any) {
      const gridSize = Math.sqrt(puzzleData.layout.length);
      const layout = puzzleData.layout;
      const queens = puzzleData.queens;

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

      // Initialize grid
      this.initializeGrid();

      // Parse layout (color groups) using SYMBOL_TO_COLOR mapping
      for (let i = 0; i < layout.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const symbol = layout[i];

        if (symbol !== '.') {
          const colorName = SYMBOL_TO_COLOR[symbol];
          if (colorName) {
            this.grid[row][col].groupColor = colorName;
          }
        }
      }

      // Parse queens (honey pot positions)
      for (let i = 0; i < queens.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;

        if (queens[i] === 'Q') {
          this.grid[row][col].base = 'honey';
        }
      }

      // Recalculate ant positions based on honey pot placements
      this.recalculateAntPositions();
    },
  },
});
