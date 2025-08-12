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
}

export const useGlobalStore = defineStore('global', {
  state: (): GlobalState => ({
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    player: {
      id: 'local-guest',
      displayName: 'Guest',
      totalChips: 0,
    },
    config: {
      startGold: 20,
      payoutPerHoneypot: 1,
      penaltyPerAnt: 5,
    },
    ui: {
      showRules: false,
    },
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
