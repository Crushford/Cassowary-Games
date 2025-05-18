import { defineStore } from 'pinia';
import type { GridSquare, Pos, GameState, AttemptResult } from '../types/types';
// Import utility functions
import {
  createEmptyGrid,
  getQueenPositions,
  computeAvailableMoves,
  clearMarkers,
  validatePuzzleState,
  isValidPosition,
  cloneGrid,
  queenAttacks,
  countEmptyCells,
  countCellsWithState,
  getColorDistribution,
} from './gameStoreUtils';
import {
  assignColors,
  ensureNoSingletonColorBlocks,
  addOneToEachColorGroup,
  addColorToEachRow,
  fillRemainingSquares,
} from '../utils/colorAssignment';
import {
  placeLastFreeQueens,
  flagBlockingSquares,
  eliminateConstrainedRows,
  eliminateConstrainedColumns,
  blockRowsAndColumns,
  runAllSolverSteps,
} from './solver';

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    // Use createEmptyGrid utility
    grid: createEmptyGrid(6),
    gridSize: 6,
    moveHistory: [],
    currentLevel: 1,
    availableMoves: [],
    isComplete: false,
    errorMessage: null,
    savedPuzzles: [],
    currentPuzzle: null,
    currentSolution: [],
    debugLogs: [], // Initialize as empty array
    colorToolActive: false,
    colorToolSelectedColor: null as string | null,
  }),

  getters: {
    // Use getQueenPositions utility
    queenPositions: (state): Pos[] => {
      return getQueenPositions(state.grid);
    },

    isValidMove: (state) => (row: number, col: number) => {
      const square = state.grid[row][col];

      // Check if there's a queen in the same row or column
      for (let i = 0; i < state.gridSize; i++) {
        if (state.grid[row][i].state === 'queen' || state.grid[i][col].state === 'queen') {
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
          state.grid[pos.r][pos.c].state === 'queen'
        ) {
          return false;
        }
      }

      // Check color group (if the square has a group color)
      if (square.groupColor) {
        for (let r = 0; r < state.gridSize; r++) {
          for (let c = 0; c < state.gridSize; c++) {
            if (
              state.grid[r][c].state === 'queen' &&
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
      // Reset debug logs to ensure it's an array
      this.debugLogs = [];

      // Use createEmptyGrid utility
      this.grid = createEmptyGrid(this.gridSize);
      this.moveHistory = [];
      this.isComplete = false;
      this.updateAvailableMoves();

      // Add a test debug log
      this.addDebugLog('Grid initialized with size: ' + this.gridSize);
    },

    // Helper method to add debug logs
    addDebugLog(message: string) {
      // More robust check - ensure debugLogs is an array
      if (!this.debugLogs || !Array.isArray(this.debugLogs)) {
        console.warn('debugLogs was not an array, resetting it', this.debugLogs);
        this.debugLogs = [];
      }
      this.debugLogs.push(message);
      console.log('Added debug log:', message);
    },

    updateAvailableMoves() {
      // Use computeAvailableMoves utility
      this.availableMoves = computeAvailableMoves(this.grid, (row, col) =>
        this.isValidMove(row, col)
      );
    },

    placeFlag(row: number, col: number) {
      if (this.grid[row][col].state !== 'empty') return false;

      this.saveToHistory();
      this.grid[row][col].state = 'flag';
      this.grid[row][col].playerMark = 'flag';
      return true;
    },

    placeQueen(row: number, col: number) {
      if (!this.isValidMove(row, col)) {
        this.grid[row][col].state = 'invalid';
        return false;
      }

      this.saveToHistory();
      this.grid[row][col].state = 'queen';
      this.grid[row][col].playerMark = 'queen';
      this.updateBlockedMoves();
      this.updateAvailableMoves();
      this.checkCompletion();
      return true;
    },

    updateBlockedMoves() {
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].state === 'empty') {
            if (!this.isValidMove(row, col)) {
              this.grid[row][col].state = 'flag';
            }
          }
        }
      }
    },

    saveToHistory() {
      // Use cloneGrid utility
      this.moveHistory.push({
        grid: cloneGrid(this.grid),
      });
    },

    handleUndo() {
      if (this.moveHistory.length > 0) {
        const lastState = this.moveHistory.pop();
        if (lastState) {
          this.grid = lastState.grid;
          this.updateAvailableMoves();
          this.checkCompletion();
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
      const currentState = this.grid[row][col].state;
      if (currentState === 'empty') {
        this.placeFlag(row, col);
      } else if (currentState === 'flag') {
        this.placeQueen(row, col);
      }
    },

    placeRandomQueen(): boolean {
      if (this.availableMoves.length === 0) {
        // If we have no valid moves but not all queens are placed,
        // we're in a dead end. Reset the grid instead of showing error.
        if (this.queenPositions.length < this.gridSize) {
          this.clearQueensAndFlags();
          return this.placeRandomQueen(); // Try again with fresh grid
        }

        this.setError('No valid moves available');
        return false;
      }
      const randomIndex = Math.floor(Math.random() * this.availableMoves.length);
      const { row, col } = this.availableMoves[randomIndex];
      this.setError(null);
      return this.placeQueen(row, col);
    },

    checkCompletion() {
      // Use validatePuzzleState utility
      const { queenCountValid, colorGroupsValid } = validatePuzzleState(this.grid, this.gridSize);
      this.isComplete = queenCountValid && colorGroupsValid;
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

    clearQueensAndFlags() {
      // Use clearMarkers utility
      clearMarkers(this.grid);
      // Reset player marks
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.grid[row][col].playerMark = undefined;
        }
      }
      this.isComplete = false;
      this.updateAvailableMoves();
    },

    // Replace original countFlags with more generic countCellsWithState utility
    countFlags() {
      return countCellsWithState(this.grid, 'flag');
    },

    // Replace original countEmptySquares with utility
    countEmptySquares() {
      return countEmptyCells(this.grid);
    },

    // Use isValidPosition utility to simplify this method
    isValidPosition(row: number, col: number) {
      return isValidPosition(this.grid, row, col);
    },

    // Use validatePuzzleState utility for validation
    validatePuzzle() {
      const { queenCountValid, colorGroupsValid } = validatePuzzleState(this.grid, this.gridSize);
      const allFilled = this.countEmptySquares() === 0;
      return { queenCountValid, allFilled, colorGroupsValid };
    },

    assignColorGroups() {
      this.grid = assignColors(this.grid, this.queenPositions, (message) =>
        this.addDebugLog(message)
      );
    },

    // New method to add one color to each group
    addOneColorToEachGroup() {
      // Save current state to history before making changes
      this.saveToHistory();

      // Get the current state of the grid
      const beforeState = this.grid.map((row) => row.map((square) => ({ ...square })));

      // Apply the color growth
      this.grid = addOneToEachColorGroup(this.grid);

      // Count colors before and after
      const colorsBefore = this.countColoredCells(beforeState);
      const colorsAfter = this.countColoredCells(this.grid);

      this.addDebugLog(`Adding one square to each color group`);
      this.addDebugLog(`- Before: ${colorsBefore.total} colored cells`);
      this.addDebugLog(`- After: ${colorsAfter.total} colored cells`);
      this.addDebugLog(`- Added: ${colorsAfter.total - colorsBefore.total} new colored cells`);

      // Log detailed color distribution
      Object.entries(colorsAfter.byColor).forEach(([color, count]) => {
        const before = colorsBefore.byColor[color] || 0;
        this.addDebugLog(
          `  - ${color}: ${before} → ${count as number} (+${(count as number) - before})`
        );
      });
    },

    // Helper method to count colored cells
    countColoredCells(grid: GridSquare[][]) {
      const result = {
        total: 0,
        byColor: {} as Record<string, number>,
      };

      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[0].length; col++) {
          const color = grid[row][col].groupColor;
          if (color) {
            result.total++;
            result.byColor[color] = (result.byColor[color] || 0) + 1;
          }
        }
      }

      return result;
    },

    // New method to add one color to each row
    addOneColorToEachRow(targetRow?: number) {
      // Save current state to history before making changes
      this.saveToHistory();

      // Get the current state of the grid
      const beforeState = this.grid.map((row) => row.map((square) => ({ ...square })));

      // Apply the color change - pass logging function
      this.grid = addColorToEachRow(this.grid, (message) => this.addDebugLog(message), targetRow);

      // Count colors before and after
      const colorsBefore = this.countColoredCells(beforeState);
      const colorsAfter = this.countColoredCells(this.grid);

      const rowDesc = targetRow !== undefined ? `row ${targetRow}` : 'each row';
      this.addDebugLog(`Adding one color to ${rowDesc}`);
      this.addDebugLog(`- Before: ${colorsBefore.total} colored cells`);
      this.addDebugLog(`- After: ${colorsAfter.total} colored cells`);
      this.addDebugLog(`- Added: ${colorsAfter.total - colorsBefore.total} new colored cells`);
    },

    // Method to fill any remaining uncolored squares with a neighboring color
    fillRemainingSingleSquares() {
      // Save current state to history before making changes
      this.saveToHistory();

      // Get the current state of the grid
      const beforeState = this.grid.map((row) => row.map((square) => ({ ...square })));

      // Apply the color fill using the imported function
      this.grid = fillRemainingSquares(this.grid, (message) => this.addDebugLog(message));

      // Count colors before and after
      const colorsBefore = this.countColoredCells(beforeState);
      const colorsAfter = this.countColoredCells(this.grid);

      this.addDebugLog(
        `- Before: ${colorsBefore.total}/${this.gridSize * this.gridSize} cells colored`
      );
      this.addDebugLog(
        `- After: ${colorsAfter.total}/${this.gridSize * this.gridSize} cells colored`
      );
    },

    setSquareColor(row: number, col: number, color: string) {
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

      // The grid is now assigned to a utility function, so we need to create a copy of the grid here
      // by calling the singleton color blocks function from the color assignment utils
      this.grid = ensureNoSingletonColorBlocks(this.grid);
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
    generateFullSolution() {
      this.clearQueensAndFlags();

      // Keep placing queens until we have a complete solution or no more moves
      let attempts = 0;
      const maxAttempts = 100;

      // Try to solve the puzzle
      while (!this.isComplete && attempts < maxAttempts) {
        const success = this.placeRandomQueen();
        if (!success) {
          // If we can't place more queens, restart and try again
          this.clearQueensAndFlags();
        }
        attempts++;
      }
      // Record the final queen placements so we don't override them during color changes
      this.currentSolution = [...this.queenPositions];
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
                  state: 'empty' as const,
                  groupColor: undefined,
                  playerMark: undefined,
                }) as GridSquare
            )
        );

      // Copy only the queens and their color groups
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].state === 'queen') {
            puzzleGrid[row][col] = {
              position: { row, col },
              state: 'queen' as const,
              groupColor: this.grid[row][col].groupColor,
              playerMark: 'queen' as const,
            } as GridSquare;
          } else if (this.grid[row][col].groupColor) {
            puzzleGrid[row][col] = {
              position: { row, col },
              state: 'empty' as const,
              groupColor: this.grid[row][col].groupColor,
              playerMark: undefined,
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
      this.updateAvailableMoves();
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
          const square = this.grid[row][col];
          const symbol = square.state === 'queen' ? queenSymbol : emptySymbol;
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
      this.generateFullSolution(); // build full solution

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
      if (!this.forceChangeColor()) {
        this.addDebugLog(`Attempt ${attempt}: Color change failed`);
        return null;
      }
      this.runAllSolverSteps(); // re-run solver steps
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

    // Generates puzzles until a valid one is found and stored; returns the puzzle name or null
    generateAndStoreValidPuzzle(maxAttempts = 100): string | null {
      try {
        // Reset logs for clarity
        this.debugLogs = [];

        // Use grid size for required queens - they should match
        const requiredQueens = this.gridSize;

        this.addDebugLog(
          `Starting to generate a valid puzzle for ${this.gridSize}x${this.gridSize} board...`
        );

        let attemptSummary: AttemptResult[] = [];

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            // Only log every 5th attempt for brevity
            const shouldLogDetail = attempt % 5 === 1 || attempt === maxAttempts;

            if (shouldLogDetail) {
              this.addDebugLog(`\nAttempt ${attempt}/${maxAttempts}`);
            }

            // Generate solution with queens
            this.generateFullSolution();

            // Skip if solution generation failed
            if (this.queenPositions.length !== this.gridSize) {
              this.addDebugLog(
                `Failed to generate full solution. Got ${this.queenPositions.length}/${this.gridSize} queens.`
              );
              continue;
            }

            // Assign color groups
            this.assignColorGroups();

            // More concise color distribution info
            if (shouldLogDetail) {
              this.logColorDistribution();
            }

            this.clearQueensAndFlags();
            this.runAllSolverSteps();

            // Try to change a color if there are empty squares
            const emptyCount = this.countEmptySquares();
            if (emptyCount === 0) {
              if (shouldLogDetail) {
                this.addDebugLog('No empty squares to change colors');
              }
              continue;
            }

            this.forceChangeColor();
            this.runAllSolverSteps();

            // Validate and summarize
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
              const name = this.savePuzzleToLocalStorage();
              if (name) {
                this.addDebugLog(
                  `\n✅ SUCCESS: Puzzle saved as "${name}" after ${attempt} attempts`
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
          `\n❌ FAILED: Could not generate valid puzzle after ${maxAttempts} attempts`
        );
        this.summarizeAttempts(attemptSummary);

        this.setError(`Failed to generate a valid puzzle after ${maxAttempts} attempts`);
        return null;
      } catch (error: unknown) {
        console.error('Critical error in puzzle generation:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.addDebugLog(`❌ CRITICAL ERROR: ${errorMessage}`);
        this.setError(`Error generating puzzle: ${errorMessage}`);
        return null;
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
      return placeLastFreeQueens(this.grid, this.gridSize, (row, col) => this.placeQueen(row, col));
    },

    // Helper for step 2: Flag squares where a queen would block all remaining squares in other color groups
    flagBlockingSquares() {
      return flagBlockingSquares(this.grid, this.gridSize, (row, col) => this.placeFlag(row, col));
    },

    // Step 3: Constrained Row Elimination
    eliminateConstrainedRows() {
      return eliminateConstrainedRows(this.grid, this.gridSize, (row, col) =>
        this.placeFlag(row, col)
      );
    },

    // Step 4: Constrained Column Elimination
    eliminateConstrainedColumns() {
      return eliminateConstrainedColumns(this.grid, this.gridSize, (row, col) =>
        this.placeFlag(row, col)
      );
    },

    // Step 5: Flag squares where a queen would block all remaining free squares in any row or column
    blockRowsAndColumns() {
      return blockRowsAndColumns(this.grid, this.gridSize, (row, col) => this.placeFlag(row, col));
    },

    // New: Loop through all steps until no changes
    runAllSolverSteps() {
      // Instead of creating a local array, we'll just pass our logging function
      runAllSolverSteps(
        this.grid,
        this.gridSize,
        (row, col) => this.placeQueen(row, col),
        (row, col) => this.placeFlag(row, col),
        () => this.countFlags(),
        () => this.queenPositions,
        (message: string) => this.addDebugLog(message)
      );
    },

    // Add helper to ensure no color block has a singleton square
    ensureNoSingletonColorBlocks() {
      const colorGroups: Record<string, Pos[]> = {};
      // Build map of color groups
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const color = this.grid[row][col].groupColor;
          if (!color) continue;
          if (!colorGroups[color]) colorGroups[color] = [];
          colorGroups[color].push({ row, col });
        }
      }
      const directions = [
        { dr: 1, dc: 0 },
        { dr: -1, dc: 0 },
        { dr: 0, dc: 1 },
        { dr: 0, dc: -1 },
      ];
      // Reassign any singleton cell to a neighbor's color
      for (const [color, positions] of Object.entries(colorGroups)) {
        if (positions.length === 1) {
          const { row, col } = positions[0];
          // Skip singleton if it's a queen to avoid duplicating color among queens
          if (this.grid[row][col].state === 'queen') continue;
          const neighborColors = new Set<string>();
          for (const dir of directions) {
            const newR = row + dir.dr;
            const newC = col + dir.dc;
            if (
              this.isValidPosition(newR, newC) &&
              this.grid[newR][newC].groupColor &&
              this.grid[newR][newC].groupColor !== color
            ) {
              neighborColors.add(this.grid[newR][newC].groupColor!);
            }
          }
          if (neighborColors.size > 0) {
            const choices = Array.from(neighborColors);
            const newColor = choices[Math.floor(Math.random() * choices.length)];
            this.grid[row][col].groupColor = newColor;
          }
        }
      }
    },

    // Add action to randomly change the color of an empty square to an adjacent neighbor color
    forceChangeColor() {
      const empties: Pos[] = [];
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          // Skip solution cells so we don't change a square that should have a queen
          if (
            this.grid[row][col].state === 'empty' &&
            !this.currentSolution.some((q) => q.row === row && q.col === col)
          ) {
            empties.push({ row, col });
          }
        }
      }
      // Log number of empty squares found
      this.addDebugLog(`forceChangeColor: found ${empties.length} empty squares`);
      if (empties.length === 0) {
        this.addDebugLog('forceChangeColor: no empty squares to change color');
        this.setError('No empty squares to change color');
        return false;
      }
      const randIdx = Math.floor(Math.random() * empties.length);
      const { row, col } = empties[randIdx];
      // Log selected square
      this.addDebugLog(`forceChangeColor: selected empty square at (${row},${col})`);
      const directions = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
      ];
      const neighborColors: string[] = [];
      for (const { dr, dc } of directions) {
        const newR = row + dr;
        const newC = col + dc;
        if (this.isValidPosition(newR, newC)) {
          const color = this.grid[newR][newC].groupColor;
          if (color) {
            neighborColors.push(color);
          }
        }
      }
      // Log adjacent neighbor colors
      this.addDebugLog(`forceChangeColor: neighborColors = [${neighborColors.join(', ')}]`);

      let newColor;
      if (neighborColors.length === 0) {
        // If no neighbors have colors, assign a random color from the palette
        const colorPalette: ('red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink')[] = [
          'red',
          'blue',
          'green',
          'yellow',
          'purple',
          'pink',
        ];
        newColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        this.addDebugLog(
          `forceChangeColor: no adjacent colors found, using random color "${newColor}"`
        );
      } else {
        // Use an adjacent color
        newColor = neighborColors[Math.floor(Math.random() * neighborColors.length)];
        this.addDebugLog(`forceChangeColor: using adjacent color "${newColor}"`);
      }

      // Log applying the color change
      this.addDebugLog(`forceChangeColor: changing square (${row},${col}) to color ${newColor}`);
      this.saveToHistory();
      this.grid[row][col].groupColor = newColor;

      // Use the imported ensureNoSingletonColorBlocks function
      this.grid = ensureNoSingletonColorBlocks(this.grid);
      return true;
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
  },
});
