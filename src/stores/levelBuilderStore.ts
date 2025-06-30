import { defineStore } from 'pinia';
import type {
  GridSquare,
  Pos,
  GameState,
  AttemptResult,
  MarkType,
  LevelBuilderState,
} from '../types/types';
// Import utility functions
import {
  createEmptyGrid,
  getQueenPositions,
  computeAvailableMoves,
  clearMarkers,
  validatePuzzleState,
  isValidPosition,
  queenAttacks,
  countEmptyCells,
  countCellsWithState,
  getColorDistribution,
  clonePlayerMarks,
} from './gridUtils';
import {
  assignInitialColorsToQueens as assignInitialColorsToQueensUtil,
  expandColorGroups as expandColorGroupsUtil,
  addColorOnePerRow as addColorOnePerRowUtil,
  fillRemainingSingleSquares as fillRemainingSingleSquaresUtil,
} from '../utils/colorAssignment';
import { bruteForceSolver } from './bruteForceSolver';
import { validatePuzzleWithWorker, terminateWorker } from '../utils/puzzleValidator';

// Constants
const DEFAULT_GRID_SIZE = 5;

export const useLevelBuilderStore = defineStore('levelBuilder', {
  state: (): LevelBuilderState => ({
    // Core game state
    grid: createEmptyGrid(DEFAULT_GRID_SIZE),
    gridSize: DEFAULT_GRID_SIZE,
    moveHistory: [],
    playerMarks: Array.from({ length: DEFAULT_GRID_SIZE }, () =>
      Array(DEFAULT_GRID_SIZE).fill(null as MarkType)
    ),
    autoTestMarks: Array.from({ length: DEFAULT_GRID_SIZE }, () =>
      Array(DEFAULT_GRID_SIZE).fill(null as MarkType)
    ),

    // UI state
    uiState: {
      showSolution: false,
      selectedTool: null,
      selectedColor: null,
      diggingMode: 'auto',
      autoFlagging: false,
    },

    // Game progress
    isComplete: false,
    errorMessage: null,
    savedPuzzles: [],
    currentPuzzle: null,
    debugLogs: [],
    colorToolActive: false,
    colorToolSelectedColor: null,
    verboseMode: false,
    puzzleGenerationState: {
      isGenerating: false,
      currentStep: null,
      completedSteps: 0,
      totalSteps: 5,
      isInterrupted: false,
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

    colorGroups: (state) => {
      const groups = new Map<
        string,
        {
          positions: Array<{
            pos: Pos;
            autoTestMark: MarkType;
            playerMark: MarkType;
            groupColor: string | undefined;
          }>;
        }
      >();

      // Initialize groups for each color
      for (let row = 0; row < state.gridSize; row++) {
        for (let col = 0; col < state.gridSize; col++) {
          const color = state.grid[row][col].groupColor;
          if (color) {
            if (!groups.has(color)) {
              groups.set(color, {
                positions: [],
              });
            }
            const group = groups.get(color)!;
            group.positions.push({
              pos: { row, col },
              autoTestMark: state.autoTestMarks[row][col],
              playerMark: state.playerMarks[row][col],
              groupColor: color,
            });
          }
        }
      }

      return groups;
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

    isValidMove:
      (state) =>
      (row: number, col: number, useAutoTest: boolean = false) => {
        const marks = useAutoTest ? state.autoTestMarks : state.playerMarks;
        const square = state.grid[row][col];

        // Check if there's a queen in the same row or column
        for (let i = 0; i < state.gridSize; i++) {
          if (marks[row][i] === 'queen' || marks[i][col] === 'queen') {
            return false;
          }
        }

        // Check diagonally adjacent squares (one square away)
        const diagonalPositions = [
          { r: row - 1, c: col - 1 }, // top-left
          { r: row - 1, c: col + 1 }, // top-right
          { r: row + 1, c: col - 1 }, // bottom-left
          { r: row + 1, c: col + 1 }, // bottom-right
        ];

        for (const pos of diagonalPositions) {
          if (isValidPosition(state.grid, pos.r, pos.c) && marks[pos.r][pos.c] === 'queen') {
            return false;
          }
        }

        // Check color group (if the square has a group color)
        if (square.groupColor) {
          for (let r = 0; r < state.gridSize; r++) {
            for (let c = 0; c < state.gridSize; c++) {
              if (marks[r][c] === 'queen' && state.grid[r][c].groupColor === square.groupColor) {
                return false;
              }
            }
          }
        }

        return true;
      },

    // Remove health-related getters
  },

  actions: {
    // Initialize a fresh grid state
    initializeGrid() {
      // Clear existing solution
      this.grid = createEmptyGrid(this.gridSize);

      // Initialize playerMarks matrix
      this.playerMarks = Array.from({ length: this.gridSize }, () =>
        Array(this.gridSize).fill(null as MarkType)
      );
      // Initialize autoTestMarks matrix
      this.autoTestMarks = Array.from({ length: this.gridSize }, () =>
        Array(this.gridSize).fill(null as MarkType)
      );

      this.isComplete = false;
      this.addDebugLog('Grid fully reset to initial state');
    },

    // Helper method to add debug logs
    addDebugLog(message: string) {
      // More robust check - ensure debugLogs is an array
      if (!this.debugLogs || !Array.isArray(this.debugLogs)) {
        console.warn('debugLogs was not an array, resetting it', this.debugLogs);
        this.debugLogs = [];
      }

      // Skip validation steps unless verbose mode is on
      if (
        !this.verboseMode &&
        (message.includes('Step 0:') ||
          message.includes('Step 1:') ||
          message.includes('Step 2:') ||
          message.includes('Step 3:') ||
          message.includes('Dug square at') ||
          message.includes('Flagged square at') ||
          message.includes('autoTestMarks CLEARED') ||
          message.includes('Starting auto test solver steps') ||
          message.includes('Auto test solver steps completed'))
      ) {
        return;
      }

      // Add timestamp to debug messages
      const timestamp = new Date().toLocaleTimeString();
      const logMessage = `[${timestamp}] ${message}`;

      this.debugLogs.push(logMessage);

      // Keep only last 1000 entries to prevent memory issues
      if (this.debugLogs.length > 1000) {
        this.debugLogs = this.debugLogs.slice(-500);
      }

      console.log('Debug log:', logMessage);
    },
    placeFlag(row: number, col: number) {
      this.setPlayerMark(row, col, 'flag');
      return true;
    },

    placeQueen(row: number, col: number) {
      this.setPlayerMark(row, col, 'queen');
      return true;
    },

    updateBlockedMoves(useAutoTest: boolean = false) {
      const marks = useAutoTest ? this.autoTestMarks : this.playerMarks;

      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (marks[row][col] === null) {
            if (!this.isValidMove(row, col, useAutoTest)) {
              marks[row][col] = 'flag';
            }
          }
        }
      }
    },

    saveToHistory() {
      this.moveHistory.push(clonePlayerMarks(this.playerMarks));
    },

    handleUndo() {
      if (this.moveHistory.length > 0) {
        const lastPlayerMarks = this.moveHistory.pop();
        if (lastPlayerMarks) {
          this.playerMarks = lastPlayerMarks;
          this.addDebugLog('playerMarks RESET by handleUndo');
        }
      }
    },

    // 1. Top‐level click handler now just routes to one of three actions
    handleSquareClick(row: number, col: number) {
      const mode = this.uiState.diggingMode;
      if (mode === 'dig') {
        this.digSquare(row, col);
      } else if (mode === 'flag') {
        this.flagSquare(row, col);
      } else {
        this.autoSquare(row, col);
      }
    },

    // 2. Dig action
    digSquare(row: number, col: number, isAutoTest: boolean = false) {
      if (this.grid[row][col].isSolutionQueen) {
        if (isAutoTest) {
          this.setAutoTestMark(row, col, 'queen');
        } else {
          this.placeQueen(row, col);
        }
      } else {
        if (isAutoTest) {
          this.setAutoTestMark(row, col, 'invalid');
        } else {
          this.playerMarks[row][col] = 'invalid';
        }
      }
    },

    // 3. Flag action
    flagSquare(row: number, col: number) {
      const state = this.playerMarks[row][col];
      if (state === null) {
        this.placeFlag(row, col);
      } else if (state === 'flag') {
        this.playerMarks[row][col] = null;
      }
    },

    // 4. Auto mode: first click flags, second click digs
    autoSquare(row: number, col: number) {
      const state = this.playerMarks[row][col];
      if (state === null) {
        this.flagSquare(row, col);
      } else if (state === 'flag') {
        this.digSquare(row, col);
      }
    },

    // New method to generate a full solution
    placeAllQueens() {
      if (this.verboseMode) {
        this.addDebugLog('Starting placeAllQueens');
      }

      // Helper to count queens in a marks array
      const countQueensInMarks = (marks: MarkType[][]): number => {
        let count = 0;
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            if (marks[row][col] === 'queen') count++;
          }
        }
        return count;
      };

      // Helper to clear temporary marks
      const clearTempMarks = (marks: MarkType[][]) => {
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            marks[row][col] = null;
          }
        }
      };

      // Clear existing solution
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.grid[row][col].isSolutionQueen = false;
        }
      }

      // Create temporary state for tracking queen placements
      const tempQueenMarks: MarkType[][] = Array.from({ length: this.gridSize }, () =>
        Array(this.gridSize).fill(null as MarkType)
      );

      // Keep placing queens until we have a complete solution or no more moves
      let attempts = 0;
      const maxAttempts = 100;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 5;

      if (this.verboseMode) {
        this.addDebugLog(`Target: ${this.gridSize} queens, Max attempts: ${maxAttempts}`);
      }

      // Try to place all queens
      while (countQueensInMarks(tempQueenMarks) < this.gridSize && attempts < maxAttempts) {
        attempts++;

        if (this.verboseMode && attempts % 10 === 0) {
          this.addDebugLog(
            `Attempt ${attempts}: ${countQueensInMarks(tempQueenMarks)}/${this.gridSize} queens placed`
          );
        }

        const success = this.placeRandomQueen(tempQueenMarks);
        if (!success) {
          consecutiveFailures++;
          if (this.verboseMode) {
            this.addDebugLog(`Placement failed, consecutive failures: ${consecutiveFailures}`);
          }

          if (consecutiveFailures >= maxConsecutiveFailures) {
            if (this.verboseMode) {
              this.addDebugLog('Too many consecutive failures, resetting board');
            }
            clearTempMarks(tempQueenMarks);
            consecutiveFailures = 0;
          }
        } else {
          consecutiveFailures = 0; // Reset failure counter on success
        }
      }

      const finalQueenCount = countQueensInMarks(tempQueenMarks);
      if (this.verboseMode) {
        this.addDebugLog(
          `Generation complete: ${finalQueenCount}/${this.gridSize} queens after ${attempts} attempts`
        );
      }

      if (finalQueenCount === this.gridSize) {
        // Record the final queen placements in our solution data
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            if (tempQueenMarks[row][col] === 'queen') {
              this.grid[row][col].isSolutionQueen = true;
            }
          }
        }
        if (this.verboseMode) {
          this.addDebugLog('✅ Full solution generated and saved');
        }
      } else {
        if (this.verboseMode) {
          this.addDebugLog(
            `❌ Failed to generate full solution: only ${finalQueenCount}/${this.gridSize} queens placed`
          );
        }
        this.setError(`Could not place all queens: ${finalQueenCount}/${this.gridSize} placed`);
      }
    },

    /**
     * Attempts to place all queens on the board using knight-move preference and full backtracking.
     * Returns true if a solution is found, false otherwise.
     */
    placeRandomQueen(tempQueenMarks: MarkType[][]): boolean {
      const maxAttempts = 1000; // Max total attempts before full reset
      let attempts = 0;
      const gridSize = this.gridSize;
      const moveStack: { row: number; col: number; prevMarks: MarkType[][] }[] = [];
      const verbose = this.verboseMode;

      // Helper: Get all valid moves (optionally only knight-moves from last queen)
      const getValidMoves = (preferKnight: boolean): { row: number; col: number }[] => {
        const moves: { row: number; col: number }[] = [];
        let knightMoves: { row: number; col: number }[] = [];
        let lastQueen = null;
        // Find last queen placed
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            if (tempQueenMarks[r][c] === 'queen') lastQueen = { row: r, col: c };
          }
        }
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            if (
              tempQueenMarks[row][col] === null &&
              this.isValidMoveWithMarks(row, col, tempQueenMarks)
            ) {
              moves.push({ row, col });
              if (lastQueen) {
                const dr = Math.abs(row - lastQueen.row);
                const dc = Math.abs(col - lastQueen.col);
                if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) {
                  knightMoves.push({ row, col });
                }
              }
            }
          }
        }
        return preferKnight && knightMoves.length > 0 ? knightMoves : moves;
      };

      // Helper: Deep clone marks
      const cloneMarks = (marks: MarkType[][]) => marks.map((row) => [...row]);

      // Recursive backtracking function
      const backtrack = (queensPlaced: number): boolean => {
        if (queensPlaced === gridSize) return true;
        if (++attempts > maxAttempts) return false;

        // Try knight-moves first, then any valid move
        const moves = getValidMoves(true);
        if (moves.length === 0) return false;
        // Shuffle moves for randomness
        for (let i = moves.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [moves[i], moves[j]] = [moves[j], moves[i]];
        }
        for (const { row, col } of moves) {
          // Save state for backtracking
          const prevMarks = cloneMarks(tempQueenMarks);
          // Place queen
          tempQueenMarks[row][col] = 'queen';
          if (verbose)
            this.addDebugLog(`Tried queen at (${row},${col}), stack depth ${queensPlaced + 1}`);
          if (backtrack(queensPlaced + 1)) return true;
          // Backtrack
          for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
              tempQueenMarks[r][c] = prevMarks[r][c];
            }
          }
          if (verbose)
            this.addDebugLog(`Backtracked from (${row},${col}), stack depth ${queensPlaced + 1}`);
        }
        return false;
      };

      // Clear board before starting
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          tempQueenMarks[row][col] = null;
        }
      }
      let success = backtrack(0);
      if (!success && verbose)
        this.addDebugLog(
          'Failed to generate a random queen placement after max attempts, resetting.'
        );
      return success;
    },

    // Helper to check if a move is valid using a specific marks array
    isValidMoveWithMarks(row: number, col: number, marks: MarkType[][]): boolean {
      // Check if there's a queen in the same row or column
      for (let i = 0; i < this.gridSize; i++) {
        if (marks[row][i] === 'queen' || marks[i][col] === 'queen') {
          return false;
        }
      }

      // Check diagonally adjacent squares (one square away)
      const diagonalPositions = [
        { r: row - 1, c: col - 1 }, // top-left
        { r: row - 1, c: col + 1 }, // top-right
        { r: row + 1, c: col - 1 }, // bottom-left
        { r: row + 1, c: col + 1 }, // bottom-right
      ];

      for (const pos of diagonalPositions) {
        if (this.isValidPosition(pos.r, pos.c) && marks[pos.r][pos.c] === 'queen') {
          return false;
        }
      }

      // Check color group (if the square has a group color)
      const square = this.grid[row][col];
      if (square.groupColor) {
        for (let r = 0; r < this.gridSize; r++) {
          for (let c = 0; c < this.gridSize; c++) {
            if (marks[r][c] === 'queen' && this.grid[r][c].groupColor === square.groupColor) {
              return false;
            }
          }
        }
      }

      return true;
    },

    setError(message: string | null) {
      this.errorMessage = message;
    },

    setGridSize(size: number) {
      if (size < 4 || size > 8) {
        this.setError('Grid size must be between 4 and 8');
        return;
      }
      this.gridSize = size;
      this.initializeGrid();
      this.setError(null);
    },

    clearQueensAndFlags(): void {
      // Save current queen positions as the solution
      if (!this.hasAnySolutionQueens() && this.queenPositions.length > 0) {
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            if (this.playerMarks[row][col] === 'queen') {
              this.grid[row][col].isSolutionQueen = true;
            }
          }
        }
      }

      // Clear all playerMarks
      clearMarkers(this.playerMarks);

      this.isComplete = false;
    },

    clearMarkers() {
      clearMarkers(this.playerMarks);
      this.addDebugLog('playerMarks CLEARED by clearMarkers');
    },

    hasAnySolutionQueens(): boolean {
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].isSolutionQueen) {
            return true;
          }
        }
      }
      return false;
    },

    // Replace original countFlags with more generic countCellsWithState utility
    countFlags() {
      return countCellsWithState(this.grid, this.playerMarks, 'flag');
    },

    // Replace original countEmptySquares with utility
    countEmptySquares() {
      return countEmptyCells(this.grid, this.playerMarks);
    },

    // Use isValidPosition utility to simplify this method
    isValidPosition(row: number, col: number) {
      return isValidPosition(this.grid, row, col);
    },

    // Use validatePuzzleState utility for validation
    validatePuzzle() {
      const { queenCountValid, colorGroupsValid } = validatePuzzleState(
        this.grid,
        this.playerMarks,
        this.gridSize
      );
      const allFilled = this.countEmptySquares() === 0;
      return { queenCountValid, allFilled, colorGroupsValid };
    },

    // Split assignColorGroups into 5 steps
    assignColorGroups() {
      this.assignInitialColorsToQueens();
      this.expandColorGroups();
      this.addColorOnePerRow();
      this.fillRemainingSingleSquares();
    },

    // Step 1: Assign a unique color to each queen (do not expand)
    assignInitialColorsToQueens() {
      // Get queen positions from the grid's isSolutionQueen property
      const queenPositions: Pos[] = [];
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].isSolutionQueen) {
            queenPositions.push({ row, col });
          }
        }
      }

      this.grid = assignInitialColorsToQueensUtil(this.grid, queenPositions, (msg) =>
        this.addDebugLog(msg)
      );
    },

    // Step 2: Expand each color group to adjacent cells (add one neighbor to each group)
    expandColorGroups() {
      this.grid = expandColorGroupsUtil(this.grid, (msg) => this.addDebugLog(msg));
    },

    // Step 3: Add one colored square to each row, using neighbors
    addColorOnePerRow() {
      this.grid = addColorOnePerRowUtil(this.grid, (msg) => this.addDebugLog(msg));
    },

    // Step 4: Fill all remaining uncolored cells with valid colors
    fillRemainingSingleSquares() {
      this.grid = fillRemainingSingleSquaresUtil(this.grid, (msg) => this.addDebugLog(msg));
    },

    setSquareColor(row: number, col: number, color: string | undefined) {
      this.saveToHistory();
      this.grid[row][col].groupColor = color;
      this.addDebugLog(`Set color of square (${row}, ${col}) to ${color}`);
    },

    // Fallback method if the main algorithm fails
    assignColorGroupsFallback() {
      // Reset all color groups
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.grid[row][col].groupColor = undefined;
        }
      }

      const colorPalette: ('red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink')[] = [
        'red',
        'blue',
        'green',
        'yellow',
        'purple',
        'pink',
      ];

      // Get queen positions
      const queens = this.queenPositions;

      // Assign each queen a unique color
      queens.forEach((queen, index) => {
        const color = colorPalette[index % colorPalette.length];
        this.grid[queen.row][queen.col].groupColor = color;
      });

      // Simple flood fill approach
      const directions = [
        { dr: 1, dc: 0 }, // down
        { dr: -1, dc: 0 }, // up
        { dr: 0, dc: 1 }, // right
        { dr: 0, dc: -1 }, // left
      ];

      // For each queen, flood fill until we hit another queen's territory
      let unassignedCells = true;

      while (unassignedCells) {
        unassignedCells = false;

        // Find cells adjacent to colored cells
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            // Skip cells that already have a color
            if (this.grid[row][col].groupColor) continue;

            // Check if this cell is adjacent to a colored cell
            for (const dir of directions) {
              const adjRow = row + dir.dr;
              const adjCol = col + dir.dc;

              if (this.isValidPosition(adjRow, adjCol) && this.grid[adjRow][adjCol].groupColor) {
                // Assign the same color
                this.grid[row][col].groupColor = this.grid[adjRow][adjCol].groupColor;
                unassignedCells = true;
                break;
              }
            }
          }
        }
      }

      // Check for any unassigned cells (if some cells are isolated)
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (!this.grid[row][col].groupColor) {
            // Assign a random color
            const randomIndex = Math.floor(Math.random() * colorPalette.length);
            this.grid[row][col].groupColor = colorPalette[randomIndex];
          }
        }
      }
    },

    // Function to check if a color forms a connected group and return color information
    isColorConnected(targetColor: string): boolean {
      if (!targetColor) return false;

      // Find all cells with this color
      const colorCells: Pos[] = [];
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].groupColor === targetColor) {
            colorCells.push({ row, col });
          }
        }
      }

      if (colorCells.length === 0) return true; // No cells, trivially connected

      // Perform a flood fill from the first cell to see if we can reach all others
      const visited = new Set<string>();
      const queue: Pos[] = [colorCells[0]];
      const directions = [
        { dr: 1, dc: 0 }, // down
        { dr: -1, dc: 0 }, // up
        { dr: 0, dc: 1 }, // right
        { dr: 0, dc: -1 }, // left
      ];

      while (queue.length > 0) {
        const { row, col } = queue.shift()!;
        const key = `${row},${col}`;

        if (visited.has(key)) continue;
        visited.add(key);

        // Check all four directions
        for (const dir of directions) {
          const newR = row + dir.dr;
          const newC = col + dir.dc;

          if (
            this.isValidPosition(newR, newC) &&
            this.grid[newR][newC].groupColor === targetColor &&
            !visited.has(`${newR},${newC}`)
          ) {
            queue.push({ row: newR, col: newC });
          }
        }
      }

      // Check if we visited all cells of this color
      return visited.size === colorCells.length;
    },

    savePuzzleToLocalStorage() {
      if (!this.isComplete) {
        this.setError('You need a complete solution with color groups before saving');
        return false;
      }

      const timestamp = new Date().toISOString();
      const puzzleName = `Puzzle ${this.gridSize}x${this.gridSize} - ${timestamp}`;

      // Create a copy of the current grid with only queen positions and color groups
      const puzzleGrid = Array(this.gridSize)
        .fill(null)
        .map((_, row) =>
          Array(this.gridSize)
            .fill(null)
            .map(
              (_, col) =>
                ({
                  position: { row, col },
                  groupColor: undefined,
                  playerMark: null,
                }) as GridSquare
            )
        );

      // Copy only the queens and their color groups
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.playerMarks[row][col] === 'queen') {
            puzzleGrid[row][col] = {
              position: { row, col },
              groupColor: this.grid[row][col].groupColor,
              playerMark: 'queen' as const,
            } as GridSquare;
          } else if (this.grid[row][col].groupColor) {
            puzzleGrid[row][col] = {
              position: { row, col },
              groupColor: this.grid[row][col].groupColor,
              playerMark: null,
            } as GridSquare;
          }
        }
      }

      // Add to saved puzzles list
      this.savedPuzzles.push({
        name: puzzleName,
        grid: puzzleGrid,
        gridSize: this.gridSize,
      });

      // Save to local storage
      localStorage.setItem('savedPuzzles', JSON.stringify(this.savedPuzzles));
      this.setError(null);
      return puzzleName || null;
    },

    loadPuzzlesFromLocalStorage() {
      const savedPuzzles = localStorage.getItem('savedPuzzles');
      if (savedPuzzles) {
        this.savedPuzzles = JSON.parse(savedPuzzles);
      }
    },

    loadPuzzle(puzzleName: string) {
      const puzzle = this.savedPuzzles.find((p) => p.name === puzzleName);
      if (!puzzle) {
        this.setError('Puzzle not found');
        return false;
      }

      // Set grid size and initialize an empty grid
      this.setGridSize(puzzle.gridSize);

      // Apply the puzzle grid (with color groups but no queens)
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (puzzle.grid[row][col].groupColor) {
            this.grid[row][col].groupColor = puzzle.grid[row][col].groupColor;
          }
        }
      }

      this.currentPuzzle = puzzleName;
      this.setError(null);
      return true;
    },

    deletePuzzle(puzzleName: string) {
      const index = this.savedPuzzles.findIndex((p) => p.name === puzzleName);
      if (index !== -1) {
        this.savedPuzzles.splice(index, 1);
        localStorage.setItem('savedPuzzles', JSON.stringify(this.savedPuzzles));
        return true;
      }
      return false;
    },

    // Function to export the current game state as text
    exportGameState(): string {
      // Color symbols for display
      const colorSymbols: Record<string, string> = {
        red: 'R',
        blue: 'B',
        green: 'G',
        yellow: 'Y',
        purple: 'P',
        pink: 'K',
        undefined: '.',
      };

      const queenSymbol = 'Q';
      const emptySymbol = '.';

      let output = 'Game State:\n';
      output += `Grid Size: ${this.gridSize}x${this.gridSize}\n\n`;

      // Add column numbers
      output += '  ';
      for (let col = 0; col < this.gridSize; col++) {
        output += ` ${col}`;
      }
      output += '\n';

      // Add rows with colors and queens
      for (let row = 0; row < this.gridSize; row++) {
        // Row number
        output += `${row} `;

        // Row content with colors
        for (let col = 0; col < this.gridSize; col++) {
          const square = this.grid[row][col];
          const colorSymbol = colorSymbols[square.groupColor as keyof typeof colorSymbols];
          output += ` ${colorSymbol}`;
        }
        output += '\n';
      }

      // Add a separate grid for queens
      output += '\nQueens:\n  ';
      for (let col = 0; col < this.gridSize; col++) {
        output += ` ${col}`;
      }
      output += '\n';

      for (let row = 0; row < this.gridSize; row++) {
        // Row number
        output += `${row} `;

        // Row content with queens
        for (let col = 0; col < this.gridSize; col++) {
          const symbol = this.playerMarks[row][col] === 'queen' ? queenSymbol : emptySymbol;
          output += ` ${symbol}`;
        }
        output += '\n';
      }

      // Add color count information
      const colorCounts: Record<string, number> = {};
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const color = this.grid[row][col].groupColor;
          if (color) {
            colorCounts[color] = (colorCounts[color] || 0) + 1;
          }
        }
      }

      // Check if all colors form connected groups
      output += '\nColor Groups:\n';
      for (const [color, count] of Object.entries(colorCounts)) {
        const isConnected = this.isColorConnected(color);
        const status = isConnected ? 'connected' : 'NOT CONNECTED';
        output += `${color} (${colorSymbols[color]}): ${count} squares - ${status}\n`;
      }

      return output;
    },

    // Log array for test steps
    debugLogs: [] as string[],

    // Helper to log color distribution more concisely
    logColorDistribution() {
      try {
        const result = getColorDistribution(this.grid);
        if (!result) {
          this.addDebugLog('Error: Could not get color distribution');
          return;
        }

        const { totalColored, totalSquares, colorCounts } = result;
        this.addDebugLog(`Colors: ${totalColored}/${totalSquares} cells colored`);

        // Sort colors by frequency if we have any colors
        if (colorCounts && Object.keys(colorCounts).length > 0) {
          const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
          let colorSummary = sortedColors.map(([color, count]) => `${color}:${count}`).join(', ');
          this.addDebugLog(`Distribution: ${colorSummary}`);
        } else {
          this.addDebugLog('No colors assigned yet');
        }
      } catch (error: unknown) {
        console.error('Error in logColorDistribution:', error);
        this.addDebugLog(
          `Error logging color distribution: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    // Step 0: Flag squares without color groups
    flagSquaresWithoutColorGroups() {
      this.addDebugLog('Step 0: Flagging squares without color groups');
      let placedAny = false;

      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (!this.grid[row][col].groupColor && this.autoTestMarks[row][col] === null) {
            this.setAutoTestMark(row, col, 'flag');
            this.addDebugLog(`Flagged square at (${row}, ${col}) - no color group`);
            placedAny = true;
          }
        }
      }

      return placedAny;
    },

    // Run all solver steps until no more changes
    runAllSolverSteps() {
      this.addDebugLog('Starting auto test solver steps');
      this.clearAutoTestMarks();

      let previousFlagCount = -1;
      let currentFlagCount = this.countAutoTestFlags();

      while (previousFlagCount !== currentFlagCount) {
        previousFlagCount = currentFlagCount;

        // Step 0: Flag squares without color groups
        if (this.flagSquaresWithoutColorGroups()) {
          this.addDebugLog('Flagged squares without color groups');
          this.placeLastFreeQueens();
        }

        // Step 1: Place last free queens
        if (this.placeLastFreeQueens()) {
          this.addDebugLog('Placed last free queens');
        }

        // Step 2: Flag blocking squares
        if (this.flagBlockingSquares()) {
          this.addDebugLog('Flagged blocking squares');
          this.placeLastFreeQueens();
        }

        // Step 3: Eliminate constrained rows
        if (this.eliminateConstrainedRows()) {
          this.addDebugLog('Eliminated constrained rows');
          this.placeLastFreeQueens();
        }

        // Step 4: Eliminate constrained columns
        if (this.eliminateConstrainedColumns()) {
          this.addDebugLog('Eliminated constrained columns');
          this.placeLastFreeQueens();
        }

        currentFlagCount = this.countAutoTestFlags();
      }

      this.addDebugLog('Auto test solver steps completed');
      return true;
    },

    // Helper method to count auto test flags
    countAutoTestFlags(): number {
      return countCellsWithState(this.grid, this.autoTestMarks, 'flag');
    },

    // Helper method to get auto test queen positions
    getAutoTestQueenPositions(): Pos[] {
      const positions: Pos[] = [];
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.autoTestMarks[row][col] === 'queen') {
            positions.push({ row, col });
          }
        }
      }
      return positions;
    },

    // Step 1: Place queens in last free squares of color blocks, rows, or columns
    placeLastFreeQueens() {
      this.addDebugLog('Step 1: Placing last free queens');
      let placedAny = false;

      // Check each color group for last free square
      for (const [color, group] of this.colorGroups) {
        let unflaggedCount = 0;
        let lastUnflaggedPos: Pos | null = null;

        for (const { pos } of group.positions) {
          if (this.autoTestMarks[pos.row][pos.col] !== 'flag') {
            unflaggedCount++;
            lastUnflaggedPos = pos;
          }
        }

        // If there's exactly one unflagged square in the color group
        if (unflaggedCount === 1 && lastUnflaggedPos) {
          this.digSquare(lastUnflaggedPos.row, lastUnflaggedPos.col, true);
          this.addDebugLog(
            `Dug square at (${lastUnflaggedPos.row}, ${lastUnflaggedPos.col}) in color group ${color}`
          );
          placedAny = true;
        }
      }

      // Check rows
      for (let row = 0; row < this.gridSize; row++) {
        let unflaggedCount = 0;
        let lastUnflaggedCol = -1;

        for (let col = 0; col < this.gridSize; col++) {
          if (this.autoTestMarks[row][col] !== 'flag') {
            unflaggedCount++;
            lastUnflaggedCol = col;
          }
        }

        // If there's exactly one unflagged square in the row
        if (unflaggedCount === 1 && lastUnflaggedCol !== -1) {
          this.digSquare(row, lastUnflaggedCol, true);
          this.addDebugLog(`Dug square at (${row}, ${lastUnflaggedCol}) in row`);
          placedAny = true;
        }
      }

      // Check columns
      for (let col = 0; col < this.gridSize; col++) {
        let unflaggedCount = 0;
        let lastUnflaggedRow = -1;

        for (let row = 0; row < this.gridSize; row++) {
          if (this.autoTestMarks[row][col] !== 'flag') {
            unflaggedCount++;
            lastUnflaggedRow = row;
          }
        }

        // If there's exactly one unflagged square in the column
        if (unflaggedCount === 1 && lastUnflaggedRow !== -1) {
          this.digSquare(lastUnflaggedRow, col, true);
          this.addDebugLog(`Dug square at (${lastUnflaggedRow}, ${col}) in column`);
          placedAny = true;
        }
      }

      return placedAny;
    },

    // Step 2: Flag squares where a queen would block all remaining squares in other color groups
    flagBlockingSquares() {
      this.addDebugLog('Step 2: Blocking critical squares');
      let placedAny = false;

      const gridSize = this.gridSize;

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          if (this.autoTestMarks[row][col] !== null) continue;

          // Clone the current autoTest state to simulate queen placement
          const simulatedMarks = JSON.parse(JSON.stringify(this.autoTestMarks));

          // Place a simulated queen
          simulatedMarks[row][col] = 'queen';

          // Recalculate blocked moves after placing the queen
          for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
              if (simulatedMarks[r][c] !== null) continue;
              if (!this.isValidMoveWithMarks(r, c, simulatedMarks)) {
                simulatedMarks[r][c] = 'flag';
              }
            }
          }

          // Helper to check if a line (row/column) is completely blocked
          const isLineFullyBlocked = (getterFn: (index: number) => MarkType[]): boolean => {
            for (let i = 0; i < gridSize; i++) {
              const line = getterFn(i);
              if (line.every((mark) => mark === 'flag')) {
                return true;
              }
            }
            return false;
          };

          // Check if placing the queen causes any full row or column to be blocked
          const rowFullyBlocked = isLineFullyBlocked((r: number) => simulatedMarks[r]);
          const colFullyBlocked = isLineFullyBlocked((c: number) =>
            simulatedMarks.map((r: number[]) => r[c])
          );

          // Check if it blocks an entire color group
          let colorGroupBlocked = false;
          for (const [_, group] of this.colorGroups) {
            if (group.positions.every(({ pos }) => simulatedMarks[pos.row][pos.col] === 'flag')) {
              colorGroupBlocked = true;
              break;
            }
          }

          if (rowFullyBlocked || colFullyBlocked || colorGroupBlocked) {
            this.setAutoTestMark(row, col, 'flag');
            this.addDebugLog(
              `Flagged square at (${row}, ${col}) - would block entire row, column, or color group`
            );
            placedAny = true;
          }
        }
      }

      return placedAny;
    },

    eliminateConstrainedLines(isColumn: boolean = false): boolean {
      this.placeLastFreeQueens();

      const axis = isColumn ? 'column' : 'row';
      const axisIndex = isColumn ? 'col' : 'row';
      const traverseIndex = isColumn ? 'row' : 'col';
      const gridSize = this.gridSize;

      this.addDebugLog(`Step 3: Eliminating constrained ${axis}s`);
      let placedAny = false;

      // Step 1: Map each color to the set of rows or columns (depending on axis) where it has unmarked squares
      const colorToAxisMap = new Map<string, Set<number>>();

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const color = this.grid[row][col].groupColor;
          const mark = this.autoTestMarks[row][col];

          if (mark === null && color) {
            const coord = isColumn ? col : row;
            if (!colorToAxisMap.has(color)) {
              colorToAxisMap.set(color, new Set());
            }
            colorToAxisMap.get(color)!.add(coord);
          }
        }
      }

      // Step 2: Invert the map to find sets of colors that share the same row or column sets
      const axisSetToColors = new Map<string, Set<string>>();

      for (const [color, axisSet] of colorToAxisMap.entries()) {
        const key = Array.from(axisSet).sort().join(',');
        if (!axisSetToColors.has(key)) {
          axisSetToColors.set(key, new Set());
        }
        axisSetToColors.get(key)!.add(color);
      }

      // Step 3: For each shared axis group with 2+ colors, flag unrelated squares in those rows/columns
      for (const [axisKey, allowedColors] of axisSetToColors.entries()) {
        if (allowedColors.size < 2) continue; // Skip groups with only one color

        const axisValues = axisKey.split(',').map(Number);

        for (const primaryIndex of axisValues) {
          for (let secondaryIndex = 0; secondaryIndex < gridSize; secondaryIndex++) {
            const row = isColumn ? secondaryIndex : primaryIndex;
            const col = isColumn ? primaryIndex : secondaryIndex;

            const squareColor = this.grid[row][col].groupColor;
            const mark = this.autoTestMarks[row][col];

            const isUnmarked = mark === null;
            const isOutsideAllowedColors = !squareColor || !allowedColors.has(squareColor);

            if (isUnmarked && isOutsideAllowedColors) {
              this.setAutoTestMark(row, col, 'flag');
              this.addDebugLog(
                `Flagged square at (${row}, ${col}) in constrained ${axis} group [${axisKey}] for colors: ${Array.from(allowedColors).join(', ')}`
              );
              placedAny = true;
            }
          }
        }
      }

      return placedAny;
    },

    // Step 3: Eliminate constrained rows
    eliminateConstrainedRows(): boolean {
      return this.eliminateConstrainedLines(false);
    },

    // Step 4: Eliminate constrained columns
    eliminateConstrainedColumns(): boolean {
      return this.eliminateConstrainedLines(true);
    },

    setColorToolActive(active: boolean) {
      this.colorToolActive = active;
    },
    setColorToolSelectedColor(color: string | null) {
      this.colorToolSelectedColor = color;
    },
    toggleColorToolActive() {
      this.colorToolActive = !this.colorToolActive;
    },

    // New model helpers
    posToKey(pos: Pos): string {
      return `${pos.row},${pos.col}`;
    },

    keyToPos(key: string): Pos {
      const [row, col] = key.split(',').map(Number);
      return { row, col };
    },

    getSquareColor(row: number, col: number): string | undefined {
      return this.grid[row][col].groupColor;
    },

    setSquareColorNew(row: number, col: number, color: string | undefined): void {
      const key = this.posToKey({ row, col });
      if (color) {
        this.grid[row][col].groupColor = color;
      } else {
        this.grid[row][col].groupColor = undefined;
      }
    },

    isSquareQueen(row: number, col: number): boolean {
      return this.playerMarks[row][col] === 'queen';
    },

    isSquareFlag(row: number, col: number): boolean {
      return this.playerMarks[row][col] === 'flag';
    },

    isSquareInvalid(row: number, col: number): boolean {
      return this.playerMarks[row][col] === 'invalid';
    },

    getPlayerMarking(row: number, col: number): MarkType {
      return this.playerMarks[row][col];
    },

    // Add toggle for verbose mode
    toggleVerboseMode() {
      this.verboseMode = !this.verboseMode;
      this.addDebugLog(`Verbose mode ${this.verboseMode ? 'enabled' : 'disabled'}`);
    },

    // New method to set player marks
    setPlayerMark(row: number, col: number, mark: Exclude<MarkType, null>): void {
      this.saveToHistory();

      // Update source-of-truth directly (no toggle logic here)
      this.playerMarks[row][col] = mark;

      if (mark === 'queen') {
        this.updateBlockedMoves();
      }
    },

    // Add new method to handle game restart

    async validatePuzzleWithWorker(maxSolutions: number = 2): Promise<number> {
      // Then validate the puzzle using the worker
      return validatePuzzleWithWorker(this.grid, maxSolutions);
    },

    // Add cleanup method to terminate worker when store is destroyed
    cleanup() {
      terminateWorker();
    },

    // Color tool functions
    setActiveColorTool(color: string | null) {
      this.colorToolSelectedColor = color;
    },

    deleteColorGroup(color: string) {
      // Remove color from all squares
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].groupColor === color) {
            this.setSquareColor(row, col, undefined);
          }
        }
      }
    },

    // New method to set auto test marks
    setAutoTestMark(row: number, col: number, mark: Exclude<MarkType, null>): void {
      this.autoTestMarks[row][col] = mark;
      this.updateBlockedMoves(true);
    },

    // New method to get auto test marking
    getAutoTestMarking(row: number, col: number): MarkType {
      return this.autoTestMarks[row][col];
    },

    // New method to clear auto test marks
    clearAutoTestMarks(): void {
      clearMarkers(this.autoTestMarks);
      this.addDebugLog('autoTestMarks CLEARED by clearAutoTestMarks');
    },

    // New method to safely expand a color group
    async expandColorGroupSafely(color: string | number): Promise<boolean> {
      const gridSize = this.gridSize;
      const originalGrid = JSON.parse(JSON.stringify(this.grid));
      const failedPlacements = new Set();

      // Step 1: Find all current positions of this color
      const frontier = [];
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          if (this.grid[row][col].groupColor === color) {
            frontier.push({ row, col });
          }
        }
      }

      // Step 2: Try expanding from each frontier square
      const directions = [
        { dr: 1, dc: 0 },
        { dr: -1, dc: 0 },
        { dr: 0, dc: 1 },
        { dr: 0, dc: -1 },
      ];

      while (frontier.length > 0) {
        const current = frontier.shift()!;

        for (const { dr, dc } of directions) {
          const newRow = current.row + dr;
          const newCol = current.col + dc;

          if (!this.isValidPosition(newRow, newCol)) continue;
          const key = `${newRow},${newCol}`;

          if (this.grid[newRow][newCol].groupColor || failedPlacements.has(key)) {
            continue;
          }

          // Try assigning the color
          this.setSquareColor(newRow, newCol, color as string);
          this.clearAutoTestMarks();
          this.runAllSolverSteps();

          const isValid = this.autoTestMarks.every((row) =>
            row.every((cell) => cell !== null && cell !== 'invalid')
          );

          if (isValid) {
            this.addDebugLog(`Color ${color} successfully expanded to (${newRow}, ${newCol})`);
            frontier.push({ row: newRow, col: newCol });
            return true; // Success this step
          } else {
            // Revert change
            this.grid = JSON.parse(JSON.stringify(originalGrid));
            failedPlacements.add(key);
            this.addDebugLog(`Color ${color} failed at (${newRow}, ${newCol}), reverting.`);
          }
        }
      }

      this.addDebugLog(`Color ${color} could not be expanded further.`);
      return false; // No valid expansion found
    },

    // Helper method to count colored squares
    countColoredSquares(): number {
      let count = 0;
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].groupColor) {
            count++;
          }
        }
      }
      return count;
    },

    // Helper method to perform initial setup
    async performInitialSetup(): Promise<void> {
      this.clearQueensAndFlags();
      this.placeAllQueens();
      this.assignInitialColorsToQueens();
    },

    // New method to generate and expand colors with retry
    async generateAndExpandColorsWithRetry(maxRetries: number = 30): Promise<boolean> {
      this.addDebugLog('Starting generate and expand with retry');

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        this.addDebugLog(`Attempt ${attempt}/${maxRetries}`);

        // Step 1: Clear and place queens with initial colors
        await this.performInitialSetup();

        // Step 2: Try to expand colors until full
        await this.expandRandomColorsUntilFull();

        // Check if board is full
        const coloredSquares = this.countColoredSquares();
        if (coloredSquares === this.gridSize * this.gridSize) {
          this.addDebugLog(`Successfully generated and expanded colors after ${attempt} tries`);
          return true;
        }

        this.addDebugLog(`Failed to fill board on attempt ${attempt}`);
      }

      this.addDebugLog('Failed to generate valid puzzle after all retries');
      return false;
    },

    // Update expandRandomColorsUntilFull to use countColoredSquares
    async expandRandomColorsUntilFull(): Promise<void> {
      const gridSize = this.gridSize;
      const totalSquares = gridSize * gridSize;
      let attempts = 0;
      const maxAttempts = 100; // Prevent infinite loops

      // Count current colored squares
      let coloredSquares = this.countColoredSquares();

      this.addDebugLog(
        `Starting random color expansion. Current colored squares: ${coloredSquares}/${totalSquares}`
      );

      while (coloredSquares < totalSquares && attempts < maxAttempts) {
        attempts++;

        // Get all colors currently on the board and their counts
        const colors = new Set<string>();
        const colorCounts: Record<string, number> = {};
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            const color = this.grid[row][col].groupColor;
            if (color) {
              colors.add(color);
              colorCounts[color] = (colorCounts[color] || 0) + 1;
            }
          }
        }

        if (colors.size === 0) {
          this.addDebugLog('No colors found on board, cannot expand');
          return;
        }

        // Convert to array and split into two halves
        const colorArray = Array.from(colors);
        const firstHalfColors = colorArray.slice(0, Math.ceil(colorArray.length / 2));
        const secondHalfColors = colorArray.slice(Math.ceil(colorArray.length / 2));

        // Filter colors that can be expanded
        const expandableColors = colorArray.filter((color) => {
          if (firstHalfColors.includes(color)) {
            // First color in first half limited to 2 squares, others to 3
            if (color === firstHalfColors[0]) {
              return colorCounts[color] < 2;
            }
            return colorCounts[color] < 3;
          }
          return true; // Second half can grow without limit
        });

        if (expandableColors.length === 0) {
          this.addDebugLog('No expandable colors found');
          return;
        }

        // Pick a random color from expandable colors
        const randomColor = expandableColors[Math.floor(Math.random() * expandableColors.length)];

        // Try to expand this color
        const success = await this.expandColorGroupSafely(randomColor);

        if (success) {
          // Recount colored squares
          coloredSquares = this.countColoredSquares();
          this.addDebugLog(`Expanded ${randomColor}. Progress: ${coloredSquares}/${totalSquares}`);
        } else {
          this.addDebugLog(`Failed to expand ${randomColor}, trying another color`);
        }
      }

      if (coloredSquares === totalSquares) {
        this.addDebugLog('Successfully filled the board with colors!');
      } else {
        this.addDebugLog(
          `Could not fill the board completely. Final progress: ${coloredSquares}/${totalSquares}`
        );
      }
    },
  },
});
