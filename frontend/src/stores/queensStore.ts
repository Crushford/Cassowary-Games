import { defineStore } from 'pinia';
import type { GridSquare, Pos, MarkType, ColorName } from '../types/types';
import { COLOR_SYMBOLS } from '../utils/colorPalette';
import { createEmptyGrid, clearMarkers, isValidPosition, clonePlayerMarks } from './gridUtils';

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
          // Recalculate blocked moves after undo
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
      // Auto-flag blocked squares when placing a queen (always enabled)
      this.updateBlockedMoves();
      this.checkBoardCompletion();
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
        // Re-flag based on remaining queens
        this.updateBlockedMoves();
      }
    },

    handleSquareClick(row: number, col: number) {
      const currentMark = this.playerMarks[row][col];

      if (currentMark === null) {
        // First click: place flag
        this.placeFlag(row, col);
      } else if (currentMark === 'flag') {
        // Second click: place queen
        this.placeQueen(row, col);
      } else if (currentMark === 'queen') {
        // Third click: remove mark
        this.removeMark(row, col);
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
  },
});
