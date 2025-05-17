/**
 * Represents a position in the grid with row and column coordinates.
 */
export interface Pos {
  row: number;
  col: number;
}

/**
 * Represents a single square in the game grid.
 */
export interface GridSquare {
  position: Pos;
  state: 'empty' | 'queen' | 'flag' | 'invalid';
  groupColor?: string;
  playerMark?: 'queen' | 'flag';
}

/**
 * Result of a puzzle generation attempt.
 */
export interface AttemptResult {
  attempt: number;
  queens: number;
  requiredQueens: number;
  allFilled: boolean;
  colorGroupsValid: boolean;
  success: boolean;
}

/**
 * Represents the complete game state.
 */
export interface GameState {
  grid: GridSquare[][];
  gridSize: number;
  moveHistory: { grid: GridSquare[][] }[];
  currentLevel: number;
  availableMoves: Pos[];
  isComplete: boolean;
  errorMessage: string | null;
  savedPuzzles: { name: string; grid: GridSquare[][]; gridSize: number }[];
  currentPuzzle: string | null;
  currentSolution: Pos[];
  testLogs: string[];
  testDebugLogs: any[];
}

/**
 * Props for the Square component.
 */
export interface SquareProps {
  row: number;
  col: number;
}

/**
 * Props for the DebugGrid component.
 */
export interface DebugGridProps {
  grid: GridSquare[][];
}

/**
 * Available color names in the game.
 */
export type ColorName =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'teal'
  | 'indigo'
  | 'amber';

/**
 * Tailwind CSS classes for each color.
 */
export interface ColorClasses {
  bg: string; // Background
  text: string; // Text color
  border: string; // Border color
  hoverBg: string; // Hover background
  hoverText: string; // Hover text
}
