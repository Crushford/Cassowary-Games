import { defineStore } from 'pinia';
import { useGlobalStore } from './global';
import type { GridSquare } from '../types/types';
import { COLOR_SYMBOLS } from '../utils/colorPalette';

// Configuration keys for localStorage
const CONFIG_KEYS = {
  FLIPPING_MODE: 'honey-pot-ant-farming-casino-flipping-mode',
  AUTO_FLAGGING: 'honey-pot-ant-farming-casino-auto-flagging',
} as const;

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

  // Table context
  tableId: string | null;

  // Puzzle - using combined grid structure
  grid: GridSquare[][];
  gridSize: number;
  hiddenMapHash: string;
  puzzleFamily: string;

  // Counters
  flipsMade: number;
  queensFound: number;
  antsFound: number;

  // Log
  actionLog: Array<{ t: number; type: string; payload: any }>;

  // UI state
  uiState: {
    flippingMode: 'auto' | 'flip' | 'flag';
    autoFlagging: boolean;
  };

  // Flag history for undo
  flagHistory: Array<{ row: number; col: number; timestamp: number }>;
}

export const useRoundStore = defineStore('round', {
  state: (): RoundState => ({
    roundId: '',
    seed: '',
    startedAt: 0,
    tableId: null,
    grid: [],
    gridSize: 4,
    hiddenMapHash: '',
    puzzleFamily: 'classicQueens',
    flipsMade: 0,
    queensFound: 0,
    antsFound: 0,
    actionLog: [],
    uiState: {
      flippingMode: 'auto',
      autoFlagging: false,
    },
    flagHistory: [],
  }),

  actions: {
    // Configuration management
    loadUserConfiguration() {
      try {
        // Load flipping mode
        const savedFlippingMode = localStorage.getItem(CONFIG_KEYS.FLIPPING_MODE);
        if (savedFlippingMode && ['auto', 'flip', 'flag'].includes(savedFlippingMode)) {
          this.uiState.flippingMode = savedFlippingMode as 'auto' | 'flip' | 'flag';
        }

        // Load auto-flagging preference
        const savedAutoFlagging = localStorage.getItem(CONFIG_KEYS.AUTO_FLAGGING);
        if (savedAutoFlagging !== null) {
          this.uiState.autoFlagging = savedAutoFlagging === 'true';
        }
      } catch (error) {
        console.warn('Failed to load user configuration:', error);
      }
    },

    saveUserConfiguration() {
      try {
        localStorage.setItem(CONFIG_KEYS.FLIPPING_MODE, this.uiState.flippingMode);
        localStorage.setItem(CONFIG_KEYS.AUTO_FLAGGING, this.uiState.autoFlagging.toString());
      } catch (error) {
        console.warn('Failed to save user configuration:', error);
      }
    },

    async startRound(tableId: string, puzzleData?: any) {
      // Load user configuration first
      this.loadUserConfiguration();

      // Set round identity
      this.roundId = `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.seed = Math.random().toString(36).substr(2, 9);
      this.startedAt = Date.now();

      // Set table context (no separate table stack needed)
      this.tableId = tableId;

      // Parse puzzle data if provided, otherwise load random puzzle
      if (puzzleData) {
        this.parsePuzzleData(puzzleData);
      } else {
        await this.loadRandomPuzzle();
      }

      // Reset counters and status
      this.flipsMade = 0;
      this.queensFound = 0;
      this.antsFound = 0;
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
    async handleSquareClick(row: number, col: number) {
      // Don't allow interaction with already revealed squares (queen or invalid)
      if (
        this.grid[row][col].playerMark === 'queen' ||
        this.grid[row][col].playerMark === 'invalid'
      ) {
        return;
      }

      const mode = this.uiState.flippingMode;
      if (mode === 'flip') {
        await this.flipSquare(row, col);
      } else if (mode === 'flag') {
        this.flagSquare(row, col);
      } else {
        await this.autoSquare(row, col);
      }
    },

    // Check if table cap has been reached
    checkTableCap() {
      if (!this.tableId) return;

      const globalStore = useGlobalStore();
      const totalProfitSoFar = globalStore.tablesProgress[this.tableId]?.totalProfit ?? 0;

      // Return the cap status for parent to handle
      return {
        totalProfitSoFar,
        sessionNet: 0,
        isCapped: false,
      };
    },

    // Flip action - reveal the square
    async flipSquare(row: number, col: number) {
      const globalStore = useGlobalStore();
      const { useTableStore } = await import('./table');
      const tableStore = useTableStore();

      // Get table-specific payout multiplier
      const table = tableStore.getTable(this.tableId!);
      const multiplier = table?.payoutMultiplier ?? 1.0;
      const honeypotPayout = Math.round(globalStore.config.payoutPerHoneypot * multiplier);
      const antPenalty = Math.round(globalStore.config.penaltyPerAnt * multiplier);

      if (this.grid[row][col].isSolutionQueen) {
        // Found honeypot
        this.grid[row][col].playerMark = 'queen';
        globalStore.grantChips(honeypotPayout);

        // Update table profit
        if (this.tableId) {
          globalStore.addTableProfit(this.tableId, honeypotPayout);
        }

        this.queensFound++;
        this.flipsMade++;

        this.actionLog.push({
          t: Date.now(),
          type: 'honeypot_found',
          payload: { row, col, gold: globalStore.player.totalChips },
        });

        // Check if all honeypots found
        const totalHoneypots = this.countSolutionQueens();
        if (this.queensFound >= totalHoneypots) {
          // Use a different approach for synchronous access
          this.handleWin();
        }

        // Check table cap after positive balance change
        this.checkTableCap();
      } else {
        // Found ant
        this.grid[row][col].playerMark = 'invalid';
        globalStore.applyPenalty(antPenalty);

        // Update table profit (negative)
        if (this.tableId) {
          globalStore.addTableProfit(this.tableId, -antPenalty);
        }

        this.antsFound++;
        this.flipsMade++;

        this.actionLog.push({
          t: Date.now(),
          type: 'ant_found',
          payload: { row, col, gold: globalStore.player.totalChips },
        });

        // Bust handling is now done in globalStore.applyPenalty()
      }
    },

    // Helper method to handle win
    handleWin() {
      // We'll need to handle this asynchronously
      setTimeout(async () => {
        const { useTableStore } = await import('./table');
        const tableStore = useTableStore();
        tableStore.status = 'won';
      }, 0);
    },

    // Flag action - place or remove flag
    flagSquare(row: number, col: number) {
      const state = this.grid[row][col].playerMark;
      if (state === null) {
        this.placeFlag(row, col);
      } else if (state === 'flag') {
        this.removeFlag(row, col);
      }
    },

    // Auto mode: first click flags, second click flips
    async autoSquare(row: number, col: number) {
      const state = this.grid[row][col].playerMark;
      if (state === null) {
        this.flagSquare(row, col);
      } else if (state === 'flag') {
        await this.flipSquare(row, col);
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

    autoCashOut(reason: 'leave' | 'capped' | 'end') {
      if (!this.tableId) return;

      const globalStore = useGlobalStore();

      // No separate table stack to cash out - player keeps their bank balance
      // Just clear table context
      this.tableId = null;

      this.grid = [];
      this.actionLog = [];
    },

    leaveTable() {
      this.autoCashOut('leave');
    },

    endRound() {
      this.grid = [];
      this.actionLog = [];
    },

    // Reset round state completely
    resetRoundState() {
      this.roundId = '';
      this.seed = '';
      this.startedAt = 0;
      this.tableId = null;
      this.grid = [];
      this.gridSize = 4;
      this.hiddenMapHash = '';
      this.puzzleFamily = 'classicQueens';
      this.flipsMade = 0;
      this.queensFound = 0;
      this.antsFound = 0;
      this.actionLog = [];
      this.flagHistory = [];
    },

    // UI state management
    toggleAutoFlagging() {
      this.uiState.autoFlagging = !this.uiState.autoFlagging;
      this.saveUserConfiguration();
    },

    setFlippingMode(mode: 'auto' | 'flip' | 'flag') {
      this.uiState.flippingMode = mode;
      this.saveUserConfiguration();
    },

    // Flag management
    placeFlag(row: number, col: number) {
      if (this.grid[row][col].playerMark === null) {
        this.grid[row][col].playerMark = 'flag';
        this.flagHistory.push({
          row,
          col,
          timestamp: Date.now(),
        });
      }
    },

    removeFlag(row: number, col: number) {
      if (this.grid[row][col].playerMark === 'flag') {
        this.grid[row][col].playerMark = null;
        // Remove from flag history
        this.flagHistory = this.flagHistory.filter(
          (flag) => !(flag.row === row && flag.col === col)
        );
      }
    },

    undoLastFlag() {
      if (this.flagHistory.length > 0) {
        const lastFlag = this.flagHistory.pop();
        if (lastFlag) {
          this.removeFlag(lastFlag.row, lastFlag.col);
        }
      }
    },
  },
});
