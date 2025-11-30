import { defineStore } from 'pinia';

export interface LevelConfig {
  boardSize: string;
  payoutMultiplier: number;
  purchaseCost: number;
  puzzleFilter?: string;
}

export interface PuzzleRecord {
  id: string;
  name?: string;
  layout: string;
  queens: string;
  size: string;
}

interface LevelState {
  levels: Record<string, LevelConfig>;
  loaded: boolean;
  // Level session state
  currentBoardSize: string | null;
  usedPuzzleIds: Set<string>;
  currentPuzzleIdOrName: string | null;
  // Modal state
  showRoundComplete: boolean;
}

export const useLevelStore = defineStore('level', {
  state: (): LevelState => ({
    levels: {},
    loaded: false,
    // Level session state
    currentBoardSize: null,
    usedPuzzleIds: new Set<string>(),
    currentPuzzleIdOrName: null,
    // Modal state
    showRoundComplete: false,
  }),

  getters: {
    getLevel:
      (state) =>
      (boardSize: string): LevelConfig | undefined => {
        return state.levels[boardSize];
      },
  },

  actions: {
    async loadLevels() {
      try {
        const response = await fetch('/levels.json', {
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load levels.json: ${response.status}`);
        }

        const levelsArray: LevelConfig[] = await response.json();

        // Normalize into levels object keyed by boardSize
        this.levels = levelsArray.reduce(
          (acc, level) => {
            acc[level.boardSize] = level;
            return acc;
          },
          {} as Record<string, LevelConfig>
        );

        this.loaded = true;
      } catch (error) {
        console.error('Error loading levels:', error);
        throw error;
      }
    },

    async resolveNextPuzzle(
      boardSize: string,
      history: { usedIds: Set<string> }
    ): Promise<PuzzleRecord> {
      const level = this.getLevel(boardSize);
      if (!level) {
        throw new Error(`Level ${boardSize} not found`);
      }

      // Load puzzles.json if we haven't already
      const response = await fetch('/puzzles.json');
      if (!response.ok) {
        throw new Error(`Failed to load puzzles.json: ${response.status}`);
      }
      const puzzlesData: Record<string, any[]> = await response.json();

      // Build filtered pool
      const filteredPool: PuzzleRecord[] = [];
      const sizePuzzles = puzzlesData[boardSize] || [];

      for (const puzzle of sizePuzzles) {
        // Skip if already used
        if (history.usedIds.has(puzzle.id)) {
          continue;
        }

        // Check puzzleFilter constraint
        if (level.puzzleFilter) {
          const regex = new RegExp(level.puzzleFilter);
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
          size: boardSize,
        });
      }

      if (filteredPool.length === 0) {
        // Reset used puzzles if we've exhausted all puzzles
        history.usedIds.clear();
        // Try again with cleared history
        return this.resolveNextPuzzle(boardSize, history);
      }

      // Select random puzzle from filtered pool
      const randomIndex = Math.floor(Math.random() * filteredPool.length);
      const selectedPuzzle = filteredPool[randomIndex];

      // Add to used history
      history.usedIds.add(selectedPuzzle.id);

      return selectedPuzzle;
    },

    async sitAtSize(boardSize: string, globalStore: any) {
      // Get level configuration
      const level = this.getLevel(boardSize);
      if (!level) {
        throw new Error(`Level ${boardSize} not found`);
      }

      // Set level session state
      this.currentBoardSize = boardSize;
      this.currentPuzzleIdOrName = null;

      // Start round
      await this.startRound(boardSize, globalStore);
    },

    async startRound(boardSize: string, globalStore: any) {
      const { useRoundStore } = await import('./round');
      const roundStore = useRoundStore();

      // Resolve next puzzle first
      const puzzle = await this.resolveNextPuzzle(boardSize, {
        usedIds: this.usedPuzzleIds,
      });
      this.currentPuzzleIdOrName = puzzle.id;

      // Update puzzle info in global store
      const level = this.getLevel(boardSize);
      const isUsingRegex = level?.puzzleFilter ? true : false;
      globalStore.updateSizePuzzleInfo(boardSize, puzzle.id, isUsingRegex);

      // Start the round with puzzle data
      await roundStore.startRound(boardSize, puzzle);
    },

    async handleNextRound(boardSize: string, globalStore: any) {
      try {
        // Hide the round complete modal
        this.showRoundComplete = false;

        // Start a new round with the same size
        await this.startRound(boardSize, globalStore);
      } catch (error) {
        console.error('Failed to start next round:', error);
      }
    },

    // Reset level session state completely
    resetLevelState() {
      this.showRoundComplete = false;
      this.currentBoardSize = null;
      this.usedPuzzleIds = new Set<string>();
      this.currentPuzzleIdOrName = null;
    },
  },
});
