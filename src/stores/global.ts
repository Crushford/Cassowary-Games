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

interface GlobalState {
  schemaVersion: number;
  updatedAt: string;
  player: Player;
  config: Config;
  ui: UI;
  tablesProgress: Record<string, TableProgress>;
  unlockedTables: Set<string>;
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
    unlockedTables: new Set(),
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
      // Set table status to busted
      const { useTableStore } = await import('./table');
      const tableStore = useTableStore();
      tableStore.status = 'busted';
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
      this.unlockedTables.add(tableId);
      this.persist();
    },

    isTableAccessible(tableId: string, minimumBuyIn: number): boolean {
      return this.player.totalChips >= minimumBuyIn || this.unlockedTables.has(tableId);
    },

    applyConfigPatch(patch: Partial<Config>) {
      this.config = { ...this.config, ...patch };
      this.persist();
    },

    persist() {
      this.updatedAt = new Date().toISOString();
      // Convert Set to array for JSON serialization
      const stateToPersist = {
        ...this.$state,
        unlockedTables: Array.from(this.unlockedTables),
      };
      localStorage.setItem('cw.global', JSON.stringify(stateToPersist));
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

            // Handle unlockedTables migration
            if (data.unlockedTables && Array.isArray(data.unlockedTables)) {
              data.unlockedTables = new Set(data.unlockedTables);
            } else if (!data.unlockedTables) {
              data.unlockedTables = new Set();
            }

            this.$patch(data);
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
      // Save unlocked tables before reset
      const unlockedTables = new Set(this.unlockedTables);

      // Completely reset the global state to initial values
      this.$reset();

      // Restore unlocked tables - they should persist forever
      this.unlockedTables = unlockedTables;

      // Clear table context if we're at a table
      const { useRoundStore } = await import('./round');
      const { useTableStore } = await import('./table');
      const roundStore = useRoundStore();
      const tableStore = useTableStore();

      // Clear all table and round state
      if (roundStore.tableId) {
        roundStore.leaveTable();
      }

      // Clear round state completely
      roundStore.resetRoundState();

      // Reset table store state
      tableStore.resetTableState();

      // Persist the reset state
      this.persist();
    },
  },
});
