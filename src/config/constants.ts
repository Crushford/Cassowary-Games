// src/config/constants.ts
export const GAME_CONSTANTS = {
  // Board settings
  GRID_SIZE: 6,
  CELL_SIZE: 80,

  // Game resources
  INITIAL_QUEENS: 30,
  INITIAL_GOLD: 30,
  TOTAL_ACRES: 36,
  OWNED_ACRES: 5,
  PLOTS: 5,

  // UI settings
  COLORS: {
    GOLD: 0x000000, // Black
    DARK_GREEN: 0xffffff, // White
    FOREST_GREEN: 0xffffff, // White
    LIGHT_GREEN: 0xffffff, // White
    SOIL_BROWN: 0x000000, // Black
    HIGHLIGHT_YELLOW: 0x000000, // Black
    PEBBLE_GRAY: 0x000000, // Black
    DANGER_RED: 0x000000, // Black
  },

  // Game rules
  THREATENED_DIRECTIONS: {
    ROW: true, // Can queens threaten entire rows?
    COLUMN: true, // Can queens threaten entire columns?
    DIAGONAL: false, // Can queens threaten long diagonals?
    ADJACENT_DIAGONAL: true, // Can queens threaten adjacent diagonals?
  },
};
