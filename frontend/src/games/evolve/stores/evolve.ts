import { defineStore } from 'pinia';

export type Role = 'matriarch' | 'adult' | 'juvenile' | 'retired';
export type Sex = 'male' | 'female';

export interface Cassowary {
  id: string;
  generation: number;
  size: number;
  speed: number;
  fertility: number;
}

export interface Female extends Cassowary {
  role: Role;
}

export interface Male extends Cassowary {
  linkedFemaleId: string | null;
}

export interface Chick extends Cassowary {
  sex: Sex;
  mutatedStat?: 'size' | 'speed' | 'fertility';
}

export interface EggBatch {
  motherId: string;
  fatherId: string;
  clutchSize: number;
  chicks: Chick[];
}

export interface LineageEntry {
  matriarchId: string;
  generation: number;
  size: number;
  speed: number;
  fertility: number;
}

export const useEvolveStore = defineStore('evolve', {
  state: () => ({
    saveVersion: 2, // Increment version for new data structure
    hasSavedGame: false,
    isGameActive: false,
    generation: 0,
    fruit: 0,
    evolutionPoints: 0,

    // Current matriarch ID
    matriarchId: '' as string,

    // All females in the family
    females: [] as Female[],

    // All male partners
    males: [] as Male[],

    // Active egg batch (temporary, cleared after selection)
    activeEggBatch: null as EggBatch | null,

    // Lineage history (past matriarchs)
    lineageHistory: [] as LineageEntry[],

    // Clutch cost (fixed for now)
    clutchCost: 5,
  }),

  getters: {
    currentMatriarch(): Female | null {
      return this.females.find((f) => f.id === this.matriarchId) || null;
    },

    matriarchPartner(): Male | null {
      const matriarch = this.currentMatriarch;
      if (!matriarch) return null;
      return this.males.find((m) => m.linkedFemaleId === matriarch.id) || null;
    },

    canLayEggs(): boolean {
      return !!(this.currentMatriarch && this.matriarchPartner && this.fruit >= this.clutchCost);
    },
  },

  actions: {
    generateId(): string {
      return `cass-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    newGame() {
      // Reset all fields
      this.isGameActive = true;
      this.generation = 1;
      this.fruit = 0;
      this.evolutionPoints = 0;
      this.lineageHistory = [];
      this.activeEggBatch = null;

      // Create initial matriarch
      const initialMatriarch: Female = {
        id: this.generateId(),
        generation: 1,
        size: 1,
        speed: 1,
        fertility: 1,
        role: 'matriarch',
      };

      // Create initial male partner
      const initialMale: Male = {
        id: this.generateId(),
        generation: 1,
        size: 1,
        speed: 1,
        fertility: 1,
        linkedFemaleId: null, // Will be auto-assigned
      };

      this.females = [initialMatriarch];
      this.matriarchId = initialMatriarch.id;
      this.males = [initialMale];

      // Auto-assign partner
      this.assignPartner();

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

        // Handle version 1 (old format) migration
        if (data.saveVersion === 1) {
          // Migrate old format to new format
          const initialMatriarch: Female = {
            id: this.generateId(),
            generation: data.generation || 1,
            size: data.matriarch?.size || 1,
            speed: data.matriarch?.speed || 1,
            fertility: data.matriarch?.fertility || 1,
            role: 'matriarch',
          };

          // Create initial male partner for migration
          const initialMale: Male = {
            id: this.generateId(),
            generation: data.generation || 1,
            size: data.matriarch?.size || 1,
            speed: data.matriarch?.speed || 1,
            fertility: data.matriarch?.fertility || 1,
            linkedFemaleId: null,
          };

          this.isGameActive = data.isGameActive || false;
          this.generation = data.generation || 1;
          this.fruit = data.fruit || 0;
          this.evolutionPoints = data.evolutionPoints || 0;
          this.females = [initialMatriarch];
          this.matriarchId = initialMatriarch.id;
          this.males = [initialMale];
          this.lineageHistory = [];
          this.activeEggBatch = null;
          this.hasSavedGame = data.hasSavedGame || false;

          // Auto-assign partner
          this.assignPartner();

          // Save migrated data
          this.saveToStorage();
          return;
        }

        // Handle version 2 (new format)
        if (data.saveVersion === 2) {
          // Ensure all fields have defaults to prevent undefined errors
          this.isGameActive = data.isGameActive ?? false;
          this.generation = data.generation ?? 0;
          this.fruit = data.fruit ?? 0;
          this.evolutionPoints = data.evolutionPoints ?? 0;
          this.matriarchId = data.matriarchId ?? '';
          this.females = data.females ?? [];
          this.males = data.males ?? [];
          this.activeEggBatch = data.activeEggBatch ?? null;
          this.lineageHistory = data.lineageHistory ?? [];
          this.hasSavedGame = data.hasSavedGame ?? false;
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
        matriarchId: this.matriarchId,
        females: this.females,
        males: this.males,
        activeEggBatch: this.activeEggBatch,
        lineageHistory: this.lineageHistory,
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

    gainFruit(amount = 1) {
      this.fruit += amount;
      this.saveToStorage();
    },

    // Assign a male partner to a female (auto-assigns first available to matriarch)
    assignPartner(femaleId?: string) {
      const targetFemaleId = femaleId || this.matriarchId;
      if (!targetFemaleId) return;

      // Find unassigned male
      const unassignedMale = this.males.find((m) => !m.linkedFemaleId);
      if (!unassignedMale) return;

      unassignedMale.linkedFemaleId = targetFemaleId;
      this.saveToStorage();
    },

    // Lay eggs - creates egg batch and generates chicks
    layEggs() {
      if (!this.canLayEggs) return;

      const matriarch = this.currentMatriarch!;
      const partner = this.matriarchPartner!;

      // Calculate clutch size based on fertility (simple formula: fertility + base)
      const clutchSize = matriarch.fertility + 2;

      // Deduct cost
      this.fruit -= this.clutchCost;

      // Generate chicks
      const chicks = this.generateChicks(matriarch, partner, clutchSize);

      // Create egg batch
      this.activeEggBatch = {
        motherId: matriarch.id,
        fatherId: partner.id,
        clutchSize,
        chicks,
      };

      this.saveToStorage();
    },

    // Generate chicks with mutations
    generateChicks(mother: Female, father: Male, count: number): Chick[] {
      const chicks: Chick[] = [];

      for (let i = 0; i < count; i++) {
        // Determine sex (50/50)
        const sex: Sex = Math.random() < 0.5 ? 'male' : 'female';

        // Base stats from parents (average)
        const baseSize = Math.round((mother.size + father.size) / 2);
        const baseSpeed = Math.round((mother.speed + father.speed) / 2);
        const baseFertility = Math.round((mother.fertility + father.fertility) / 2);

        // Pick one stat to mutate
        const statToMutate = ['size', 'speed', 'fertility'][Math.floor(Math.random() * 3)] as
          | 'size'
          | 'speed'
          | 'fertility';
        const mutationDirection = Math.random() < 0.5 ? -1 : 1;

        const chick: Chick = {
          id: this.generateId(),
          generation: this.generation + 1,
          size: baseSize,
          speed: baseSpeed,
          fertility: baseFertility,
          sex,
          mutatedStat: statToMutate,
        };

        // Apply mutation (bounded between 1 and 10)
        if (statToMutate === 'size') {
          chick.size = Math.max(1, Math.min(10, baseSize + mutationDirection));
        } else if (statToMutate === 'speed') {
          chick.speed = Math.max(1, Math.min(10, baseSpeed + mutationDirection));
        } else {
          chick.fertility = Math.max(1, Math.min(10, baseFertility + mutationDirection));
        }

        chicks.push(chick);
      }

      return chicks;
    },

    // Select new matriarch and keep chosen chicks
    selectNewMatriarch(newMatriarchId: string, chicksToKeep: string[]) {
      if (!this.activeEggBatch) return;

      const batch = this.activeEggBatch;
      const newMatriarchChick = batch.chicks.find((c) => c.id === newMatriarchId);

      if (!newMatriarchChick || newMatriarchChick.sex !== 'female') {
        // If no valid female chick, keep current matriarch and just add kept chicks
        this.addChicksToFamily(chicksToKeep);
        this.activeEggBatch = null;
        this.saveToStorage();
        return;
      }

      // Get current matriarch before replacing
      const currentMatriarch = this.currentMatriarch;
      if (currentMatriarch) {
        // Add to lineage history
        this.lineageHistory.push({
          matriarchId: currentMatriarch.id,
          generation: currentMatriarch.generation,
          size: currentMatriarch.size,
          speed: currentMatriarch.speed,
          fertility: currentMatriarch.fertility,
        });

        // Change role to retired
        currentMatriarch.role = 'retired';
      }

      // Create new matriarch from chick
      const newMatriarch: Female = {
        id: newMatriarchChick.id,
        generation: newMatriarchChick.generation,
        size: newMatriarchChick.size,
        speed: newMatriarchChick.speed,
        fertility: newMatriarchChick.fertility,
        role: 'matriarch',
      };

      // Update matriarch ID
      this.matriarchId = newMatriarch.id;

      // Add new matriarch to females
      this.females.push(newMatriarch);

      // Add other kept chicks
      this.addChicksToFamily(chicksToKeep.filter((id) => id !== newMatriarchId));

      // Advance generation
      this.generation = newMatriarch.generation;

      // Clear egg batch
      this.activeEggBatch = null;

      // Auto-assign partner if available
      this.assignPartner();

      this.saveToStorage();
    },

    // Add kept chicks to family (females) or partner pool (males)
    addChicksToFamily(chickIds: string[]) {
      if (!this.activeEggBatch) return;

      const batch = this.activeEggBatch;

      for (const chickId of chickIds) {
        const chick = batch.chicks.find((c) => c.id === chickId);
        if (!chick) continue;

        if (chick.sex === 'female') {
          const female: Female = {
            id: chick.id,
            generation: chick.generation,
            size: chick.size,
            speed: chick.speed,
            fertility: chick.fertility,
            role: 'adult',
          };
          this.females.push(female);
        } else {
          const male: Male = {
            id: chick.id,
            generation: chick.generation,
            size: chick.size,
            speed: chick.speed,
            fertility: chick.fertility,
            linkedFemaleId: null,
          };
          this.males.push(male);
        }
      }
    },
  },
});
