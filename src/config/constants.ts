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
    DARK_GREEN: 0x006400,
    FOREST_GREEN: 0x228b22,
    LIGHT_GREEN: 0x32cd32,
    SOIL_BROWN: 0x3d1c00,
  },

  // Game rules
  THREATENED_DIRECTIONS: {
    ROW: true, // Can queens threaten entire rows?
    COLUMN: true, // Can queens threaten entire columns?
    DIAGONAL: false, // Can queens threaten long diagonals?
    ADJACENT_DIAGONAL: true, // Can queens threaten adjacent diagonals?
  },
};
