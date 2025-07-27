import { defineStore } from 'pinia';

export const usePlantStore = defineStore('plant', {
  state: () => ({
    // Basic game state
    isComplete: false,
    showGameRules: false,

    // Add more state as needed
  }),

  getters: {
    // Add getters as needed
  },

  actions: {
    // Configuration management
    loadUserConfiguration() {
      // Load any saved configuration
    },

    hasSeenRules(): boolean {
      try {
        return localStorage.getItem('plant-game-rules-seen') === 'true';
      } catch (error) {
        console.warn('Failed to load rules seen state:', error);
        return false;
      }
    },

    markRulesAsSeen() {
      try {
        localStorage.setItem('plant-game-rules-seen', 'true');
      } catch (error) {
        console.warn('Failed to save rules seen state:', error);
      }
    },

    // Add more actions as needed
  },
});
