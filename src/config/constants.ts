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
    GOLD: 0xffd700,
    DARK_GREEN: 0x1a472a,
    FOREST_GREEN: 0x2d5a27,
    LIGHT_GREEN: 0x90ee90,
    SOIL_BROWN: 0x8b4513,
    HIGHLIGHT_YELLOW: 0xffff00,
    PEBBLE_GRAY: 0x808080,
    DANGER_RED: 0xff0000,
  },

  // Game rules
  THREATENED_DIRECTIONS: {
    ROW: true, // Can queens threaten entire rows?
    COLUMN: true, // Can queens threaten entire columns?
    DIAGONAL: false, // Can queens threaten long diagonals?
    ADJACENT_DIAGONAL: true, // Can queens threaten adjacent diagonals?
  },
};
