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
  diggingMode: 'auto' | 'dig' | 'flag';
  autoFlagging: boolean;
}

/**
 * Represents a mark on a grid square
 */
export type MarkType = null | 'flag' | 'queen' | 'invalid';

/**
 * Represents a single square in the game grid.
 */
export interface GridSquare {
  position: Pos;
  groupColor?: string;
  isSolutionQueen?: boolean;
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

// Base interface for common properties
interface BaseState {
  grid: GridSquare[][];
  gridSize: number;
  moveHistory: MarkType[][][];
  playerMarks: MarkType[][];
  uiState: {
    showSolution: boolean;
    selectedTool: string | null;
    selectedColor: string | null;
    diggingMode: 'auto' | 'dig' | 'flag';
    autoFlagging: boolean;
  };
  isComplete: boolean;
  errorMessage: string | null;
  debugLogs: string[];
  colorToolActive: boolean;
  colorToolSelectedColor: string | null;
  verboseMode: boolean;
}

// Game-specific state
export interface GameState extends BaseState {
  bites: number;
  honeyPots: number;
  highScore: number;
  currentDay: number;
  currentLevel: number;
  isTrainingDay: boolean;
  savedPuzzles: any[];
  currentPuzzle: string | null;
  puzzleGenerationState: {
    isGenerating: boolean;
    currentStep: string | null;
    completedSteps: number;
    totalSteps: number;
    isInterrupted: boolean;
  };
}

// Level builder-specific state
export interface LevelBuilderState extends BaseState {
  autoTestMarks: MarkType[][];
  savedPuzzles: any[];
  currentPuzzle: string | null;
  puzzleGenerationState: {
    isGenerating: boolean;
    currentStep: string | null;
    completedSteps: number;
    totalSteps: number;
    isInterrupted: boolean;
  };
}

/**
 * Props for the Square component.
 */
export interface SquareProps {
  row: number;
  col: number;
  mode?: 'player' | 'solution' | 'autoTest';
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
