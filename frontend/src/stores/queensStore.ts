import { defineStore } from 'pinia';
import type { GridSquare, Pos, MarkType, ColorName } from '../types/types';
import { COLOR_SYMBOLS } from '../utils/colorPalette';
import { createEmptyGrid, clearMarkers, isValidPosition, clonePlayerMarks } from './gridUtils';
import router from '../router';

// Create reverse mapping from symbols to color names
const SYMBOL_TO_COLOR: Record<string, ColorName> = Object.entries(COLOR_SYMBOLS).reduce(
  (acc, [color, symbol]) => {
    if (color !== 'undefined') {
      acc[symbol] = color as ColorName;
    }
    return acc;
  },
  {} as Record<string, ColorName>
);

export interface TutorialStep {
  id: string;
  instruction: string;
  targetSquare?: Pos | null; // Square to click (null means any square)
  action?: 'click' | 'place-flag' | 'place-queen' | 'complete' | 'mode-selected';
  validate?: (store: any) => boolean; // Custom validation function
}

interface QueensState {
  grid: GridSquare[][];
  gridSize: number;
  moveHistory: MarkType[][][];
  playerMarks: MarkType[][];
  puzzleDatabase: any;
  allPuzzles: any[]; // Flat array of all puzzles ending in -0
  puzzleIdMap: Map<string, any>; // Map from string ID to puzzle
  tutorialPuzzles: any[]; // Tutorial puzzles (level-1 through level-10)
  currentPuzzleIndex: number;
  isComplete: boolean;
  showSolution: boolean; // Whether to reveal the solution
  currentPuzzle: any;
  currentPuzzleId: string | number | null; // Track current puzzle ID for completion tracking
  // Tutorial state
  isTutorialMode: boolean;
  tutorialSteps: TutorialStep[];
  currentTutorialStep: number;
  tutorialInstruction: string | null;
  lastClickedSquare: Pos | null;
  tutorialValidSquares: Pos[]; // Valid squares for current tutorial step
  shouldShakeToast: boolean; // Flag to trigger toast shake animation
  showErrorFeedback: boolean; // Flag to show error feedback (red X)
  errorFeedbackSquare: Pos | null; // Square to show error feedback on
  highlightToolSelector: boolean; // Flag to highlight tool selector in overlay
  // Speed mode state
  isSpeedMode: boolean;
  speedModeTimerDuration: number | null; // Duration in seconds (120 for 2min, 300 for 5min)
  speedModeTimeRemaining: number | null; // Time remaining in seconds
  speedModeSelectedSizes: string[] | null; // Selected sizes or null for sequential
  speedModeCompletedCount: number; // Number of puzzles completed in this session
  speedModeCompletedBySize: Record<string, number>; // Count of completed puzzles by size
  speedModeTimerInterval: number | null; // Interval ID for timer
  speedModeCurrentSizeIndex: number; // Current size index in ordered sizes (0 = 4x4, 1 = 5x5, etc.)
  speedModeCurrentPuzzleIndex: number; // Current puzzle index within current size
  speedModeIsNewRecord: boolean; // Whether the current session set a new record
  speedModePreviousRecord: number; // The previous record before this session (for display)
  // Loading state
  isLoadingPuzzles: boolean; // Whether puzzles are currently being loaded
  loadingProgress: number; // Progress percentage (0-100)
  loadingMessage: string; // Current loading message
  // UI state
  uiState: {
    placementMode: 'auto' | 'flag' | 'queen'; // 'auto', 'flag', or 'queen'
    autoFlagging: boolean; // Automatically flag blocked squares
  };
  // Error tracking for fully flagged groups/rows/columns
  errorSquares: Set<string>; // Set of "row,col" strings for squares that should be red
  flaggedGroupTimestamps: Map<string, number>; // Map of group key -> timestamp when it became fully flagged
  errorCheckInterval: number | null; // Interval ID for periodic error checking
}

// LocalStorage key for completed puzzles
const COMPLETED_PUZZLES_KEY = 'queens-completed-puzzles';
// LocalStorage key for speed mode records (2-minute mode)
const SPEED_MODE_2MIN_RECORD_KEY = 'queens-speed-mode-2min-record';
// LocalStorage key prefix for puzzle progress
const PUZZLE_PROGRESS_KEY_PREFIX = 'queens-puzzle-progress-';

