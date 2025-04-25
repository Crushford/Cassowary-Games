<template>
  <div class="w-full max-w-lg mx-auto p-4">
    <div
      class="grid gap-2"
      :style="{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
      }"
    >
      <Square
        v-for="index in totalSquares"
        :key="index - 1"
        :row="Math.floor((index - 1) / gridSize)"
        :col="(index - 1) % gridSize"
      />
    </div>
    <div class="mt-4 flex justify-center gap-2 flex-wrap">
      <button
        class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        @click="$emit('undo')"
      >
        Undo
      </button>
      <button
        class="rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary-hover"
        @click="$emit('restart')"
      >
        Restart
      </button>
      <button
        class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        @click="gameStore.placeRandomQueen()"
      >
        Place Next Queen
      </button>
      <button
        class="rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary-hover"
        @click="gameStore.generateFullSolution()"
      >
        Generate Solution
      </button>
    </div>

    <!-- Color Group Controls -->
    <div class="mt-4" v-if="gameStore.isComplete">
      <button
        class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover w-full"
        @click="gameStore.assignColorGroups()"
      >
        Assign Color Groups
      </button>
      <div class="mt-2 text-sm text-center text-text">
        This will assign color groups to ensure a unique solution.
      </div>

      <!-- Save to Local Storage button -->
      <div v-if="hasColorGroups" class="mt-4">
        <button
          class="rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-white w-full"
          @click="savePuzzle"
        >
          Save Puzzle to Local Storage
        </button>
        <div
          v-if="savedMessage"
          class="mt-2 p-2 bg-green-100 text-green-700 rounded-lg text-center"
        >
          {{ savedMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import Square from './Square.vue';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

export interface GridSquare {
  state: 'empty' | 'flag' | 'queen' | 'invalid';
  groupColor?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink';
}

const gameStore = useGameStore();
const { grid, gridSize } = storeToRefs(gameStore);
const savedMessage = ref('');

const totalSquares = computed(() => {
  return gridSize.value * gridSize.value;
});

// Check if grid has color groups assigned
const hasColorGroups = computed(() => {
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      if (gameStore.grid[row][col].groupColor) {
        return true;
      }
    }
  }
  return false;
});

// Save puzzle to local storage
const savePuzzle = () => {
  const puzzleName = gameStore.savePuzzleToLocalStorage();
  if (puzzleName) {
    savedMessage.value = `Puzzle saved as "${puzzleName}"`;
    setTimeout(() => {
      savedMessage.value = '';
    }, 3000);
  }
};

defineEmits<{
  (e: 'undo'): void;
  (e: 'restart'): void;
}>();

defineOptions({
  name: 'GameGrid',
});
</script>
