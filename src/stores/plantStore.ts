import { defineStore } from 'pinia';

export const usePlantStore = defineStore('plant', {
  state: () => ({
    // Basic game state
    isComplete: false,
    showGameRules: false,
    gridSize: 4, // Default grid size

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

    setGridSize(size: number) {
      if (size < 4 || size > 8) {
        console.warn('Grid size must be between 4 and 8');
        return;
      }
      this.gridSize = size;
      // Add any initialization logic here when grid size changes
    },

    // Add more actions as needed
  },
});