// Helper functions for localStorage
function getCompletedPuzzles(): Set<string> {
  try {
    const stored = localStorage.getItem(COMPLETED_PUZZLES_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (e) {
    console.error('Error reading completed puzzles from localStorage:', e);
  }
  return new Set();
}

function saveCompletedPuzzle(puzzleId: string) {
  try {
    const completed = getCompletedPuzzles();
    completed.add(puzzleId);
    localStorage.setItem(COMPLETED_PUZZLES_KEY, JSON.stringify(Array.from(completed)));
  } catch (e) {
    console.error('Error saving completed puzzle to localStorage:', e);
  }
}

function isPuzzleCompleted(puzzleId: string): boolean {
  return getCompletedPuzzles().has(puzzleId);
}

// Helper functions for speed mode records
function getSpeedMode2MinRecord(): number {
  try {
    const stored = localStorage.getItem(SPEED_MODE_2MIN_RECORD_KEY);
    if (stored) {
      return parseInt(stored, 10);
    }
  } catch (e) {
    console.error('Error reading speed mode 2min record from localStorage:', e);
  }
  return 0;
}

function saveSpeedMode2MinRecord(count: number) {
  try {
    localStorage.setItem(SPEED_MODE_2MIN_RECORD_KEY, String(count));
  } catch (e) {
    console.error('Error saving speed mode 2min record to localStorage:', e);
  }
}

// Helper functions for puzzle progress
function getPuzzleProgressKey(puzzleId: string | number | null): string {
  if (puzzleId === null) return '';
  return `${PUZZLE_PROGRESS_KEY_PREFIX}${puzzleId}`;
}

function savePuzzleProgress(puzzleId: string | number | null, playerMarks: MarkType[][]) {
  if (puzzleId === null) return;
  try {
    const key = getPuzzleProgressKey(puzzleId);
    localStorage.setItem(key, JSON.stringify(playerMarks));
  } catch (e) {
    console.error('Error saving puzzle progress to localStorage:', e);
  }
}

function loadPuzzleProgress(puzzleId: string | number | null): MarkType[][] | null {
  if (puzzleId === null) return null;
  try {
    const key = getPuzzleProgressKey(puzzleId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as MarkType[][];
    }
  } catch (e) {
    console.error('Error loading puzzle progress from localStorage:', e);
  }
  return null;
}

function clearPuzzleProgress(puzzleId: string | number | null) {
  if (puzzleId === null) return;
  try {
    const key = getPuzzleProgressKey(puzzleId);
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Error clearing puzzle progress from localStorage:', e);
  }
}

export const useQueensStore = defineStore('queens', {
  state: (): QueensState => ({
    grid: createEmptyGrid(4),
    gridSize: 4,
    moveHistory: [],
    playerMarks: Array.from({ length: 4 }, () => Array(4).fill(null as MarkType)),
    puzzleDatabase: null,
    allPuzzles: [],
    puzzleIdMap: new Map<string, any>(),
    tutorialPuzzles: [],
    currentPuzzleIndex: 0,
    isComplete: false,
    showSolution: false,
    currentPuzzle: null,
    currentPuzzleId: null,
    // Tutorial state
    isTutorialMode: false,
    tutorialSteps: [],
    currentTutorialStep: 0,
    tutorialInstruction: null,
    lastClickedSquare: null,
    tutorialValidSquares: [],
    shouldShakeToast: false,
    showErrorFeedback: false,
    errorFeedbackSquare: null,
    highlightToolSelector: false,
    // Speed mode state
    isSpeedMode: false,
    speedModeTimerDuration: null,
    speedModeTimeRemaining: null,
    speedModeSelectedSizes: null,
    speedModeCompletedCount: 0,
    speedModeCompletedBySize: {},
    speedModeTimerInterval: null,
    speedModeCurrentSizeIndex: 0,
    speedModeCurrentPuzzleIndex: 0,
    speedModeIsNewRecord: false,
    speedModePreviousRecord: 0,
    // Loading state
    isLoadingPuzzles: false,
    loadingProgress: 0,
    loadingMessage: '',
    // UI state
    uiState: {
      placementMode: 'auto', // 'auto', 'flag', or 'queen'
      autoFlagging: true, // Automatically flag blocked squares
    },
    // Error tracking
    errorSquares: new Set<string>(),
    flaggedGroupTimestamps: new Map<string, number>(),
    errorCheckInterval: null,
  }),

  getters: {
    queenPositions: (state): Pos[] => {
      const positions: Pos[] = [];
      for (let row = 0; row < state.gridSize; row++) {
        for (let col = 0; col < state.gridSize; col++) {
          if (state.playerMarks[row][col] === 'queen') {
            positions.push({ row, col });
          }
        }
      }
      return positions;
    },

    solutionQueenPositions: (state): Pos[] => {
      const sol: Pos[] = [];
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          if (state.grid[r][c].isSolutionQueen) {
            sol.push({ row: r, col: c });
          }
        }
      }
      return sol;
    },

    isValidMove: (state) => (row: number, col: number) => {
      const square = state.grid[row][col];

      // Check if there's a queen in the same row or column
      for (let i = 0; i < state.gridSize; i++) {
        if (state.playerMarks[row][i] === 'queen' || state.playerMarks[i][col] === 'queen') {
          return false;
        }
      }

      // Check diagonally adjacent squares (one square away)
      const diagonalPositions = [
        { r: row - 1, c: col - 1 },
        { r: row - 1, c: col + 1 },
        { r: row + 1, c: col - 1 },
        { r: row + 1, c: col + 1 },
      ];

      for (const pos of diagonalPositions) {
        if (
          isValidPosition(state.grid, pos.r, pos.c) &&
          state.playerMarks[pos.r][pos.c] === 'queen'
        ) {
          return false;
        }
      }

      // Check color group (if the square has a group color)
      if (square.groupColor) {
        for (let r = 0; r < state.gridSize; r++) {
          for (let c = 0; c < state.gridSize; c++) {
            if (
              state.playerMarks[r][c] === 'queen' &&
              state.grid[r][c].groupColor === square.groupColor
            ) {
              return false;
            }
          }
        }
      }

      return true;
    },

    hasErrors: (state): boolean => {
      // Get solution queens
      const solutionQueens: Pos[] = [];
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          if (state.grid[r][c].isSolutionQueen) {
            solutionQueens.push({ row: r, col: c });
          }
        }
      }

      // Get player queens
      const playerQueens: Pos[] = [];
      for (let row = 0; row < state.gridSize; row++) {
        for (let col = 0; col < state.gridSize; col++) {
          if (state.playerMarks[row][col] === 'queen') {
            playerQueens.push({ row, col });
          }
        }
      }

      // Must have exactly the right number of queens
      if (playerQueens.length !== solutionQueens.length) {
        return false; // Not complete yet, so no errors to show
      }

      // Check if all player queens match solution queens
      const solutionSet = new Set(solutionQueens.map((q: Pos) => `${q.row},${q.col}`));
      for (const queen of playerQueens) {
        if (!solutionSet.has(`${queen.row},${queen.col}`)) {
          return true; // Found a queen in wrong position
        }
      }

      return false; // All queens match solution
    },

    isValidPuzzleState: (state): { isValid: boolean; errorMessage: string | null } => {
      // Get player queens
      const playerQueens: Pos[] = [];
      for (let row = 0; row < state.gridSize; row++) {
        for (let col = 0; col < state.gridSize; col++) {
          if (state.playerMarks[row][col] === 'queen') {
            playerQueens.push({ row, col });
          }
        }
      }

      const queenCount = playerQueens.length;
      const requiredQueens = state.gridSize;

      // Check if we have the correct number of queens
      if (queenCount !== requiredQueens) {
        return {
          isValid: false,
          errorMessage: `Need ${requiredQueens} queens, but only ${queenCount} placed`,
        };
      }

      // Get solution queens
      const solutionQueens: Pos[] = [];
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          if (state.grid[r][c].isSolutionQueen) {
            solutionQueens.push({ row: r, col: c });
          }
        }
      }

      const solutionSet = new Set(solutionQueens.map((q: Pos) => `${q.row},${q.col}`));

      for (const queen of playerQueens) {
        if (!solutionSet.has(`${queen.row},${queen.col}`)) {
          return {
            isValid: false,
            errorMessage: 'Some queens are placed in incorrect positions',
          };
        }
      }

      return { isValid: true, errorMessage: null };
    },

    currentTutorialTarget: (state): Pos | null => {
      if (!state.isTutorialMode || state.currentTutorialStep >= state.tutorialSteps.length) {
        return null;
      }
      const step = state.tutorialSteps[state.currentTutorialStep];
      return step.targetSquare || null;
    },

    isSquareInError:
      (state) =>
      (row: number, col: number): boolean => {
        return state.errorSquares.has(`${row},${col}`);
      },
  },

  actions: {
    initializeGrid() {
      // Stop error checking
      this.stopErrorChecking();

      this.grid = createEmptyGrid(this.gridSize);
      this.moveHistory = [];
      this.isComplete = false;
      this.showSolution = false;
      this.playerMarks = Array.from({ length: this.gridSize }, () =>
        Array(this.gridSize).fill(null as MarkType)
      );

      // Start error checking
      this.startErrorChecking();
    },

    saveToHistory() {
      this.moveHistory.push(clonePlayerMarks(this.playerMarks));
    },

    handleUndo() {
      if (this.moveHistory.length > 0) {
        const lastPlayerMarks = this.moveHistory.pop();
        if (lastPlayerMarks) {
          // Clone the restored state to avoid reference issues
          this.playerMarks = clonePlayerMarks(lastPlayerMarks);

          // If auto-flagging is enabled, recalculate flags based on current queens
          // updateBlockedMoves only flags unmarked squares, so it won't remove correct flags
          if (this.uiState.autoFlagging) {
            this.updateBlockedMoves();
          }

          // Save progress to localStorage after undo
          savePuzzleProgress(this.currentPuzzleId, this.playerMarks);

          // Clear error feedback when undoing
          this.showErrorFeedback = false;
          this.errorFeedbackSquare = null;
        }
      }
    },

    placeFlag(row: number, col: number) {
      this.saveToHistory();
      this.playerMarks[row][col] = 'flag';
      // Save progress to localStorage
      savePuzzleProgress(this.currentPuzzleId, this.playerMarks);
      // Check for error conditions immediately
      this.checkFullyFlaggedGroups();
      return true;
    },

    placeQueen(row: number, col: number) {
      this.saveToHistory();
      this.playerMarks[row][col] = 'queen';
      // Auto-flag blocked squares when placing a queen (if enabled)
      if (this.uiState.autoFlagging) {
        this.updateBlockedMoves();
      }
      // Save progress to localStorage
      savePuzzleProgress(this.currentPuzzleId, this.playerMarks);
      this.checkBoardCompletion();

      // Check tutorial step after placing queen
      if (this.isTutorialMode) {
        // Check if we've placed 3 queens (single-square colors)
        const queenCount = this.queenPositions.length;
        if (queenCount === 3) {
          // Find the step that should trigger after 3 queens
          const currentStepIndex = this.currentTutorialStep;
          const currentStep = this.tutorialSteps[currentStepIndex];

          // If we're on a place-queen step, advance to the "3 queens placed" message
          if (currentStep && currentStep.action === 'place-queen') {
            // Find the next step that's the "3 queens placed" message
            for (let i = currentStepIndex + 1; i < this.tutorialSteps.length; i++) {
              const step = this.tutorialSteps[i];
              if (step.id === 'three-queens-placed') {
                this.currentTutorialStep = i;
                this.updateTutorialInstruction();
                return;
              }
            }
          }
        }

        this.checkTutorialStep({ row, col }, 'place-queen');
      }

      return true;
    },

    removeMark(row: number, col: number) {
      const wasQueen = this.playerMarks[row][col] === 'queen';
      this.saveToHistory();
      this.playerMarks[row][col] = null;

      // If we removed a queen, recalculate blocked moves
      if (wasQueen) {
        // Clear all flags first, then recalculate
        for (let r = 0; r < this.gridSize; r++) {
          for (let c = 0; c < this.gridSize; c++) {
            if (this.playerMarks[r][c] === 'flag') {
              this.playerMarks[r][c] = null;
            }
          }
        }
        // Re-flag based on remaining queens (if auto-flagging is enabled)
        if (this.uiState.autoFlagging) {
          this.updateBlockedMoves();
        }
      }
      // Save progress to localStorage
      savePuzzleProgress(this.currentPuzzleId, this.playerMarks);
      // Check for error conditions immediately
      this.checkFullyFlaggedGroups();
    },

    handleSquareClick(row: number, col: number) {
      // Track clicked square for tutorial
      this.lastClickedSquare = { row, col };

      // Clear any previous error feedback
      this.showErrorFeedback = false;
      this.errorFeedbackSquare = null;

      const mode = this.uiState.placementMode;
      const currentMark = this.playerMarks[row][col];

      // Handle clicks based on placement mode
      if (mode === 'flag') {
        // Flag mode: toggle flag only
        if (currentMark === null) {
          this.placeFlag(row, col);
        } else if (currentMark === 'flag') {
          this.removeMark(row, col);
        } else if (currentMark === 'queen') {
          // Remove queen first, then can place flag
          this.removeMark(row, col);
        }
        return;
      } else if (mode === 'queen') {
        // Queen mode: place or remove queen directly
        if (currentMark === null) {
          // In tutorial mode, check if this is a solution queen
          if (this.isTutorialMode) {
            const solutionQueens = this.solutionQueenPositions;
            const isSolutionQueen = solutionQueens.some(
              (queen) => queen.row === row && queen.col === col
            );

            if (!isSolutionQueen) {
              // Show error feedback
              this.showErrorFeedback = true;
              this.errorFeedbackSquare = { row, col };
              this.shakeToast();
              // Clear error feedback after 2 seconds
              setTimeout(() => {
                this.showErrorFeedback = false;
                this.errorFeedbackSquare = null;
              }, 2000);
              return;
            }
          }

          // Check if it's a valid move for placing a queen
          if (this.isValidMove(row, col)) {
            this.placeQueen(row, col);
            // Tutorial step checking is done in placeQueen
          } else {
            // Invalid move - show error feedback
            if (this.isTutorialMode) {
              this.showErrorFeedback = true;
              this.errorFeedbackSquare = { row, col };
              this.shakeToast();
              // Clear error feedback after 2 seconds
              setTimeout(() => {
                this.showErrorFeedback = false;
                this.errorFeedbackSquare = null;
              }, 2000);
            }
          }
        } else if (currentMark === 'queen') {
          // Remove queen
          this.removeMark(row, col);
        } else if (currentMark === 'flag') {
          // Remove flag and place queen if valid
          this.removeMark(row, col);
          if (this.isValidMove(row, col)) {
            this.placeQueen(row, col);
            // Tutorial step checking is done in placeQueen
          }
        }
        return;
      } else {
        // Auto mode: first click flag, second click queen, third click remove
        if (currentMark === null) {
          // First click: place flag
          this.placeFlag(row, col);
          // Check tutorial step completion
          if (this.isTutorialMode) {
            this.checkTutorialStep({ row, col }, 'place-flag');
          }
        } else if (currentMark === 'flag') {
          // Second click: place queen
          this.placeQueen(row, col);
          // Check tutorial step completion
          if (this.isTutorialMode) {
            this.checkTutorialStep({ row, col }, 'place-queen');
          }
        } else if (currentMark === 'queen') {
          // Third click: remove mark
          this.removeMark(row, col);
        }
      }
    },

    checkBoardCompletion() {
      const queenCount = this.queenPositions.length;
      const requiredQueens = this.gridSize;

      // First check: must have the correct number of queens
      if (queenCount !== requiredQueens) {
        this.isComplete = false;
        return;
      }

      // Second check: validate that all queens are in correct positions
      const validation = this.isValidPuzzleState;
      if (validation.isValid) {
        this.isComplete = true;
        // Save completion to localStorage
        if (this.currentPuzzleId !== null) {
          const puzzleId =
            typeof this.currentPuzzleId === 'string'
              ? this.currentPuzzleId
              : String(this.currentPuzzleId);
          saveCompletedPuzzle(puzzleId);
          // Clear saved progress since puzzle is completed
          clearPuzzleProgress(this.currentPuzzleId);
        }
        // Check tutorial completion step
        if (this.isTutorialMode) {
          this.checkTutorialStep(null, 'complete');
        }
        // Handle speed mode completion
        if (this.isSpeedMode) {
          this.onSpeedModePuzzleComplete();
        }
        // Don't reveal solution - just mark as complete
      } else {
        // Has errors - don't complete, but keep the error state
        this.isComplete = false;
      }
    },

    async loadPuzzleDatabase() {
      console.log('[queensStore] loadPuzzleDatabase called');
      this.isLoadingPuzzles = true;
      this.loadingProgress = 0;
      this.loadingMessage = 'Loading puzzle database...';

      try {
        const response = await fetch('/puzzles.json', { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error(`Failed to load puzzles.json: ${response.status}`);
        }
        const data = await response.json();
        console.log('[queensStore] Loaded puzzles.json, sizes:', Object.keys(data));

        // Just store the raw data. No filtering, no reordering, no maps.
        this.puzzleDatabase = data;
        this.puzzleIdMap = new Map<string, any>(); // optional cache; stays empty for now
        this.allPuzzles = []; // not needed anymore, but keep type happy

        this.loadingProgress = 100;
        this.loadingMessage = 'Puzzles loaded';

        await new Promise((resolve) => setTimeout(resolve, 200));

        this.isLoadingPuzzles = false;
        this.loadingProgress = 0;
        this.loadingMessage = '';

        console.log('[queensStore] Database loaded (raw):', {
          sizes: Object.keys(this.puzzleDatabase),
        });

        return true;
      } catch (error) {
        console.error('[queensStore] Error loading puzzle database:', error);
        this.isLoadingPuzzles = false;
        this.loadingProgress = 0;
        this.loadingMessage = '';
        return false;
      }
    },

    parsePuzzleData(puzzleData: any) {
      const gridSize = Math.sqrt(puzzleData.layout.length);
      this.gridSize = gridSize;
      const layout = puzzleData.layout;
      const queens = puzzleData.queens;

      // Initialize grid
      this.initializeGrid();

      // Set current puzzle ID for progress tracking
      this.currentPuzzleId = puzzleData.name || puzzleData.id;

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

      // Parse queens (solution)
      for (let i = 0; i < queens.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;

        if (queens[i] === 'Q') {
          this.grid[row][col].isSolutionQueen = true;
        }
      }

      this.currentPuzzle = puzzleData;

      // Load saved progress if puzzle is not completed
      const puzzleId = puzzleData.name || puzzleData.id;
      const puzzleIdString = typeof puzzleId === 'string' ? puzzleId : String(puzzleId);
      if (!isPuzzleCompleted(puzzleIdString)) {
        const savedProgress = loadPuzzleProgress(puzzleId);
        if (savedProgress && savedProgress.length === gridSize) {
          // Validate that saved progress matches current grid size
          let isValid = true;
          for (let r = 0; r < gridSize; r++) {
            if (!savedProgress[r] || savedProgress[r].length !== gridSize) {
              isValid = false;
              break;
            }
          }
          if (isValid) {
            this.playerMarks = savedProgress;
            // Recalculate blocked moves if auto-flagging is enabled
            if (this.uiState.autoFlagging) {
              this.updateBlockedMoves();
            }
          }
        }
      }

      // Start error checking for fully flagged groups
      this.startErrorChecking();
    },

    getNextPuzzle() {
      if (!this.puzzleDatabase) {
        return null;
      }

      const sizeKey = `${this.gridSize}x${this.gridSize}`;
      const puzzlesForSize = this.puzzleDatabase[sizeKey];

      if (!puzzlesForSize || puzzlesForSize.length === 0) {
        return null;
      }

      const selectedPuzzle = puzzlesForSize[this.currentPuzzleIndex % puzzlesForSize.length];
      this.currentPuzzleIndex++;
      return selectedPuzzle;
    },

    async loadRandomPuzzle() {
      // Load database if not already loaded
      if (!this.puzzleDatabase) {
        const success = await this.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
      }

      // Get the next puzzle in sequence
      const puzzle = this.getNextPuzzle();
      if (!puzzle) {
        throw new Error(`No puzzles available for ${this.gridSize}x${this.gridSize} grid`);
      }

      // Parse and load the puzzle
      this.parsePuzzleData(puzzle);
    },

    findPuzzleById(id: string): any | null {
      if (!this.puzzleDatabase) return null;

      // If we ever decide to cache, use puzzleIdMap
      const cached = this.puzzleIdMap.get(id);
      if (cached) return cached;

      for (const [sizeKey, sizePuzzles] of Object.entries<any[]>(this.puzzleDatabase)) {
        const found = sizePuzzles.find((p) => p.id === id);
        if (found) {
          // Optional: cache it for future lookups
          this.puzzleIdMap.set(id, found);
          return found;
        }
      }

      return null;
    },

    async loadPuzzleById(puzzleId: string | number) {
      console.log('[queensStore] loadPuzzleById called with:', puzzleId, typeof puzzleId);
      try {
        console.log('[queensStore] Checking puzzleDatabase:', {
          hasDatabase: !!this.puzzleDatabase,
          mapSize: this.puzzleIdMap.size,
        });

        if (!this.puzzleDatabase) {
          console.log('[queensStore] Loading puzzle database...');
          const success = await this.loadPuzzleDatabase();
          console.log('[queensStore] Database load result:', success);
          if (!success) {
            throw new Error('Failed to load puzzle database');
          }
        }

        const key = typeof puzzleId === 'string' ? puzzleId : String(puzzleId);
        console.log('[queensStore] Using string key:', key);

        const puzzle = this.findPuzzleById(key);
        console.log('[queensStore] Puzzle lookup result:', puzzle ? 'found' : 'not found');

        if (!puzzle) {
          throw new Error(`Puzzle with ID ${key} not found`);
        }

        console.log('[queensStore] Parsing puzzle data:', puzzle.id);
        this.parsePuzzleData(puzzle);
        console.log('[queensStore] Puzzle loaded successfully');
      } catch (error) {
        console.error('[queensStore] Error loading puzzle by ID:', error);
        console.error('[queensStore] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    clearMarkers() {
      // Stop error checking
      this.stopErrorChecking();

      // Clear all marks by setting each cell to null
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.playerMarks[row][col] = null;
        }
      }
      this.isComplete = false;
      this.showSolution = false;
      // Clear history when clearing markers
      this.moveHistory = [];
      // Clear saved progress when clearing markers
      clearPuzzleProgress(this.currentPuzzleId);

      // Restart error checking
      this.startErrorChecking();
    },

    clearAll() {
      // Clear all marks and reset history
      this.clearMarkers();
    },

    updateBlockedMoves() {
      // Flag all squares that are no longer valid moves after placing queens
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          // Only flag squares that are currently unmarked
          if (this.playerMarks[row][col] === null) {
            if (!this.isValidMove(row, col)) {
              this.playerMarks[row][col] = 'flag';
            }
          }
        }
      }
      // Check for error conditions after auto-flagging
      this.checkFullyFlaggedGroups();
    },

    // Load tutorial puzzle by name (e.g., "level-1")
    async loadTutorialPuzzle(levelName: string) {
      if (!this.puzzleDatabase) {
        const success = await this.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
      }

      // Build tutorialPuzzles only once, on demand
      if (!this.tutorialPuzzles.length) {
        const tutorials: any[] = [];

        for (const sizePuzzles of Object.values<any[]>(this.puzzleDatabase)) {
          for (const puzzle of sizePuzzles) {
            if (
              puzzle.name &&
              typeof puzzle.name === 'string' &&
              puzzle.name.startsWith('level-') &&
              typeof puzzle.id === 'string' &&
              puzzle.id.endsWith('-0')
            ) {
              tutorials.push(puzzle);
            }
          }
        }

        tutorials.sort((a, b) => {
          const aNum = Number(String(a.name).slice(6));
          const bNum = Number(String(b.name).slice(6));
          return aNum - bNum;
        });

        this.tutorialPuzzles = tutorials;
        console.log('[queensStore] Built tutorialPuzzles:', this.tutorialPuzzles.length);
      }

      const tutorialPuzzle = this.tutorialPuzzles.find((p) => p.name === levelName);
      if (!tutorialPuzzle) {
        throw new Error(`Tutorial puzzle ${levelName} not found`);
      }

      this.parsePuzzleData(tutorialPuzzle);
    },

    // Check if a puzzle is completed
    isPuzzleCompleted(puzzleId: string | number): boolean {
      const id = typeof puzzleId === 'string' ? puzzleId : String(puzzleId);
      return isPuzzleCompleted(id);
    },

    // Tutorial functions
    initializeTutorial(steps: TutorialStep[], validSquares?: Pos[]) {
      this.isTutorialMode = true;
      this.tutorialSteps = steps;
      this.currentTutorialStep = 0;
      this.tutorialValidSquares = validSquares || [];
      this.shouldShakeToast = false;
      this.updateTutorialInstruction();
    },

    updateTutorialInstruction() {
      if (this.currentTutorialStep < this.tutorialSteps.length) {
        const currentStep = this.tutorialSteps[this.currentTutorialStep];

        // Skip select-queen-mode step if queen mode is already selected
        if (currentStep.id === 'select-queen-mode' && this.uiState.placementMode === 'queen') {
          console.log('[QueensStore] Queen mode already selected, skipping step');
          this.nextTutorialStep();
          return;
        }

        this.tutorialInstruction = currentStep.instruction;

        // Show overlay for tool selector step
        this.highlightToolSelector = currentStep.id === 'select-queen-mode';

        // Auto-advance explanation steps after 5 seconds
        if (currentStep.id.startsWith('explain-') && currentStep.action === undefined) {
          setTimeout(() => {
            // Only advance if we're still on this step
            if (
              this.isTutorialMode &&
              this.currentTutorialStep < this.tutorialSteps.length &&
              this.tutorialSteps[this.currentTutorialStep].id === currentStep.id
            ) {
              this.nextTutorialStep();
            }
          }, 5000);
        }

        console.log('[QueensStore] updateTutorialInstruction:', {
          currentStepId: currentStep.id,
          highlightToolSelector: this.highlightToolSelector,
        });
      } else {
        // Tutorial complete
        this.tutorialInstruction = null;
        this.highlightToolSelector = false;
      }
    },

    shakeToast() {
      this.shouldShakeToast = true;
      // Reset shake flag after animation
      setTimeout(() => {
        this.shouldShakeToast = false;
      }, 500);
    },

    checkTutorialStep(clickedPos: Pos | null, action: string) {
      if (!this.isTutorialMode || this.currentTutorialStep >= this.tutorialSteps.length) {
        return;
      }

      const currentStep = this.tutorialSteps[this.currentTutorialStep];
      console.log('[QueensStore] checkTutorialStep:', {
        currentStepId: currentStep.id,
        action,
        placementMode: this.uiState.placementMode,
        clickedPos,
      });

      // Special handling for mode selection step
      if (currentStep.id === 'select-queen-mode') {
        // Check if mode is set to 'queen'
        if (this.uiState.placementMode === 'queen') {
          console.log('[QueensStore] Mode is queen, advancing tutorial step');
          this.nextTutorialStep();
        } else {
          console.log('[QueensStore] Mode is not queen yet:', this.uiState.placementMode);
        }
        return;
      }

      // Check if action matches
      if (currentStep.action && currentStep.action !== action) {
        return;
      }

      // For place-queen steps, check if clicked square is a solution queen
      if (action === 'place-queen' && clickedPos) {
        const solutionQueens = this.solutionQueenPositions;
        const isSolutionQueen = solutionQueens.some(
          (queen) => queen.row === clickedPos.row && queen.col === clickedPos.col
        );

        if (!isSolutionQueen) {
          // Not a solution queen - show error feedback
          this.showErrorFeedback = true;
          this.errorFeedbackSquare = clickedPos;
          this.shakeToast();
          setTimeout(() => {
            this.showErrorFeedback = false;
            this.errorFeedbackSquare = null;
          }, 2000);
          return; // Don't advance step
        }
      }

      // Check if target square matches (if specified and not checking solution queens)
      if (
        currentStep.targetSquare !== undefined &&
        currentStep.targetSquare !== null &&
        action !== 'place-queen'
      ) {
        if (
          !clickedPos ||
          clickedPos.row !== currentStep.targetSquare.row ||
          clickedPos.col !== currentStep.targetSquare.col
        ) {
          return;
        }
      }

      // Check custom validation if provided
      if (currentStep.validate && !currentStep.validate(this)) {
        return;
      }

      // Step completed, move to next
      this.nextTutorialStep();
    },

    nextTutorialStep() {
      if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
        this.currentTutorialStep++;
        this.updateTutorialInstruction();

        // Update valid squares based on current step
        const currentStep = this.tutorialSteps[this.currentTutorialStep];
        if (
          currentStep &&
          currentStep.targetSquare === null &&
          currentStep.action === 'place-queen'
        ) {
          // For steps with null targetSquare, allow any valid square
          this.tutorialValidSquares = [];
        }
      } else {
        // Tutorial complete
        this.tutorialInstruction = null;
        this.highlightToolSelector = false;
      }
    },

    exitTutorialMode() {
      this.isTutorialMode = false;
      this.tutorialSteps = [];
      this.currentTutorialStep = 0;
      this.tutorialInstruction = null;
      this.lastClickedSquare = null;
      this.tutorialValidSquares = [];
      this.shouldShakeToast = false;
      this.showErrorFeedback = false;
      this.errorFeedbackSquare = null;
      this.highlightToolSelector = false;
    },

    // UI state management
    setPlacementMode(mode: 'auto' | 'flag' | 'queen') {
      console.log('[QueensStore] setPlacementMode called:', mode);
      console.log('[QueensStore] isTutorialMode:', this.isTutorialMode);
      console.log('[QueensStore] currentTutorialStep:', this.currentTutorialStep);
      console.log('[QueensStore] tutorialSteps:', this.tutorialSteps);

      this.uiState.placementMode = mode;
      // Check if tutorial is waiting for mode selection
      if (this.isTutorialMode) {
        console.log('[QueensStore] Checking tutorial step after mode change');
        this.checkTutorialStep(null, 'mode-selected');
      }
    },

    setAutoFlagging(enabled: boolean) {
      this.uiState.autoFlagging = enabled;
      // If enabling auto-flagging, update flags based on current queens
      if (enabled) {
        this.updateBlockedMoves();
      }
      // When disabling, don't remove existing flags - just prevent future auto-flagging
    },
    async startNextPuzzle() {
      // Load database if not already loaded
      if (!this.puzzleDatabase) {
        const success = await this.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
      }

      // Require a current puzzle; if missing, redirect to /queens and return
      if (!this.currentPuzzle) {
        router.push('/queens');
        return;
      }

      // Derive the size key and puzzles list
      const sizeKey = `${this.gridSize}x${this.gridSize}`;
      const puzzlesForSize = this.puzzleDatabase[sizeKey];

      if (!puzzlesForSize || puzzlesForSize.length === 0) {
        router.push('/queens');
        return;
      }

      // Find the current puzzle index by its string ID
      const currentId = this.currentPuzzle?.id;
      const currentIndex = puzzlesForSize.findIndex((p: any) => p.id === currentId);

      // Compute the next index cyclically
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % puzzlesForSize.length : 0;
      const selectedPuzzle = puzzlesForSize[nextIndex];

      // Navigate using the string ID
      router.push(`/queens/${selectedPuzzle.id}`);
    },

    // Speed mode functions
    startSpeedMode(timerDuration: number, selectedSizes: string[] | null) {
      this.isSpeedMode = true;
      this.speedModeTimerDuration = timerDuration;
      this.speedModeTimeRemaining = timerDuration;
      this.speedModeSelectedSizes = selectedSizes;
      this.speedModeCompletedCount = 0;
      this.speedModeCompletedBySize = {};
      // Reset to start from beginning (4x4)
      this.speedModeCurrentSizeIndex = 0;
      this.speedModeCurrentPuzzleIndex = 0;

      // Start timer
      this.speedModeTimerInterval = window.setInterval(() => {
        if (this.speedModeTimeRemaining !== null && this.speedModeTimeRemaining > 0) {
          this.speedModeTimeRemaining--;
        } else {
          // Timer reached 0 - stop timer but keep isSpeedMode true so modal can show
          if (this.speedModeTimerInterval !== null) {
            clearInterval(this.speedModeTimerInterval);
            this.speedModeTimerInterval = null;
          }
          this.speedModeTimeRemaining = 0;

          // Check and save record for 2-minute mode
          if (this.speedModeTimerDuration === 120) {
            const currentRecord = getSpeedMode2MinRecord();
            this.speedModePreviousRecord = currentRecord; // Store previous record for display
            if (this.speedModeCompletedCount > currentRecord) {
              this.speedModeIsNewRecord = true;
              saveSpeedMode2MinRecord(this.speedModeCompletedCount);
            } else {
              this.speedModeIsNewRecord = false;
            }
          }
        }
      }, 1000);
    },

    endSpeedMode() {
      if (this.speedModeTimerInterval !== null) {
        clearInterval(this.speedModeTimerInterval);
        this.speedModeTimerInterval = null;
      }
      this.isSpeedMode = false;
      this.speedModeTimeRemaining = null;
    },

    resetSpeedMode() {
      this.endSpeedMode();
      this.speedModeTimerDuration = null;
      this.speedModeSelectedSizes = null;
      this.speedModeCompletedCount = 0;
      this.speedModeCompletedBySize = {};
      this.speedModeCurrentSizeIndex = 0;
      this.speedModeCurrentPuzzleIndex = 0;
      this.speedModeIsNewRecord = false;
      this.speedModePreviousRecord = 0;
    },

    getSpeedMode2MinRecord(): number {
      return getSpeedMode2MinRecord();
    },

    getAvailableSizes(): string[] {
      if (!this.puzzleDatabase) return [];

      const sizeKeys = Object.keys(this.puzzleDatabase);
      return sizeKeys.sort((a, b) => {
        const aSize = parseInt(a.split('x')[0], 10);
        const bSize = parseInt(b.split('x')[0], 10);
        return aSize - bSize;
      });
    },

    getNextUncompletedPuzzleForSize(sizeKey: string): any | null {
      if (!this.puzzleDatabase || !this.puzzleDatabase[sizeKey]) {
        return null;
      }

      const completedPuzzles = getCompletedPuzzles();
      const puzzlesForSize = this.puzzleDatabase[sizeKey] || [];

      // Find first uncompleted puzzle
      for (const puzzle of puzzlesForSize) {
        const puzzleId = String(puzzle.id);
        if (!completedPuzzles.has(puzzleId)) {
          return puzzle;
        }
      }

      // All puzzles completed for this size
      return null;
    },

    getPuzzleProgress(puzzleId: string | number | null): MarkType[][] | null {
      return loadPuzzleProgress(puzzleId);
    },

    async getNextSequentialUncompletedPuzzle(): Promise<any | null> {
      if (!this.puzzleDatabase) {
        const success = await this.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
      }

      const completedPuzzles = getCompletedPuzzles();
      const availableSizes = this.speedModeSelectedSizes || this.getAvailableSizes();

      // Start from current size index and find next uncompleted puzzle
      for (
        let sizeIdx = this.speedModeCurrentSizeIndex;
        sizeIdx < availableSizes.length;
        sizeIdx++
      ) {
        const sizeKey = availableSizes[sizeIdx];
        const puzzlesForSize = this.puzzleDatabase[sizeKey] || [];

        // Start from current puzzle index for current size, or 0 for new sizes
        const startIndex =
          sizeIdx === this.speedModeCurrentSizeIndex ? this.speedModeCurrentPuzzleIndex : 0;

        // Find next uncompleted puzzle in this size (skip completed and in-progress puzzles)
        for (let puzzleIdx = startIndex; puzzleIdx < puzzlesForSize.length; puzzleIdx++) {
          const puzzle = puzzlesForSize[puzzleIdx];
          const puzzleId = String(puzzle.id);

          // Skip if puzzle is completed
          if (completedPuzzles.has(puzzleId)) {
            continue;
          }

          // Skip if puzzle has saved progress (in progress)
          const progress = loadPuzzleProgress(puzzleId);
          if (progress && progress.length > 0) {
            // Check if progress has any marks (not all null)
            const hasMarks = progress.some((row) => row && row.some((mark) => mark !== null));
            if (hasMarks) {
              continue; // Skip puzzles in progress
            }
          }

          // Found an unstarted, uncompleted puzzle - update indices
          this.speedModeCurrentSizeIndex = sizeIdx;
          this.speedModeCurrentPuzzleIndex = puzzleIdx;
          return puzzle;
        }

        // All puzzles in this size are completed or in progress, move to next size
        this.speedModeCurrentSizeIndex = sizeIdx + 1;
        this.speedModeCurrentPuzzleIndex = 0;
      }

      // All puzzles completed or in progress
      return null;
    },

    async startSpeedModePuzzle() {
      const puzzle = await this.getNextSequentialUncompletedPuzzle();
      if (!puzzle) {
        // All puzzles completed, end speed mode
        this.endSpeedMode();
        router.push('/queens');
        return;
      }
      router.push(`/queens/${puzzle.id}`);
    },

    onSpeedModePuzzleComplete() {
      if (!this.isSpeedMode) return;

      this.speedModeCompletedCount++;
      const sizeKey = `${this.gridSize}x${this.gridSize}`;
      this.speedModeCompletedBySize[sizeKey] = (this.speedModeCompletedBySize[sizeKey] || 0) + 1;

      // Move to next size for sequential mode (complete one puzzle per size, then move to next)
      const availableSizes = this.speedModeSelectedSizes || this.getAvailableSizes();
      const currentSizeIndex = availableSizes.indexOf(sizeKey);

      if (currentSizeIndex >= 0 && currentSizeIndex < availableSizes.length - 1) {
        // Move to next size
        this.speedModeCurrentSizeIndex = currentSizeIndex + 1;
        this.speedModeCurrentPuzzleIndex = 0;
      } else if (currentSizeIndex === availableSizes.length - 1) {
        // We're at the last size, loop back to first size
        this.speedModeCurrentSizeIndex = 0;
        this.speedModeCurrentPuzzleIndex = 0;
      }

      // Auto-load next puzzle
      this.startSpeedModePuzzle();
    },

    // Error detection for fully flagged groups/rows/columns and multiple queens
    checkFullyFlaggedGroups() {
      const now = Date.now();
      const fullyFlaggedGroups = new Set<string>();
      const errorSquaresSet = new Set<string>();

      // Check rows for fully flagged
      for (let row = 0; row < this.gridSize; row++) {
        const isFullyFlagged = this.playerMarks[row].every((mark) => mark === 'flag');
        if (isFullyFlagged) {
          const groupKey = `row-flag-${row}`;
          fullyFlaggedGroups.add(groupKey);

          // Check if this group was already flagged
          const timestamp = this.flaggedGroupTimestamps.get(groupKey);
          if (!timestamp) {
            // First time we see this group fully flagged, record timestamp
            this.flaggedGroupTimestamps.set(groupKey, now);
          } else {
            // Check if it's been flagged for more than 1 second
            if (now - timestamp >= 1000) {
              // Mark all squares in this row as errors
              for (let col = 0; col < this.gridSize; col++) {
                errorSquaresSet.add(`${row},${col}`);
              }
            }
          }
        } else {
          // Row is no longer fully flagged, remove timestamp
          this.flaggedGroupTimestamps.delete(`row-flag-${row}`);
        }
      }

      // Check rows for multiple queens
      for (let row = 0; row < this.gridSize; row++) {
        const queenPositions: number[] = [];
        for (let col = 0; col < this.gridSize; col++) {
          if (this.playerMarks[row][col] === 'queen') {
            queenPositions.push(col);
          }
        }
        if (queenPositions.length > 1) {
          const groupKey = `row-queen-${row}`;
          fullyFlaggedGroups.add(groupKey);

          const timestamp = this.flaggedGroupTimestamps.get(groupKey);
          if (!timestamp) {
            this.flaggedGroupTimestamps.set(groupKey, now);
          } else {
            if (now - timestamp >= 1000) {
              // Mark all queens in this row as errors
              for (const col of queenPositions) {
                errorSquaresSet.add(`${row},${col}`);
              }
            }
          }
        } else {
          this.flaggedGroupTimestamps.delete(`row-queen-${row}`);
        }
      }

      // Check columns for fully flagged
      for (let col = 0; col < this.gridSize; col++) {
        const isFullyFlagged = this.playerMarks.every((row) => row[col] === 'flag');
        if (isFullyFlagged) {
          const groupKey = `col-flag-${col}`;
          fullyFlaggedGroups.add(groupKey);

          const timestamp = this.flaggedGroupTimestamps.get(groupKey);
          if (!timestamp) {
            this.flaggedGroupTimestamps.set(groupKey, now);
          } else {
            if (now - timestamp >= 1000) {
              // Mark all squares in this column as errors
              for (let row = 0; row < this.gridSize; row++) {
                errorSquaresSet.add(`${row},${col}`);
              }
            }
          }
        } else {
          this.flaggedGroupTimestamps.delete(`col-flag-${col}`);
        }
      }

      // Check columns for multiple queens
      for (let col = 0; col < this.gridSize; col++) {
        const queenPositions: number[] = [];
        for (let row = 0; row < this.gridSize; row++) {
          if (this.playerMarks[row][col] === 'queen') {
            queenPositions.push(row);
          }
        }
        if (queenPositions.length > 1) {
          const groupKey = `col-queen-${col}`;
          fullyFlaggedGroups.add(groupKey);

          const timestamp = this.flaggedGroupTimestamps.get(groupKey);
          if (!timestamp) {
            this.flaggedGroupTimestamps.set(groupKey, now);
          } else {
            if (now - timestamp >= 1000) {
              // Mark all queens in this column as errors
              for (const row of queenPositions) {
                errorSquaresSet.add(`${row},${col}`);
              }
            }
          }
        } else {
          this.flaggedGroupTimestamps.delete(`col-queen-${col}`);
        }
      }

      // Check color groups for fully flagged
      const colorGroups: { [color: string]: { row: number; col: number }[] } = {};
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const color = this.grid[row][col].groupColor;
          if (!color) continue;

          if (!colorGroups[color]) {
            colorGroups[color] = [];
          }
          colorGroups[color].push({ row, col });
        }
      }

      for (const color in colorGroups) {
        const squares = colorGroups[color];
        const isFullyFlagged = squares.every(
          (pos) => this.playerMarks[pos.row][pos.col] === 'flag'
        );

        if (isFullyFlagged) {
          const groupKey = `color-flag-${color}`;
          fullyFlaggedGroups.add(groupKey);

          const timestamp = this.flaggedGroupTimestamps.get(groupKey);
          if (!timestamp) {
            this.flaggedGroupTimestamps.set(groupKey, now);
          } else {
            if (now - timestamp >= 1000) {
              // Mark all squares in this color group as errors
              for (const pos of squares) {
                errorSquaresSet.add(`${pos.row},${pos.col}`);
              }
            }
          }
        } else {
          this.flaggedGroupTimestamps.delete(`color-flag-${color}`);
        }
      }

      // Check color groups for multiple queens
      for (const color in colorGroups) {
        const squares = colorGroups[color];
        const queenPositions: { row: number; col: number }[] = [];
        for (const pos of squares) {
          if (this.playerMarks[pos.row][pos.col] === 'queen') {
            queenPositions.push(pos);
          }
        }
        if (queenPositions.length > 1) {
          const groupKey = `color-queen-${color}`;
          fullyFlaggedGroups.add(groupKey);

          const timestamp = this.flaggedGroupTimestamps.get(groupKey);
          if (!timestamp) {
            this.flaggedGroupTimestamps.set(groupKey, now);
          } else {
            if (now - timestamp >= 1000) {
              // Mark all queens in this color group as errors
              for (const pos of queenPositions) {
                errorSquaresSet.add(`${pos.row},${pos.col}`);
              }
            }
          }
        } else {
          this.flaggedGroupTimestamps.delete(`color-queen-${color}`);
        }
      }

      // Update error squares
      this.errorSquares = errorSquaresSet;
    },

    startErrorChecking() {
      // Clear any existing interval
      this.stopErrorChecking();

      // Check immediately
      this.checkFullyFlaggedGroups();

      // Then check periodically (every 100ms for responsive updates)
      this.errorCheckInterval = window.setInterval(() => {
        this.checkFullyFlaggedGroups();
      }, 100);
    },

    stopErrorChecking() {
      if (this.errorCheckInterval !== null) {
        clearInterval(this.errorCheckInterval);
        this.errorCheckInterval = null;
      }
      // Clear error state
      this.errorSquares.clear();
      this.flaggedGroupTimestamps.clear();
    },
  },
});
