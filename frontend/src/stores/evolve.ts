import { defineStore } from 'pinia';

interface Matriarch {
  name: string;
  size: number;
  speed: number;
  fertility: number;
}

export const useEvolveStore = defineStore('evolve', {
  state: () => ({
    saveVersion: 1,
    hasSavedGame: false,
    isGameActive: false,
    generation: 0,
    fruit: 0,
    evolutionPoints: 0,
    matriarch: {
      name: 'First Matriarch',
      size: 1,
      speed: 1,
      fertility: 1,
    } as Matriarch,
  }),

  actions: {
    newGame() {
      // reset core fields
      this.isGameActive = true;
      this.generation = 1;
      this.fruit = 0;
      this.evolutionPoints = 0;
      this.matriarch = {
        name: 'First Matriarch',
        size: 1,
        speed: 1,
        fertility: 1,
      };
      this.hasSavedGame = true;
      this.saveToStorage();
    },

    loadFromStorage() {
      // Check for new key first, then migrate from old key if needed
      let raw = localStorage.getItem('evolve-save');
      
      // Migrate from old 'evolution-save' key if it exists
      if (!raw) {
        const oldRaw = localStorage.getItem('evolution-save');
        if (oldRaw) {
          localStorage.setItem('evolve-save', oldRaw);
          localStorage.removeItem('evolution-save');
          raw = oldRaw;
        }
      }
      
      if (!raw) return;

      try {
        const data = JSON.parse(raw);
        if (data.saveVersion === 1) {
          Object.assign(this, data);
          this.hasSavedGame = true;
        }
      } catch {
        // ignore invalid saves
      }
    },

    saveToStorage() {
      const data = {
        saveVersion: this.saveVersion,
        hasSavedGame: this.hasSavedGame,
        isGameActive: this.isGameActive,
        generation: this.generation,
        fruit: this.fruit,
        evolutionPoints: this.evolutionPoints,
        matriarch: this.matriarch,
      };
      localStorage.setItem('evolve-save', JSON.stringify(data));
    },

    continueGame() {
      if (!this.hasSavedGame) return;
      this.isGameActive = true;
    },

    endGame() {
      this.isGameActive = false;
      this.saveToStorage();
    },

    // basic demo actions
    gainFruit(amount = 1) {
      this.fruit += amount;
      this.saveToStorage();
    },

    advanceGeneration() {
      this.generation += 1;
      this.evolutionPoints += 1;
      this.saveToStorage();
    },
  },
});

