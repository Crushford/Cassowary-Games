import { defineStore } from 'pinia';
import type { GridSquare } from '../components/GameGrid.vue';

export interface GameState {
  grid: GridSquare[][];
  gridSize: number;
  moveHistory: { grid: GridSquare[][] }[];
  currentLevel: number;
  availableMoves: { row: number; col: number }[];
  isComplete: boolean;
  errorMessage: string | null;
  savedPuzzles: { name: string; grid: GridSquare[][]; gridSize: number }[];
  currentPuzzle: string | null;
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    grid: Array(6)
      .fill(null)
      .map(() =>
        Array(6)
          .fill(null)
          .map(() => ({ state: 'empty' }))
      ),
    gridSize: 6,
    moveHistory: [],
    currentLevel: 1,
    availableMoves: [],
    isComplete: false,
    errorMessage: null,
    savedPuzzles: [],
    currentPuzzle: null,
  }),

  getters: {
    // Get all positions where queens are placed
    queenPositions: (state): { row: number; col: number }[] => {
      const positions: { row: number; col: number }[] = [];
      for (let row = 0; row < state.gridSize; row++) {
        for (let col = 0; col < state.gridSize; col++) {
          if (state.grid[row][col].state === 'queen') {
            positions.push({ row, col });
          }
        }
      }
      return positions;
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
          pos.r >= 0 &&
          pos.r < state.gridSize &&
          pos.c >= 0 &&
          pos.c < state.gridSize &&
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
      this.grid = Array(this.gridSize)
        .fill(null)
        .map(() =>
          Array(this.gridSize)
            .fill(null)
            .map(() => ({ state: 'empty' }))
        );
      this.moveHistory = [];
      this.isComplete = false;
      this.updateAvailableMoves();
    },

    updateAvailableMoves() {
      this.availableMoves = [];
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].state === 'empty' && this.isValidMove(row, col)) {
            this.availableMoves.push({ row, col });
          }
        }
      }
    },

    placeFlag(row: number, col: number) {
      if (this.grid[row][col].state !== 'empty') return false;

      this.saveToHistory();
      this.grid[row][col].state = 'flag';
      return true;
    },

    placeQueen(row: number, col: number) {
      if (!this.isValidMove(row, col)) {
        this.grid[row][col].state = 'invalid';
        return false;
      }

      this.saveToHistory();
      this.grid[row][col].state = 'queen';
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
      this.moveHistory.push({
        grid: JSON.parse(JSON.stringify(this.grid)),
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

    handleRestart() {
      this.initializeGrid();
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

    placeRandomQueen() {
      if (this.availableMoves.length === 0) {
        // If we have no valid moves but not all queens are placed,
        // we're in a dead end. Reset the grid instead of showing error.
        if (this.queenPositions.length < this.gridSize) {
          this.handleRestart();
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
      // Check if we have placed all required queens
      const requiredQueens = this.gridSize;
      this.isComplete = this.queenPositions.length === requiredQueens;
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

    // New function to assign color groups to ensure a unique solution
    assignColorGroups() {
      if (!this.isComplete) {
        this.setError('Need a complete solution before assigning color groups');
        return;
      }

      const colorPalette: ('red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink')[] = [
        'red',
        'blue',
        'green',
        'yellow',
        'purple',
        'pink',
      ];

      // Step 1: Reset all color groups (always clear previous assignment)
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.grid[row][col].groupColor = undefined;
        }
      }

      // Step 2: Get all queen positions
      let queens = [...this.queenPositions];
      const numQueens = queens.length;

      // Shuffle the queens array for more randomness
      queens = queens.sort(() => Math.random() - 0.5);

      // Make sure we have enough colors
      if (numQueens > colorPalette.length) {
        this.setError(`Not enough colors (${colorPalette.length}) for all queens (${numQueens})`);
        return;
      }

      // Step 3: Assign a unique color to each queen (shuffle colors each time)
      const shuffledPalette = [...colorPalette].sort(() => Math.random() - 0.5);
      queens.forEach((queen, index) => {
        this.grid[queen.row][queen.col].groupColor = shuffledPalette[index];
      });

      // Define the four adjacent directions
      const directions = [
        { dr: 1, dc: 0 }, // down
        { dr: -1, dc: 0 }, // up
        { dr: 0, dc: 1 }, // right
        { dr: 0, dc: -1 }, // left
      ];

      // Step 4: Grow regions randomly from all queens at once
      let globalQueue: { row: number; col: number; color: string }[] = [];
      queens.forEach((queen, index) => {
        const color = shuffledPalette[index];
        globalQueue.push({ row: queen.row, col: queen.col, color });
      });

      const visited = new Set<string>();
      const totalCells = this.gridSize * this.gridSize;

      while (visited.size < totalCells && globalQueue.length > 0) {
        // Randomly pick a cell from the queue
        const idx = Math.floor(Math.random() * globalQueue.length);
        const { row, col, color } = globalQueue.splice(idx, 1)[0];

        // Randomly shuffle directions for more natural growth
        const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);

        for (const dir of shuffledDirs) {
          const newR = row + dir.dr;
          const newC = col + dir.dc;
          const newKey = `${newR},${newC}`;

          if (
            this.isValidPosition(newR, newC) &&
            !visited.has(newKey) &&
            this.grid[newR][newC].state !== 'queen' // Don't color other queens
          ) {
            this.grid[newR][newC].groupColor = color;
            visited.add(newKey);
            globalQueue.push({ row: newR, col: newC, color });
          }
        }
      }

      // Step 6: If any cells remain uncolored, assign them to the nearest colored cell
      if (visited.size < totalCells) {
        // Create a queue with all colored cells as starting points
        const borderQueue: [number, number, string][] = [];

        // Add all colored cells to the queue
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            const color = this.grid[row][col].groupColor;
            if (color) {
              borderQueue.push([row, col, color]);
            }
          }
        }

        // Use BFS to fill in uncolored cells
        while (borderQueue.length > 0) {
          const [r, c, color] = borderQueue.shift()!;

          // Check all four directions
          for (const dir of directions) {
            const newR = r + dir.dr;
            const newC = c + dir.dc;
            const newKey = `${newR},${newC}`;

            if (
              this.isValidPosition(newR, newC) &&
              !this.grid[newR][newC].groupColor &&
              this.grid[newR][newC].state !== 'queen' // Don't color other queens
            ) {
              // Assign this cell the same color
              this.grid[newR][newC].groupColor = color;
              visited.add(newKey);

              // Add to queue to continue expanding
              borderQueue.push([newR, newC, color]);
            }
          }
        }
      }

      // Step 7: Final check - ensure all queens have different colors and all cells are colored
      const colorToQueenMap = new Map<string, number>();

      // Count queens per color
      for (const queen of queens) {
        const color = this.grid[queen.row][queen.col].groupColor;
        if (color) {
          colorToQueenMap.set(color, (colorToQueenMap.get(color) || 0) + 1);
        }
      }

      // Verify each color has exactly one queen
      let colorIssue = false;
      colorToQueenMap.forEach((count, color) => {
        if (count !== 1) {
          colorIssue = true;
          this.setError(`Color ${color} has ${count} queens, should have exactly 1`);
        }
      });

      // If there's an issue, try a different approach
      if (colorIssue) {
        // Reset and use a simpler algorithm
        this.assignColorGroupsFallback();
      }

      // Step 7: Break up any 4x4 (or larger) solid color blocks
      const minBlockSize = 4;
      for (let blockSize = minBlockSize; blockSize <= this.gridSize; blockSize++) {
        for (let row = 0; row <= this.gridSize - blockSize; row++) {
          for (let col = 0; col <= this.gridSize - blockSize; col++) {
            const color = this.grid[row][col].groupColor;
            if (!color) continue;
            let isBlock = true;
            // Check if all cells in blockSize x blockSize block are the same color
            for (let dr = 0; dr < blockSize; dr++) {
              for (let dc = 0; dc < blockSize; dc++) {
                if (this.grid[row + dr][col + dc].groupColor !== color) {
                  isBlock = false;
                  break;
                }
              }
              if (!isBlock) break;
            }
            if (isBlock) {
              // Try to break up the block by changing the color of one cell (bottom right corner)
              let changed = false;
              const targetR = row + blockSize - 1;
              const targetC = col + blockSize - 1;
              // Try to find a neighboring color
              const directions = [
                { dr: 1, dc: 0 },
                { dr: -1, dc: 0 },
                { dr: 0, dc: 1 },
                { dr: 0, dc: -1 },
              ];
              let newColor = null;
              for (const dir of directions) {
                const nr = targetR + dir.dr;
                const nc = targetC + dir.dc;
                if (
                  this.isValidPosition(nr, nc) &&
                  this.grid[nr][nc].groupColor &&
                  this.grid[nr][nc].groupColor !== color
                ) {
                  newColor = this.grid[nr][nc].groupColor;
                  break;
                }
              }
              if (newColor) {
                this.grid[targetR][targetC].groupColor = newColor;
                // Optionally, check if both color regions remain connected
                // If not, revert and try another cell or color
                if (!this.isColorConnected(color) || !this.isColorConnected(newColor)) {
                  this.grid[targetR][targetC].groupColor = color; // revert
                } else {
                  changed = true;
                }
              }
              // If unable to change, could try other cells in the block
              // For now, break after first attempt
              if (changed) break;
            }
          }
        }
      }
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
      const colorCells: [number, number][] = [];
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].groupColor === targetColor) {
            colorCells.push([row, col]);
          }
        }
      }

      if (colorCells.length === 0) return true; // No cells, trivially connected

      // Perform a flood fill from the first cell to see if we can reach all others
      const visited = new Set<string>();
      const queue: [number, number][] = [colorCells[0]];
      const directions = [
        { dr: 1, dc: 0 }, // down
        { dr: -1, dc: 0 }, // up
        { dr: 0, dc: 1 }, // right
        { dr: 0, dc: -1 }, // left
      ];

      while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        const key = `${r},${c}`;

        if (visited.has(key)) continue;
        visited.add(key);

        // Check all four directions
        for (const dir of directions) {
          const newR = r + dir.dr;
          const newC = c + dir.dc;

          if (
            this.isValidPosition(newR, newC) &&
            this.grid[newR][newC].groupColor === targetColor &&
            !visited.has(`${newR},${newC}`)
          ) {
            queue.push([newR, newC]);
          }
        }
      }

      // Check if we visited all cells of this color
      return visited.size === colorCells.length;
    },

    // Helper to check if a position is valid
    isValidPosition(row: number, col: number) {
      return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
    },

    // New method to generate a full solution
    generateFullSolution() {
      this.handleRestart();

      // Keep placing queens until we have a complete solution or no more moves
      let attempts = 0;
      const maxAttempts = 100;

      // Try to solve the puzzle
      while (!this.isComplete && attempts < maxAttempts) {
        const success = this.placeRandomQueen();
        if (!success) {
          // If we can't place more queens, restart and try again
          this.handleRestart();
        }
        attempts++;
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
        .map(() =>
          Array(this.gridSize)
            .fill(null)
            .map(() => ({ state: 'empty' }) as GridSquare)
        );

      // Copy only the queens and their color groups
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].state === 'queen') {
            puzzleGrid[row][col] = {
              state: 'queen',
              groupColor: this.grid[row][col].groupColor,
            } as GridSquare;
          } else if (this.grid[row][col].groupColor) {
            puzzleGrid[row][col] = {
              state: 'empty',
              groupColor: this.grid[row][col].groupColor,
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
      return puzzleName;
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

    // Remove all queens and flags but keep color groups
    clearQueensAndFlags() {
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (
            this.grid[row][col].state === 'queen' ||
            this.grid[row][col].state === 'flag' ||
            this.grid[row][col].state === 'invalid'
          ) {
            this.grid[row][col].state = 'empty';
          }
        }
      }
      this.isComplete = false;
      this.updateAvailableMoves();
    },

    // Log array for test steps
    testLogs: [] as string[],
    // Log array for detailed debug info for step 2
    testDebugLogs: [] as any[],

    // Helper for step 1: Place queens in last free squares of color blocks, rows, or columns
    testStep1PlaceLastFreeQueens() {
      type Pos = { row: number; col: number };
      let placed;
      let didSomething = false;
      do {
        placed = false;
        // 1. Check color blocks
        const colorGroups = new Map<string, Pos[]>();
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            const color = this.grid[row][col].groupColor;
            if (!color) continue;
            if (!colorGroups.has(color)) colorGroups.set(color, []);
            colorGroups.get(color)!.push({ row, col });
          }
        }
        for (const [color, group] of colorGroups.entries()) {
          const free: Pos[] = group.filter(({ row, col }) => this.grid[row][col].state === 'empty');
          if (free.length === 1) {
            const { row, col } = free[0];
            this.placeQueen(row, col);
            this.testLogs.push(
              `Placed queen at (${row},${col}) as last free in color group '${color}'.`
            );
            placed = true;
            didSomething = true;
            break;
          }
        }
        if (placed) continue;
        // 2. Check rows
        for (let row = 0; row < this.gridSize; row++) {
          const free: Pos[] = [];
          for (let col = 0; col < this.gridSize; col++) {
            if (this.grid[row][col].state === 'empty') free.push({ row, col });
          }
          if (free.length === 1) {
            const { row, col } = free[0];
            this.placeQueen(row, col);
            this.testLogs.push(`Placed queen at (${row},${col}) as last free in row ${row}.`);
            placed = true;
            didSomething = true;
            break;
          }
        }
        if (placed) continue;
        // 3. Check columns
        for (let col = 0; col < this.gridSize; col++) {
          const free: Pos[] = [];
          for (let row = 0; row < this.gridSize; row++) {
            if (this.grid[row][col].state === 'empty') free.push({ row, col });
          }
          if (free.length === 1) {
            const { row, col } = free[0];
            this.placeQueen(row, col);
            this.testLogs.push(`Placed queen at (${row},${col}) as last free in column ${col}.`);
            placed = true;
            didSomething = true;
            break;
          }
        }
      } while (placed);
      return didSomething;
    },

    // Helper for step 2: Flag squares where a queen would block all remaining squares in other color groups
    testStep2FlagBlockingSquares() {
      type Pos = { row: number; col: number };
      let flagCount = 0;
      let didSomething = false;
      // Helper: does a queen at (aRow, aCol) attack (tRow, tCol)?
      function queenAttacks(aRow: number, aCol: number, tRow: number, tCol: number): boolean {
        return aRow === tRow || aCol === tCol || Math.abs(aRow - tRow) === Math.abs(aCol - tCol);
      }
      // Clear debug logs for this step
      this.testDebugLogs = [];
      // Build map of empty squares by color group
      const emptyColorGroups = new Map<string, Pos[]>();
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          if (this.grid[r][c].state === 'empty') {
            const grp = this.grid[r][c].groupColor;
            if (!grp) continue;
            if (!emptyColorGroups.has(grp)) emptyColorGroups.set(grp, []);
            emptyColorGroups.get(grp)!.push({ row: r, col: c });
          }
        }
      }
      // For each empty square, check all other color groups
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].state !== 'empty') continue;
          const myColor = this.grid[row][col].groupColor;
          if (!myColor) continue;
          for (const [otherColor, groupEmpty] of emptyColorGroups.entries()) {
            if (otherColor === myColor) continue;
            if (groupEmpty.length === 0) continue;
            let allAttacked = true;
            for (const { row: r, col: c } of groupEmpty) {
              if (!queenAttacks(row, col, r, c)) {
                allAttacked = false;
                break;
              }
            }
            if (allAttacked) {
              // Serialize board before
              const before = this.exportGameState();
              this.placeFlag(row, col);
              // Serialize board after
              const after = this.exportGameState();
              const reason = `A queen at (${row},${col}) would attack all remaining in color group '${otherColor}'.`;
              this.testLogs.push(
                `Flagged (${row},${col}) because a queen here would attack all remaining in color '${otherColor}'.`
              );
              this.testDebugLogs.push({
                step: 2,
                action: 'place_flag',
                position: { row, col },
                color: otherColor,
                reason,
                before,
                after,
              });
              flagCount++;
              didSomething = true;
              break;
            }
          }
        }
      }
      this.testLogs.push(`Step 2 complete: Placed ${flagCount} flags.`);
      return didSomething;
    },

    // New: Loop through all steps until no changes
    testAllStepsLoop() {
      this.testLogs = [];
      this.clearQueensAndFlags();
      this.testLogs.push('--- Test started: Unique Solution Check (Loop) ---');
      let loop = 1;
      let anyChange;
      do {
        this.testLogs.push(`--- Loop ${loop} ---`);
        let changed1 = this.testStep1PlaceLastFreeQueens();
        let changed2 = this.testStep2FlagBlockingSquares();
        anyChange = changed1 || changed2;
        this.testLogs.push(
          `Loop ${loop} result: Step1 changed=${changed1}, Step2 changed=${changed2}`
        );
        loop++;
      } while (anyChange);
      this.testLogs.push('--- Test finished (all steps, looped until no changes) ---');
    },

    // Test function to try to solve the game and log each step
    testUniqueSolution() {
      this.testAllStepsLoop();
    },
  },
});
