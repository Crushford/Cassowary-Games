import { defineStore } from 'pinia';

export interface TableConfig {
  id: string;
  name: string;
  buyIn: number; // Now just minimum balance requirement
  maxPayout: number;
  boardSize: string;
  puzzles: string[];
  puzzleFilter?: string;
}

export interface PuzzleRecord {
  id: string;
  name?: string;
  layout: string;
  queens: string;
  size: string;
}

interface TableState {
  tables: Record<string, TableConfig>;
  loaded: boolean;
  // Table session state
  maxPayout: number;
  status: 'playing' | 'won' | 'busted' | 'capped';
  puzzleQueueIndex: number;
  usedPuzzleIds: Set<string>;
  currentPuzzleIdOrName: string | null;
  // Modal state
  showRoundComplete: boolean;
}

export const useTableStore = defineStore('table', {
  state: (): TableState => ({
    tables: {},
    loaded: false,
    // Table session state
    maxPayout: 0,
    status: 'playing',
    puzzleQueueIndex: 0,
    usedPuzzleIds: new Set<string>(),
    currentPuzzleIdOrName: null,
    // Modal state
    showRoundComplete: false,
  }),

  getters: {
    net: (state) => {
      // No separate table stack - always 0
      return 0;
    },
    totalProfit: (state) => {
      // This getter can't be async, so we'll need to handle this differently
      // For now, return 0 and handle the actual calculation in the actions
      return 0;
    },
  },

  actions: {
    async loadTables() {
      try {
        const response = await fetch('/tables.json', {
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load tables.json: ${response.status}`);
        }

        const tablesArray: TableConfig[] = await response.json();

        // Normalize into tables object
        this.tables = tablesArray.reduce(
          (acc, table) => {
            acc[table.id] = table;
            return acc;
          },
          {} as Record<string, TableConfig>
        );

        this.loaded = true;
      } catch (error) {
        console.error('Error loading tables:', error);
        throw error; // Re-throw the error instead of using fallback
      }
    },

    getTable(id: string): TableConfig | undefined {
      return this.tables[id];
    },

    async resolveNextPuzzle(
      tableId: string,
      history: { usedIds: Set<string> }
    ): Promise<PuzzleRecord> {
      const table = this.getTable(tableId);
      if (!table) {
        throw new Error(`Table ${tableId} not found`);
      }

      // Load puzzles.json if we haven't already
      const response = await fetch('/puzzles.json');
      if (!response.ok) {
        throw new Error(`Failed to load puzzles.json: ${response.status}`);
      }
      const puzzlesData: Record<string, any[]> = await response.json();

      // First, try to use puzzles from the curated list based on puzzleQueueIndex
      if (
        table.puzzles &&
        table.puzzles.length > 0 &&
        this.puzzleQueueIndex < table.puzzles.length
      ) {
        const puzzleIdOrName = table.puzzles[this.puzzleQueueIndex];

        // Look for exact match by id or name
        for (const [size, puzzles] of Object.entries(puzzlesData)) {
          if (size === table.boardSize) {
            const puzzle = puzzles.find(
              (p: any) => p.id === puzzleIdOrName || p.name === puzzleIdOrName
            );
            if (puzzle && !history.usedIds.has(puzzle.id)) {
              return {
                id: puzzle.id,
                name: puzzle.name,
                layout: puzzle.layout,
                queens: puzzle.queens,
                size: size,
              };
            }
          }
        }
      }

      // If no curated puzzles available or we've exhausted the list, build filtered pool
      const filteredPool: PuzzleRecord[] = [];
      const sizePuzzles = puzzlesData[table.boardSize] || [];

      for (const puzzle of sizePuzzles) {
        // Skip if already used
        if (history.usedIds.has(puzzle.id)) {
          continue;
        }

        // Check puzzleFilter constraint
        if (table.puzzleFilter) {
          const regex = new RegExp(table.puzzleFilter);
          const matchesId = regex.test(puzzle.id);
          const matchesName = puzzle.name ? regex.test(puzzle.name) : false;

          if (!matchesId && !matchesName) {
            continue;
          }
        }

        filteredPool.push({
          id: puzzle.id,
          name: puzzle.name,
          layout: puzzle.layout,
          queens: puzzle.queens,
          size: table.boardSize,
        });
      }

      if (filteredPool.length === 0) {
        throw new Error(`No available puzzles for table ${tableId}`);
      }

      // Select random puzzle from filtered pool
      const randomIndex = Math.floor(Math.random() * filteredPool.length);
      const selectedPuzzle = filteredPool[randomIndex];

      // Add to used history
      history.usedIds.add(selectedPuzzle.id);

      return selectedPuzzle;
    },

    async sitAtTable(tableId: string, globalStore: any) {
      // Get table configuration
      const table = this.getTable(tableId);
      if (!table) {
        throw new Error(`Table ${tableId} not found`);
      }

      // Verify player has enough chips for minimum balance requirement
      if (globalStore.player.totalChips < table.buyIn) {
        throw new Error(
          `Insufficient chips. Need at least ${table.buyIn}, have ${globalStore.player.totalChips}`
        );
      }

      // Set table session state
      this.maxPayout = table.maxPayout;
      this.status = 'playing';
      this.puzzleQueueIndex = 0;
      this.usedPuzzleIds = new Set<string>();
      this.currentPuzzleIdOrName = null;

      // Start round
      await this.startRound(tableId);
    },

    async startRound(tableId: string) {
      const { useRoundStore } = await import('./round');
      const roundStore = useRoundStore();

      // Resolve next puzzle first
      const puzzle = await this.resolveNextPuzzle(tableId, {
        usedIds: this.usedPuzzleIds,
      });
      this.currentPuzzleIdOrName = puzzle.id;

      // Start the round with puzzle data
      await roundStore.startRound(tableId, puzzle);
    },

    async handleStatusChange(newStatus: 'playing' | 'won' | 'busted' | 'capped') {
      if (newStatus === 'capped') {
        // Auto cash-out when capped
        const { useRoundStore } = await import('./round');
        const roundStore = useRoundStore();
        roundStore.autoCashOut('capped');
      } else if (newStatus === 'won' || newStatus === 'busted') {
        // Show round complete modal
        this.showRoundComplete = true;
      }
    },

    async handleBeforeRouteLeave() {
      const { useRoundStore } = await import('./round');
      const roundStore = useRoundStore();

      if (roundStore.tableId && this.status === 'playing') {
        // Auto cash-out when leaving
        roundStore.leaveTable();
      }
    },

    async goToTables() {
      this.showRoundComplete = false; // Reset round complete modal state
      // Clear table context to show tables modal
      const { useRoundStore } = await import('./round');
      const roundStore = useRoundStore();
      roundStore.tableId = null;
    },

    async handleNextRound() {
      const { useRoundStore } = await import('./round');
      const roundStore = useRoundStore();

      const tableId = roundStore.tableId;
      if (tableId) {
        try {
          // Hide the round complete modal
          this.showRoundComplete = false;

          // Reset status to playing
          this.status = 'playing';

          // Advance to next puzzle in the queue
          this.puzzleQueueIndex++;

          // Start a new round with the same table
          await this.startRound(tableId);
        } catch (error) {
          console.error('Failed to start next round:', error);
        }
      }
    },

    // Reset table session state completely
    resetTableState() {
      this.status = 'playing';
      this.showRoundComplete = false;
      this.maxPayout = 0;
      this.puzzleQueueIndex = 0;
      this.usedPuzzleIds = new Set<string>();
      this.currentPuzzleIdOrName = null;
    },
  },
});
