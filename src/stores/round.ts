import { defineStore } from 'pinia';
import { useGlobalStore } from './global';
import type { GridSquare } from '../types/types';
import { COLOR_SYMBOLS } from '../utils/colorPalette';

// Create reverse mapping from symbols to color names
const SYMBOL_TO_COLOR: Record<string, string> = Object.entries(COLOR_SYMBOLS).reduce(
  (acc, [color, symbol]) => {
    if (color !== 'undefined') {
      acc[symbol] = color;
    }
    return acc;
  },
  {} as Record<string, string>
);

// Create an empty grid with specified dimensions
function createEmptyGrid(size: number): GridSquare[][] {
  return Array(size)
    .fill(null)
    .map((_, row) =>
      Array(size)
        .fill(null)
        .map(
          (_, col) =>
            ({
              position: { row, col },
              groupColor: undefined,
            }) as GridSquare
        )
    );
}

interface RoundState {
  // Identity
  roundId: string;
  seed: string;
  startedAt: number;

  // Table
  tableStack: number;

  // Puzzle - using combined grid structure
  grid: GridSquare[][];
  gridSize: number;
  hiddenMapHash: string;
  puzzleFamily: string;

  // Counters
  flipsMade: number;
  queensFound: number;
  antsFound: number;

  // Status
  status: 'playing' | 'won' | 'busted';

  // Log
  actionLog: Array<{ t: number; type: string; payload: any }>;
}

export const useRoundStore = defineStore('round', {
  state: (): RoundState => ({
    roundId: '',
    seed: '',
    startedAt: 0,
    tableStack: 0,
    grid: [],
    gridSize: 4,
    hiddenMapHash: '',
    puzzleFamily: 'classicQueens',
    flipsMade: 0,
    queensFound: 0,
    antsFound: 0,
    status: 'playing',
    actionLog: [],
  }),

  actions: {
    async startRound(seed?: string) {
      const globalStore = useGlobalStore();

      // Set round identity
      this.roundId = `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.seed = seed || Math.random().toString(36).substr(2, 9);
      this.startedAt = Date.now();

      // Set table stack from config
      this.tableStack = globalStore.config.startGold;

      // Load puzzle from puzzles.json
      await this.loadRandomPuzzle();

      // Reset counters and status
      this.flipsMade = 0;
      this.queensFound = 0;
      this.antsFound = 0;
      this.status = 'playing';
      this.actionLog = [];
    },

    async loadRandomPuzzle() {
      try {
        // Load puzzles.json
        const response = await fetch('/puzzles.json');
        if (!response.ok) {
          throw new Error(`Failed to load puzzles.json: ${response.status}`);
        }

        const data = await response.json();
        const puzzles4x4 = data['4x4'] || [];

        // Filter for puzzles ending in "-0"
        const validPuzzles = puzzles4x4.filter((puzzle: any) => puzzle.id.endsWith('-0'));

        if (validPuzzles.length === 0) {
          throw new Error('No valid 4x4 puzzles found');
        }

        // Select a random puzzle
        const randomIndex = Math.floor(Math.random() * validPuzzles.length);
        const selectedPuzzle = validPuzzles[randomIndex];

        console.log('Selected puzzle:', selectedPuzzle.id);

        // Parse the puzzle data
        this.parsePuzzleData(selectedPuzzle);
      } catch (error) {
        console.error('Error loading puzzle:', error);
        throw error;
      }
    },

    parsePuzzleData(puzzleData: any) {
      const gridSize = Math.sqrt(puzzleData.layout.length);
      this.gridSize = gridSize;

      // Initialize grid with playerMark properties
      this.grid = createEmptyGrid(gridSize);
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          this.grid[row][col].playerMark = null;
        }
      }

      // Parse layout (color groups) using SYMBOL_TO_COLOR mapping
      for (let i = 0; i < puzzleData.layout.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const symbol = puzzleData.layout[i];

        if (symbol !== '.') {
          const colorName = SYMBOL_TO_COLOR[symbol];
          if (colorName) {
            this.grid[row][col].groupColor = colorName;
          } else {
            console.warn(`Warning: Unknown color symbol '${symbol}' at position ${i}`);
          }
        }
      }

      // Parse queens (solution)
      for (let i = 0; i < puzzleData.queens.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;

        if (puzzleData.queens[i] === 'Q') {
          this.grid[row][col].isSolutionQueen = true;
        }
      }

      // Generate hidden map hash
      this.hiddenMapHash = this.generateHiddenMapHash();

      console.log('Parsed puzzle:', {
        id: puzzleData.id,
        gridSize: this.gridSize,
        hiddenMapHash: this.hiddenMapHash,
      });
    },

    generateHiddenMapHash(): string {
      const hash = [];
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          hash.push(this.grid[row][col].isSolutionQueen ? 'Q' : '.');
        }
      }
      return hash.join('');
    },

    // Handle square click - this is what PlayGrid will call
    handleSquareClick(row: number, col: number) {
      if (this.status !== 'playing') return;
      if (this.grid[row][col].playerMark !== null) return; // Already marked

      const globalStore = useGlobalStore();

      if (this.grid[row][col].isSolutionQueen) {
        // Found honeypot
        this.grid[row][col].playerMark = 'queen';
        this.tableStack += globalStore.config.payoutPerHoneypot;
        this.queensFound++;
        this.flipsMade++;

        this.actionLog.push({
          t: Date.now(),
          type: 'honeypot_found',
          payload: { row, col, gold: this.tableStack },
        });

        // Check if all honeypots found
        const totalHoneypots = this.countSolutionQueens();
        if (this.queensFound >= totalHoneypots) {
          this.status = 'won';
        }
      } else {
        // Found ant
        this.grid[row][col].playerMark = 'invalid';
        this.tableStack -= globalStore.config.penaltyPerAnt;
        this.antsFound++;
        this.flipsMade++;

        this.actionLog.push({
          t: Date.now(),
          type: 'ant_found',
          payload: { row, col, gold: this.tableStack },
        });

        // Check if out of gold
        if (this.tableStack <= 0) {
          this.status = 'busted';
        }
      }
    },

    countSolutionQueens(): number {
      let count = 0;
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col].isSolutionQueen) {
            count++;
          }
        }
      }
      return count;
    },

    restart() {
      this.startRound();
    },

    endRound() {
      this.status = 'playing';
      this.grid = [];
      this.actionLog = [];
    },
  },
});
