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

interface GlobalState {
  schemaVersion: number;
  updatedAt: string;
  player: Player;
  config: Config;
  ui: UI;
  tablesProgress: Record<string, { totalProfit: number }>;
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

    spendChips(amount: number): boolean {
      if (this.player.totalChips >= amount) {
        this.player.totalChips -= amount;
        this.persist();
        return true;
      }
      return false;
    },

    addTableProfit(tableId: string, delta: number) {
      if (!this.tablesProgress[tableId]) {
        this.tablesProgress[tableId] = { totalProfit: 0 };
      }
      this.tablesProgress[tableId].totalProfit = Math.max(
        0,
        this.tablesProgress[tableId].totalProfit + delta
      );
      this.persist();
    },

    async sitAtTable(tableId: string) {
      const { useTableStore } = await import('./table');
      const tableStore = useTableStore();
      await tableStore.sitAtTable(tableId, this);
    },

    restart() {
      // Reset bank to initial chips
      this.player.totalChips = 20;
      this.persist();

      // Clear table context if we're at a table
      const { useRoundStore } = require('./round');
      const roundStore = useRoundStore();

      if (roundStore.tableId) {
        roundStore.leaveTable();
      }

      // Clear round state - no need to start a new round until player sits at a table
      roundStore.endRound();
    },

    applyConfigPatch(patch: Partial<Config>) {
      this.config = { ...this.config, ...patch };
      this.persist();
    },

    persist() {
      this.updatedAt = new Date().toISOString();
      localStorage.setItem('cw.global', JSON.stringify(this.$state));
    },

    rehydrate() {
      const stored = localStorage.getItem('cw.global');
      if (stored) {
        try {
          const data = JSON.parse(stored);

          // Handle schema migrations if needed
          if (data.schemaVersion === 1) {
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
  },
});
