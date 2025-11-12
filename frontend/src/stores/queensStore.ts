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
  puzzleIdMap: Map<number, any>; // Map from numeric ID to puzzle
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
  // UI state
  uiState: {
    placementMode: 'auto' | 'flag' | 'queen'; // 'auto', 'flag', or 'queen'
    autoFlagging: boolean; // Automatically flag blocked squares
  };
}

// LocalStorage key for completed puzzles
const COMPLETED_PUZZLES_KEY = 'queens-completed-puzzles';

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

export const useQueensStore = defineStore('queens', {
  state: (): QueensState => ({
    grid: createEmptyGrid(4),
    gridSize: 4,
    moveHistory: [],
    playerMarks: Array.from({ length: 4 }, () => Array(4).fill(null as MarkType)),
    puzzleDatabase: null,
    allPuzzles: [],
    puzzleIdMap: new Map(),
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
    // UI state
    uiState: {
      placementMode: 'auto', // 'auto', 'flag', or 'queen'
      autoFlagging: true, // Automatically flag blocked squares
    },
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
  },

  actions: {
    initializeGrid() {
      this.grid = createEmptyGrid(this.gridSize);
      this.moveHistory = [];
      this.isComplete = false;
      this.showSolution = false;
      this.playerMarks = Array.from({ length: this.gridSize }, () =>
        Array(this.gridSize).fill(null as MarkType)
      );
    },

    saveToHistory() {
      this.moveHistory.push(clonePlayerMarks(this.playerMarks));
    },

    handleUndo() {
      if (this.moveHistory.length > 0) {
        const lastPlayerMarks = this.moveHistory.pop();
        if (lastPlayerMarks) {
          this.playerMarks = lastPlayerMarks;
          // Recalculate blocked moves after undo (only if auto-flagging is enabled)
          if (this.uiState.autoFlagging) {
            // Clear all flags first, then recalculate
            for (let r = 0; r < this.gridSize; r++) {
              for (let c = 0; c < this.gridSize; c++) {
                if (this.playerMarks[r][c] === 'flag') {
                  this.playerMarks[r][c] = null;
                }
              }
            }
            // Re-flag based on current queens
            this.updateBlockedMoves();
          }
          // Clear error feedback when undoing
          this.showErrorFeedback = false;
          this.errorFeedbackSquare = null;
        }
      }
    },

    placeFlag(row: number, col: number) {
      this.saveToHistory();
      this.playerMarks[row][col] = 'flag';
      return true;
    },

    placeQueen(row: number, col: number) {
      this.saveToHistory();
      this.playerMarks[row][col] = 'queen';
      // Auto-flag blocked squares when placing a queen (if enabled)
      if (this.uiState.autoFlagging) {
        this.updateBlockedMoves();
      }
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
        }
        // Check tutorial completion step
        if (this.isTutorialMode) {
          this.checkTutorialStep(null, 'complete');
        }
        // Don't reveal solution - just mark as complete
      } else {
        // Has errors - don't complete, but keep the error state
        this.isComplete = false;
      }
    },

    async loadPuzzleDatabase() {
      console.log('[queensStore] loadPuzzleDatabase called');
      try {
        const response = await fetch('/puzzles.json');
        if (!response.ok) {
          throw new Error(`Failed to load puzzles.json: ${response.status}`);
        }
        const data = await response.json();
        console.log('[queensStore] Loaded puzzles.json, sizes:', Object.keys(data));

        // Filter each size's puzzles to only include those with id ending in exactly -0 (not -0V, -0H, etc.)
        this.puzzleDatabase = {};
        const allPuzzles: any[] = [];
        this.puzzleIdMap = new Map();
        let globalIndex = 0;

        // Collect all puzzles from all sizes
        for (const [sizeKey, sizePuzzles] of Object.entries(data)) {
          const filtered = (sizePuzzles as any[]).filter((puzzle: any) =>
            /^pz-\d+-0$/.test(puzzle.id)
          );
          console.log(`[queensStore] Size ${sizeKey}: ${filtered.length} puzzles after filtering`);

          // Assign numeric IDs (index + 1) to each puzzle
          const puzzlesWithNumericIds = filtered.map((puzzle: any) => {
            globalIndex++;
            const numericId = globalIndex;
            const puzzleWithId = {
              ...puzzle,
              id: numericId,
              originalId: puzzle.id, // Keep the original ID for reference
            };
            this.puzzleIdMap.set(numericId, puzzleWithId);
            return puzzleWithId;
          });

          this.puzzleDatabase[sizeKey] = puzzlesWithNumericIds;
          allPuzzles.push(...puzzlesWithNumericIds);
        }

        this.allPuzzles = allPuzzles;

        // Load tutorial puzzles (level-1 through level-10)
        const tutorialPuzzles: any[] = [];
        for (const [sizeKey, sizePuzzles] of Object.entries(data)) {
          const tutorial = (sizePuzzles as any[]).filter(
            (puzzle: any) => puzzle.name && /^level-\d+$/.test(puzzle.name)
          );
          // Only get the -0 variant of each tutorial level
          const tutorialBase = tutorial.filter((puzzle: any) => /^pz-\d+-0$/.test(puzzle.id));
          tutorialPuzzles.push(...tutorialBase);
        }
        // Sort by level number
        tutorialPuzzles.sort((a, b) => {
          const aNum = parseInt(a.name.replace('level-', ''), 10);
          const bNum = parseInt(b.name.replace('level-', ''), 10);
          return aNum - bNum;
        });
        this.tutorialPuzzles = tutorialPuzzles;

        console.log('[queensStore] Database loaded:', {
          totalPuzzles: allPuzzles.length,
          mapSize: this.puzzleIdMap.size,
          sizes: Object.keys(this.puzzleDatabase),
          tutorialPuzzles: this.tutorialPuzzles.length,
        });
        return true;
      } catch (error) {
        console.error('[queensStore] Error loading puzzle database:', error);
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
      // Set current puzzle ID for completion tracking
      this.currentPuzzleId = puzzleData.name || puzzleData.id || puzzleData.originalId;
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

    async loadPuzzleById(puzzleId: string | number) {
      console.log('[queensStore] loadPuzzleById called with:', puzzleId, typeof puzzleId);
      try {
        // Load database if not already loaded
        console.log('[queensStore] Checking puzzleDatabase:', {
          hasDatabase: !!this.puzzleDatabase,
          mapSize: this.puzzleIdMap.size,
        });

        if (!this.puzzleDatabase || this.puzzleIdMap.size === 0) {
          console.log('[queensStore] Loading puzzle database...');
          const success = await this.loadPuzzleDatabase();
          console.log('[queensStore] Database load result:', success);
          if (!success) {
            throw new Error('Failed to load puzzle database');
          }
        }

        // Parse puzzleId as number (from route parameter)
        const numericId = typeof puzzleId === 'string' ? parseInt(puzzleId, 10) : puzzleId;
        console.log('[queensStore] Parsed numericId:', numericId, 'isNaN:', isNaN(numericId));

        if (isNaN(numericId)) {
          throw new Error(`Invalid puzzle ID: ${puzzleId}`);
        }

        // Look up puzzle by numeric ID
        console.log('[queensStore] Looking up puzzle in map, map size:', this.puzzleIdMap.size);
        const puzzle = this.puzzleIdMap.get(numericId);
        console.log('[queensStore] Puzzle lookup result:', puzzle ? 'found' : 'not found');

        if (!puzzle) {
          console.error(
            '[queensStore] Puzzle not found. Available IDs:',
            Array.from(this.puzzleIdMap.keys()).slice(0, 10)
          );
          throw new Error(`Puzzle with ID ${numericId} not found`);
        }

        // Parse and load the puzzle
        console.log('[queensStore] Parsing puzzle data:', puzzle.id, puzzle.originalId);
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
    },

    // Load tutorial puzzle by name (e.g., "level-1")
    async loadTutorialPuzzle(levelName: string) {
      if (!this.puzzleDatabase) {
        const success = await this.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
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
      if (!this.puzzleDatabase || this.puzzleIdMap.size === 0) {
        const success = await this.loadPuzzleDatabase();
        if (!success) {
          throw new Error('Failed to load puzzle database');
        }
      }

      // Get current puzzle's numeric ID
      if (!this.currentPuzzle || !this.currentPuzzle.id) {
        // If no current puzzle, redirect to levels page
        router.push('/queens');
        return;
      }

      const currentNumericId =
        typeof this.currentPuzzle.id === 'number'
          ? this.currentPuzzle.id
          : parseInt(String(this.currentPuzzle.id), 10);

      if (isNaN(currentNumericId)) {
        // If current puzzle doesn't have a numeric ID, redirect to levels page
        router.push('/queens');
        return;
      }

      // Find the next puzzle ID (current + 1)
      const nextPuzzleId = currentNumericId + 1;
      const nextPuzzle = this.puzzleIdMap.get(nextPuzzleId);

      if (nextPuzzle) {
        // Check if next puzzle is the same size
        const nextGridSize = Math.sqrt(nextPuzzle.layout.length);
        if (nextGridSize === this.gridSize) {
          // Navigate to the next puzzle URL
          router.push(`/queens/${nextPuzzleId}`);
          return;
        }
      }

      // If next puzzle doesn't exist or is different size, find next puzzle of same size
      const sizeKey = `${this.gridSize}x${this.gridSize}`;
      const puzzlesForSize = this.puzzleDatabase[sizeKey];

      if (!puzzlesForSize || puzzlesForSize.length === 0) {
        // No puzzles available, redirect to levels page
        router.push('/queens');
        return;
      }

      // Find current puzzle's index in puzzlesForSize
      const currentIndex = puzzlesForSize.findIndex(
        (p: any) => p.id === currentNumericId || p.originalId === this.currentPuzzleId
      );

      // Get next puzzle (wrapping around if needed)
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % puzzlesForSize.length : 0;

      const selectedPuzzle = puzzlesForSize[nextIndex];
      // Navigate to the next puzzle URL
      router.push(`/queens/${selectedPuzzle.id}`);
    },
  },
});
