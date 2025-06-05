import { defineStore } from 'pinia';
import type { GridSquare, Pos, GameState, AttemptResult, MarkType } from '../types/types';
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
import {
  placeLastFreeQueens,
  flagBlockingSquares,
  eliminateConstrainedRows,
  eliminateConstrainedColumns,
  blockRowsAndColumns,
  runAllSolverSteps,
} from './solver';
import { bruteForceSolver } from './bruteForceSolver';

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    // Core game state
    grid: createEmptyGrid(6),
    gridSize: 6,
    moveHistory: [],
    playerMarks: Array.from({ length: 6 }, () => Array(6).fill(null as MarkType)),

    // UI state
    uiState: {
      showSolution: false,
      selectedTool: null,
      selectedColor: null,
    },

    // Game progress
    currentLevel: 1,
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
      totalSteps: 5, // Assuming there are 5 main steps
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
        { r: row - 1, c: col - 1 }, // top-left
        { r: row - 1, c: col + 1 }, // top-right
        { r: row + 1, c: col - 1 }, // bottom-left
        { r: row + 1, c: col + 1 }, // bottom-right
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
  },

  actions: {
    initializeGrid() {
      this.debugLogs = [];
      this.grid = createEmptyGrid(this.gridSize);
      this.moveHistory = [];
      this.isComplete = false;

      // Initialize playerMarks matrix
      this.playerMarks = Array.from({ length: this.gridSize }, () =>
        Array(this.gridSize).fill(null as MarkType)
      );
      this.addDebugLog('playerMarks RESET by initializeGrid');
    },

    // Helper method to add debug logs
    addDebugLog(message: string) {
      // More robust check - ensure debugLogs is an array
      if (!this.debugLogs || !Array.isArray(this.debugLogs)) {
        console.warn('debugLogs was not an array, resetting it', this.debugLogs);
        this.debugLogs = [];
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
      if (!this.isValidMove(row, col)) {
        this.setPlayerMark(row, col, 'invalid');
        return false;
      }

      this.setPlayerMark(row, col, 'queen');
      return true;
    },

    updateBlockedMoves() {
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.playerMarks[row][col] === null) {
            if (!this.isValidMove(row, col)) {
              this.playerMarks[row][col] = 'flag';
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

    handlePreviousLevel() {
      if (this.currentLevel > 1) {
        this.currentLevel--;
        this.initializeGrid();
      }
    },

    handleNextLevel() {
      this.currentLevel++;
      this.initializeGrid();
    },

    handleSquareClick(row: number, col: number) {
      const currentState = this.playerMarks[row][col];
      if (currentState === null) {
        this.placeFlag(row, col);
      } else if (currentState === 'flag') {
        this.placeQueen(row, col);
      }
    },

    /**
     * Attempts to place all queens on the board using knight-move preference and full backtracking.
     * Returns true if a solution is found, false otherwise.
     */
    placeRandomQueen(): boolean {
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
            if (this.playerMarks[r][c] === 'queen') lastQueen = { row: r, col: c };
          }
        }
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            if (this.playerMarks[row][col] === null && this.isValidMove(row, col)) {
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

      // Helper: Deep clone playerMarks
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
          const prevMarks = cloneMarks(this.playerMarks);
          // Simulate player: place flag, then queen
          this.setPlayerMark(row, col, 'flag');
          this.setPlayerMark(row, col, 'queen');
          this.updateBlockedMoves();
          if (verbose)
            this.addDebugLog(`Tried queen at (${row},${col}), stack depth ${queensPlaced + 1}`);
          if (backtrack(queensPlaced + 1)) return true;
          // Backtrack
          for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
              this.playerMarks[r][c] = prevMarks[r][c];
            }
          }
          if (verbose)
            this.addDebugLog(`Backtracked from (${row},${col}), stack depth ${queensPlaced + 1}`);
        }
        return false;
      };

      // Clear board before starting
      this.clearQueensAndFlags();
      let success = backtrack(0);
      if (!success && verbose)
        this.addDebugLog(
          'Failed to generate a random queen placement after max attempts, resetting.'
        );
      return success;
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
      this.addDebugLog('playerMarks CLEARED by clearQueensAndFlags');

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
      this.grid = assignInitialColorsToQueensUtil(this.grid, this.queenPositions, (msg) =>
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

    // New method to generate a full solution
    placeAllQueens() {
      if (this.verboseMode) {
        this.addDebugLog('Starting placeAllQueens');
      }

      // Clear existing solution
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.grid[row][col].isSolutionQueen = false;
        }
      }

      // Keep placing queens until we have a complete solution or no more moves
      let attempts = 0;
      const maxAttempts = 100;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 5;

      if (this.verboseMode) {
        this.addDebugLog(`Target: ${this.gridSize} queens, Max attempts: ${maxAttempts}`);
      }

      // Try to solve the puzzle
      while (this.queenPositions.length < this.gridSize && attempts < maxAttempts) {
        attempts++;

        if (this.verboseMode && attempts % 10 === 0) {
          this.addDebugLog(
            `Attempt ${attempts}: ${this.queenPositions.length}/${this.gridSize} queens placed`
          );
        }

        const success = this.placeRandomQueen();
        if (!success) {
          consecutiveFailures++;
          if (this.verboseMode) {
            this.addDebugLog(`Placement failed, consecutive failures: ${consecutiveFailures}`);
          }

          if (consecutiveFailures >= maxConsecutiveFailures) {
            if (this.verboseMode) {
              this.addDebugLog('Too many consecutive failures, resetting board');
            }
            this.clearQueensAndFlags();
            consecutiveFailures = 0;
          }
        } else {
          consecutiveFailures = 0; // Reset failure counter on success
        }
      }

      const finalQueenCount = this.queenPositions.length;
      if (this.verboseMode) {
        this.addDebugLog(
          `Generation complete: ${finalQueenCount}/${this.gridSize} queens after ${attempts} attempts`
        );
      }

      if (finalQueenCount === this.gridSize) {
        // Record the final queen placements in our solution data
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            if (this.playerMarks[row][col] === 'queen') {
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

    // Helper for one generation attempt: returns puzzle name or null
    attemptGeneratePuzzle(attempt: number, requiredQueens: number): string | null {
      this.addDebugLog(`Attempt ${attempt}: Starting puzzle generation`);
      this.placeAllQueens(); // build full solution

      // Make sure color groups are assigned before proceeding
      this.addDebugLog(`Attempt ${attempt}: Assigning color groups to solution`);
      this.assignColorGroups();

      // Debug info: get color distribution using utility
      const { totalColored, totalSquares, colorCounts } = getColorDistribution(this.grid);
      this.addDebugLog(
        `Attempt ${attempt}: Color assignment complete - ${totalColored}/${totalSquares} cells colored`
      );
      Object.entries(colorCounts).forEach(([color, count]) => {
        this.addDebugLog(`  - Color ${color}: ${count} cells`);
      });

      this.clearQueensAndFlags(); // reset markers
      this.runAllSolverSteps(); // cycle solve steps

      const { queenCountValid, allFilled, colorGroupsValid } = this.validatePuzzle();

      // Add more detailed validation logs
      this.addDebugLog(`Attempt ${attempt}: Final validation:`);
      this.addDebugLog(
        `  - Queens: ${this.queenPositions.length}/${requiredQueens} (valid: ${queenCountValid})`
      );
      this.addDebugLog(`  - All cells filled: ${allFilled}`);
      this.addDebugLog(`  - Color groups valid: ${colorGroupsValid}`);

      if (!(queenCountValid && allFilled && colorGroupsValid)) {
        this.addDebugLog(
          `Attempt ${attempt}: Validation failed. Queens: ${this.queenPositions.length}, Filled: ${allFilled}, Colors OK: ${colorGroupsValid}`
        );
        return null;
      }
      const name = this.savePuzzleToLocalStorage();
      if (!name) {
        this.addDebugLog(`Attempt ${attempt}: Save failed`);
      }
      return name || null;
    },

    // New method to generate and validate a puzzle that can be solved with steps
    async generateStepSolvablePuzzle(maxAttempts = 10000) {
      if (this.puzzleGenerationState.isGenerating) return;

      this.puzzleGenerationState.isGenerating = true;
      this.puzzleGenerationState.currentStep = null;
      this.puzzleGenerationState.completedSteps = 0;
      this.puzzleGenerationState.totalSteps = 5; // Assuming there are 5 main steps
      this.puzzleGenerationState.isInterrupted = false;

      try {
        // Reset logs for clarity
        this.debugLogs = [];

        // Use grid size for required queens - they should match
        const requiredQueens = this.gridSize;

        this.addDebugLog(
          `Starting to generate a step-solvable puzzle for ${this.gridSize}x${this.gridSize} board...`
        );

        let attemptSummary: AttemptResult[] = [];

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          if (this.puzzleGenerationState.isInterrupted) {
            this.addDebugLog('Process interrupted');
            break;
          }

          try {
            // Only log every 5th attempt for brevity
            const shouldLogDetail = attempt % 5 === 1 || attempt === maxAttempts;

            if (shouldLogDetail) {
              this.addDebugLog(`\nAttempt ${attempt}/${maxAttempts}`);
            }

            // Generate solution with queens
            this.placeAllQueens();
            this.puzzleGenerationState.completedSteps++;

            // Skip if solution generation failed
            if (this.queenPositions.length !== this.gridSize) {
              this.addDebugLog(
                `Failed to generate full solution. Got ${this.queenPositions.length}/${this.gridSize} queens.`
              );
              continue;
            }

            // Assign color groups
            this.assignColorGroups();
            this.puzzleGenerationState.completedSteps++;

            // More concise color distribution info
            if (shouldLogDetail) {
              this.logColorDistribution();
            }

            // Clear queens and flags to test step-solving
            this.clearQueensAndFlags();

            // Run brute force solver to verify puzzle has exactly one solution
            const numSolutions = this.bruteForceSolver(2); // Look for up to 2 solutions
            this.puzzleGenerationState.completedSteps++;

            if (numSolutions !== 1) {
              if (shouldLogDetail) {
                this.addDebugLog(`Skipping: Found ${numSolutions} solutions, need exactly 1`);
              }
              continue;
            }

            // Validate the puzzle state after solver
            const { queenCountValid, allFilled, colorGroupsValid } = this.validatePuzzle();
            const queenCount = this.queenPositions.length;

            const attemptResult = {
              attempt,
              queens: queenCount,
              requiredQueens,
              allFilled,
              colorGroupsValid,
              success: queenCountValid && allFilled && colorGroupsValid,
            };

            attemptSummary.push(attemptResult);

            if (shouldLogDetail) {
              this.addDebugLog(
                `Queens: ${queenCount}/${requiredQueens}, Filled: ${allFilled}, Valid Groups: ${colorGroupsValid}`
              );
            }

            if (attemptResult.success) {
              // Restore the original solution
              this.clearQueensAndFlags();
              for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                  if (this.grid[row][col].isSolutionQueen) {
                    this.placeQueen(row, col);
                  }
                }
              }

              const name = this.savePuzzleToLocalStorage();
              if (name) {
                this.addDebugLog(
                  `\n✅ SUCCESS: Step-solvable puzzle saved as "${name}" after ${attempt} attempts`
                );

                // Add summary statistics
                this.summarizeAttempts(attemptSummary);

                return name;
              }
            }
          } catch (attemptError) {
            // Log error for this specific attempt but continue with next
            console.error(`Error in attempt ${attempt}:`, attemptError);
            const errorMessage =
              attemptError instanceof Error ? attemptError.message : 'Unknown error';
            this.addDebugLog(`❌ Error in attempt ${attempt}: ${errorMessage}`);
          }
        }

        // Generate failure summary with statistics
        this.addDebugLog(
          `\n❌ FAILED: Could not generate step-solvable puzzle after ${maxAttempts} attempts`
        );
        this.summarizeAttempts(attemptSummary);

        this.setError(`Failed to generate a step-solvable puzzle after ${maxAttempts} attempts`);
        return null;
      } catch (error: unknown) {
        console.error('Critical error in puzzle generation:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.addDebugLog(`❌ CRITICAL ERROR: ${errorMessage}`);
        this.setError(`Error generating puzzle: ${errorMessage}`);
        return null;
      } finally {
        this.puzzleGenerationState.isGenerating = false;
        this.puzzleGenerationState.currentStep = null;
      }
    },

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

    // Helper for step 1: Place queens in last free squares of color blocks, rows, or columns
    placeLastFreeQueens() {
      return placeLastFreeQueens(this.grid, this.playerMarks, this.gridSize, (row, col) =>
        this.placeQueen(row, col)
      );
    },

    // Helper for step 2: Flag squares where a queen would block all remaining squares in other color groups
    flagBlockingSquares() {
      return flagBlockingSquares(this.grid, this.playerMarks, this.gridSize, (row, col) =>
        this.placeFlag(row, col)
      );
    },

    // Step 3: Constrained Row Elimination
    eliminateConstrainedRows() {
      return eliminateConstrainedRows(this.grid, this.playerMarks, this.gridSize, (row, col) =>
        this.placeFlag(row, col)
      );
    },

    // Step 4: Constrained Column Elimination
    eliminateConstrainedColumns() {
      return eliminateConstrainedColumns(this.grid, this.playerMarks, this.gridSize, (row, col) =>
        this.placeFlag(row, col)
      );
    },

    // Step 5: Flag squares where a queen would block all remaining free squares in any row or column
    blockRowsAndColumns() {
      return blockRowsAndColumns(this.grid, this.playerMarks, this.gridSize, (row, col) =>
        this.placeFlag(row, col)
      );
    },

    // New: Loop through all steps until no changes
    runAllSolverSteps() {
      // Instead of creating a local array, we'll just pass our logging function
      runAllSolverSteps(
        this.grid,
        this.playerMarks,
        this.gridSize,
        (row, col) => this.placeQueen(row, col),
        (row, col) => this.placeFlag(row, col),
        () => this.countFlags(),
        () => this.queenPositions,
        (message: string) => this.addDebugLog(message),
        this.verboseMode
      );
    },

    // Generate summary statistics from attempts
    summarizeAttempts(attempts: AttemptResult[]) {
      try {
        if (!attempts || attempts.length === 0) {
          this.addDebugLog('No attempt data to summarize');
          return;
        }

        const queensHistogram: Record<number, number> = {};
        let filledCount = 0;
        let validGroupsCount = 0;

        attempts.forEach((attempt) => {
          queensHistogram[attempt.queens] = (queensHistogram[attempt.queens] || 0) + 1;
          if (attempt.allFilled) filledCount++;
          if (attempt.colorGroupsValid) validGroupsCount++;
        });

        this.addDebugLog(`\n--- Generation Statistics ---`);
        this.addDebugLog(`Total attempts: ${attempts.length}`);

        if (Object.keys(queensHistogram).length > 0) {
          this.addDebugLog(`Queens distribution: ${JSON.stringify(queensHistogram)}`);
        }

        const filledPercent = attempts.length
          ? Math.round((filledCount / attempts.length) * 100)
          : 0;
        const validPercent = attempts.length
          ? Math.round((validGroupsCount / attempts.length) * 100)
          : 0;

        this.addDebugLog(
          `Fully filled boards: ${filledCount}/${attempts.length} (${filledPercent}%)`
        );
        this.addDebugLog(
          `Valid color groups: ${validGroupsCount}/${attempts.length} (${validPercent}%)`
        );
      } catch (error: unknown) {
        console.error('Error summarizing attempts:', error);
        this.addDebugLog(
          `Error summarizing attempt data: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
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

    // Method to sync legacy grid with new model (temporary during transition)
    syncGridWithNewModel(): void {
      // Update colors in the grid
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const cell = this.grid[row][col];
          if (cell.groupColor) {
            this.grid[row][col].groupColor = cell.groupColor;
          }
        }
      }
    },

    // Method to sync new model with legacy grid (temporary during transition)
    syncNewModelWithGrid(): void {
      // Clear new model data
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.grid[row][col].groupColor = undefined;
          this.grid[row][col].isSolutionQueen = false;
          this.playerMarks[row][col] = null;
        }
      }

      // Update from legacy grid
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const cell = this.grid[row][col];
          if (cell.groupColor) {
            this.grid[row][col].groupColor = cell.groupColor;
          }
        }
      }
    },

    // Add toggle for verbose mode
    toggleVerboseMode() {
      this.verboseMode = !this.verboseMode;
      this.addDebugLog(`Verbose mode ${this.verboseMode ? 'enabled' : 'disabled'}`);
    },

    bruteForceSolver(maxSolutions = 5): number {
      return bruteForceSolver(
        this.grid,
        this.playerMarks,
        this.gridSize,
        (row, col) => this.placeQueen(row, col),
        (row, col) => this.placeFlag(row, col),
        () => this.countFlags(),
        () => this.queenPositions,
        (msg) => this.addDebugLog(msg),
        maxSolutions
      );
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

    // Helper to get render state
    getRenderState(row: number, col: number) {
      const playerMark = this.playerMarks[row][col];
      const hasSolutionQueen = this.grid[row][col].isSolutionQueen;

      const isCorrect = playerMark === 'queen' && hasSolutionQueen;
      const isIncorrect = playerMark === 'queen' && !hasSolutionQueen;

      return { playerMark, hasSolutionQueen, isCorrect, isIncorrect };
    },

    runAllSteps() {
      try {
        // Clear any existing error messages and debug logs
        this.setError(null);

        this.addDebugLog('=== Starting Run All Steps ===');

        // Reset everything first
        this.addDebugLog('Step 1: Initializing grid and clearing markers');
        this.initializeGrid();
        this.clearQueensAndFlags();

        // Place all queens
        this.addDebugLog('Step 2: Placing all queens');
        this.placeAllQueens();

        if (this.queenPositions.length !== this.gridSize) {
          const errorMsg = `Failed to generate queen positions: ${this.queenPositions.length}/${this.gridSize} queens placed`;
          this.addDebugLog(`❌ ${errorMsg}`);
          this.setError(errorMsg);
          return;
        }
        this.addDebugLog(`✅ Generated ${this.queenPositions.length} queens`);

        // Assign initial colors to queens
        this.addDebugLog('Step 3: Assigning initial colors to queens');
        this.assignInitialColorsToQueens();

        // Expand color groups
        this.addDebugLog('Step 4: Expanding color groups');
        this.expandColorGroups();

        // Color one square per row
        this.addDebugLog('Step 5: Coloring one square per row');
        this.addColorOnePerRow();

        // Fill remaining squares
        this.addDebugLog('Step 6: Filling remaining squares');
        this.fillRemainingSingleSquares();

        this.addDebugLog('=== Run All Steps Complete ===');
      } catch (error) {
        console.error('Error in runAllSteps:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const fullErrorMsg = `An error occurred while generating the puzzle: ${errorMessage}`;

        this.addDebugLog(`❌ CRITICAL ERROR: ${errorMessage}`);
        this.addDebugLog(
          `Stack trace: ${error instanceof Error ? error.stack : 'No stack trace available'}`
        );
        this.setError(fullErrorMsg);
      }
    },

    interruptPuzzleGeneration() {
      this.puzzleGenerationState.isInterrupted = true;
    },
  },
});
