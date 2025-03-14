// src/config/constants.ts
export const GAME_CONSTANTS = {
  // Board settings
  GRID_SIZE: 6,
  CELL_SIZE: 75,

  // Game resources
  INITIAL_QUEENS: 30,
  INITIAL_GOLD: 30,
  TOTAL_ACRES: 36,
  OWNED_ACRES: 5,
  PLOTS: 5,

  // UI settings
  COLORS: {
    // Simplified black, white, and gray color scheme
    PRIMARY: 0x000000, // Black - for text and important elements
    SECONDARY: 0x505050, // Dark gray - for less important elements
    BACKGROUND: 0xffffff, // White - for backgrounds
    BG_SECONDARY: 0xf0f0f0, // Light gray - for secondary backgrounds
    BORDER: 0xd1d1d1, // Light gray - for borders
    HIGHLIGHT: 0xe0e0e0, // Medium gray - for highlights
  },

  // UI component default sizes
  UI: {
    BUTTON: {
      DEFAULT_WIDTH: 120,
      DEFAULT_HEIGHT: 40,
      PADDING_X: 16,
      PADDING_Y: 8,
    },
    DIALOG: {
      DEFAULT_WIDTH: 400,
      DEFAULT_HEIGHT: 250,
      BORDER_RADIUS: 4,
    },
    STATUS: {
      DEFAULT_WIDTH: 400,
      DEFAULT_HEIGHT: 50,
    },
    RESOURCE: {
      DEFAULT_WIDTH: 180,
    },
    // Mobile portrait layout dimensions
    LAYOUT: {
      TOP_BAR_HEIGHT: 100,
      BOTTOM_BAR_HEIGHT: 80,
      SIDE_PADDING: 20,
    },
  },

  // Game rules
  THREATENED_DIRECTIONS: {
    ROW: true, // Can queens threaten entire rows?
    COLUMN: true, // Can queens threaten entire columns?
    DIAGONAL: false, // Can queens threaten long diagonals?
    ADJACENT_DIAGONAL: true, // Can queens threaten adjacent diagonals?
  },
};
