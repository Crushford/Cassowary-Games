import { defineStore } from 'pinia';

interface Player {
  id: string;
  displayName: string;
  totalChips: number;
}

interface Config {
  startGold: number;
  payoutPerHoneypot: number;
  penaltyPerAnt: number;
}

interface UI {
  showRules: boolean;
}

interface TableProgress {
  totalProfit: number;
  roundsComplete: number;
  currentPuzzleIdOrName: string | null;
  isUsingRegex: boolean;
  roundWinnings: number;
}

interface SizeProgress {
  currentPuzzleIdOrName: string | null;
  isUsingRegex: boolean;
}

interface GlobalState {
  schemaVersion: number;
  updatedAt: string;
  player: Player;
  config: Config;
  ui: UI;
  tablesProgress: Record<string, TableProgress>;
  totalRoundsComplete: number;
  unlockedSizes: Set<string>;
  sizeProgress: Record<string, SizeProgress>;
}

export const useGlobalStore = defineStore('global', {
  state: (): GlobalState => ({
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    player: {
      id: 'local-guest',
      displayName: 'Guest',
      totalChips: 20,
    },
    config: {
      startGold: 20,
      payoutPerHoneypot: 1,
      penaltyPerAnt: 5,
    },
    ui: {
      showRules: false,
    },
    tablesProgress: {},
    totalRoundsComplete: 0,
    unlockedSizes: new Set<string>(['4x4']), // First size is always unlocked
    sizeProgress: {},
  }),

  actions: {
    setShowRules(flag: boolean) {
      this.ui.showRules = flag;
      this.persist();
    },

    grantChips(amount: number) {
      this.player.totalChips += amount;
      this.persist();
    },

    applyPenalty(amount: number): boolean {
      if (this.player.totalChips >= amount) {
        this.player.totalChips -= amount;
        this.persist();

        // Check for bust after applying penalty
        this.checkForBust();

        return true;
      } else {
        // Not enough chips - player is busted
        this.player.totalChips = 0; // Set to 0 since they can't pay
        this.persist();
        this.handleBust();
        return false;
      }
    },

    // Check if player is busted (no chips left)
    checkForBust() {
      if (this.player.totalChips <= 0) {
        this.handleBust();
      }
    },

    // Handle bust logic
    async handleBust() {
      // Set round status to busted (for compatibility)
      const { useRoundStore } = await import('./round');
      const roundStore = useRoundStore();
      // Note: roundStore doesn't have a status field, but we can handle this in the round store
    },

    addTableProfit(tableId: string, delta: number) {
      if (!this.tablesProgress[tableId]) {
        this.tablesProgress[tableId] = {
          totalProfit: 0,
          roundsComplete: 0,
          currentPuzzleIdOrName: null,
          isUsingRegex: false,
          roundWinnings: 0,
        };
      }

      this.tablesProgress[tableId].totalProfit += delta;
      this.tablesProgress[tableId].roundWinnings += delta;
      this.persist();
    },

    recordTableWin(tableId: string) {
      if (!this.tablesProgress[tableId]) {
        this.tablesProgress[tableId] = {
          totalProfit: 0,
          roundsComplete: 0,
          currentPuzzleIdOrName: null,
          isUsingRegex: false,
          roundWinnings: 0,
        };
      }
      this.tablesProgress[tableId].roundsComplete++;
      this.totalRoundsComplete++;
      this.persist();
    },

    updateTablePuzzleInfo(tableId: string, puzzleIdOrName: string | null, isUsingRegex: boolean) {
      if (!this.tablesProgress[tableId]) {
        this.tablesProgress[tableId] = {
          totalProfit: 0,
          roundsComplete: 0,
          currentPuzzleIdOrName: null,
          isUsingRegex: false,
          roundWinnings: 0,
        };
      }
      this.tablesProgress[tableId].currentPuzzleIdOrName = puzzleIdOrName;
      this.tablesProgress[tableId].isUsingRegex = isUsingRegex;
      // Reset round winnings when starting a new round
      this.tablesProgress[tableId].roundWinnings = 0;
      this.persist();
    },

    async sitAtTable(tableId: string) {
      const { useTableStore } = await import('./table');
      const tableStore = useTableStore();
      await tableStore.sitAtTable(tableId, this);
      this.persist();
    },

    async sitAtSize(boardSize: string) {
      const { useLevelStore } = await import('./level');
      const levelStore = useLevelStore();
      await levelStore.sitAtSize(boardSize, this);
      this.persist();
    },

    unlockSize(boardSize: string, cost: number) {
      if (this.player.totalChips >= cost) {
        this.player.totalChips -= cost;
        this.unlockedSizes.add(boardSize);
        this.persist();
      }
    },

    updateSizePuzzleInfo(boardSize: string, puzzleIdOrName: string | null, isUsingRegex: boolean) {
      if (!this.sizeProgress[boardSize]) {
        this.sizeProgress[boardSize] = {
          currentPuzzleIdOrName: null,
          isUsingRegex: false,
        };
      }
      this.sizeProgress[boardSize].currentPuzzleIdOrName = puzzleIdOrName;
      this.sizeProgress[boardSize].isUsingRegex = isUsingRegex;
      this.persist();
    },

    isTableAccessible(tableId: string, minimumBuyIn: number, maxPayout?: number): boolean {
      // Check if table is completed (reached max payout)
      const tableProgress = this.tablesProgress[tableId];
      if (tableProgress && maxPayout && tableProgress.totalProfit >= maxPayout) {
        return false;
      }

      // Check if player has enough chips
      if (this.player.totalChips >= minimumBuyIn) {
        return true;
      }

      // Check if table is in progress (has currentPuzzleIdOrName)
      if (tableProgress && tableProgress.currentPuzzleIdOrName !== null) {
        return true;
      }

      // Check if player has made progress on this table
      if (tableProgress) {
        return true;
      }

      return false;
    },

    applyConfigPatch(patch: Partial<Config>) {
      this.config = { ...this.config, ...patch };
      this.persist();
    },

    persist() {
      this.updatedAt = new Date().toISOString();
      // Convert Set to Array for JSON serialization
      const stateToSave = {
        ...this.$state,
        unlockedSizes: Array.from(this.unlockedSizes),
      };
      localStorage.setItem('cw.global', JSON.stringify(stateToSave));
    },

    rehydrate() {
      const stored = localStorage.getItem('cw.global');
      if (stored) {
        try {
          const data = JSON.parse(stored);

          // Handle schema migrations if needed
          if (data.schemaVersion === 1) {
            // Migrate old table progress format to new format
            if (data.tablesProgress) {
              for (const tableId in data.tablesProgress) {
                const progress = data.tablesProgress[tableId];
                if (typeof progress === 'object' && 'totalProfit' in progress) {
                  // Check if it's the old format (just totalProfit)
                  if (!('wins' in progress)) {
                    data.tablesProgress[tableId] = {
                      totalProfit: progress.totalProfit || 0,
                      roundsComplete: 0,
                      currentPuzzleIdOrName: null,
                      isUsingRegex: false,
                      roundWinnings: 0,
                    };
                  }
                }
              }
            }

            // Ensure totalRoundsComplete exists for existing data
            if (data.totalRoundsComplete === undefined) {
              // Calculate total rounds from existing table data
              let calculatedTotal = 0;
              if (data.tablesProgress) {
                for (const tableId in data.tablesProgress) {
                  const progress = data.tablesProgress[tableId];
                  if (progress && typeof progress.roundsComplete === 'number') {
                    calculatedTotal += progress.roundsComplete;
                  }
                }
              }
              data.totalRoundsComplete = calculatedTotal;
            }

            // Migrate to size-based system
            if (!data.unlockedSizes) {
              data.unlockedSizes = ['4x4']; // First size always unlocked
            }
            if (!data.sizeProgress) {
              data.sizeProgress = {};
            }

            // Convert unlockedSizes array to Set after patching
            const unlockedSizesArray = Array.isArray(data.unlockedSizes)
              ? data.unlockedSizes
              : ['4x4'];
            this.$patch(data);
            this.unlockedSizes = new Set(unlockedSizesArray);
          } else {
            // Future schema migrations would go here
            console.warn('Unknown schema version:', data.schemaVersion);
          }
        } catch (error) {
          console.error('Failed to rehydrate global store:', error);
        }
      }
    },

    async restart() {
      // Completely reset the global state to initial values
      this.$reset();

      // Clear level context if we're at a level
      const { useRoundStore } = await import('./round');
      const { useLevelStore } = await import('./level');
      const roundStore = useRoundStore();
      const levelStore = useLevelStore();

      // Clear all level and round state
      if (roundStore.boardSize) {
        roundStore.leaveLevel();
      }

      // Clear round state completely
      roundStore.resetRoundState();

      // Reset level store state
      levelStore.resetLevelState();

      // Persist the reset state
      this.persist();
    },
  },
});
