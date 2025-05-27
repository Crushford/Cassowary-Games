/**
 * Represents a position in the grid with row and column coordinates.
 */
export interface Pos {
  row: number;
  col: number;
}

/**
 * Represents the puzzle structure (doesn't change during gameplay)
 */
export interface PuzzleGrid {
  size: number;
  colorGroups: Map<string, string>; // "row,col" -> color
  solution: Pos[]; // The correct queen positions
}

/**
 * Represents the player's actions (changes during gameplay)
 */
export interface PlayerGrid {
  queens: Pos[];
  flags: Pos[];
  invalid: Pos[];
}

/**
 * Represents UI state
 */
export interface UIState {
  showSolution: boolean;
  selectedTool: 'queen' | 'flag' | 'color' | null;
  selectedColor: string | null;
}

/**
 * Represents a single square in the game grid (legacy format).
 * Will be phased out as we transition to the new data model.
 */
export interface GridSquare {
  position: Pos;
  groupColor?: string;
  playerMark: 'empty' | 'queen' | 'flag' | 'invalid';
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
  // Legacy grid format - will be phased out
  grid: GridSquare[][];
  gridSize: number;
  moveHistory: { grid: GridSquare[][] }[];

  // New data model
  puzzleGrid: PuzzleGrid;
  playerGrid: PlayerGrid;
  uiState: UIState;

  // Other state
  currentLevel: number;
  availableMoves: Pos[];
  isComplete: boolean;
  errorMessage: string | null;
  savedPuzzles: { name: string; grid: GridSquare[][]; gridSize: number }[];
  currentPuzzle: string | null;
  currentSolution: Pos[];
  solutionQueens: Pos[];
  debugLogs: string[];
  colorToolActive: boolean;
  colorToolSelectedColor: string | null;
  verboseMode: boolean;
}

/**
 * Props for the Square component.
 */
export interface SquareProps {
  row: number;
  col: number;
  mode?: 'player' | 'solution';
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
