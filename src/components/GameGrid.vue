<template>
  <div class="relative flex flex-col items-center">
    <!-- Game Grid -->
    <div
      class="grid w-full bg-slate-800 border-2 border-slate-700 p-1 rounded-lg shadow-lg gap-1"
      :style="{
        gridTemplateColumns: `repeat(${gameStore.gridSize}, minmax(0, 1fr))`,
      }"
    >
      <template v-for="(row, rowIndex) in gameStore.grid" :key="rowIndex">
        <Square
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          :row="rowIndex"
          :col="colIndex"
          :mode="mode"
        />
      </template>
    </div>

    <!-- Control Buttons -->
    <div v-if="showControls" class="mt-4 flex gap-4">
      <button
        v-if="mode === 'player'"
        @click="gameStore.handleUndo()"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Undo
      </button>
      <button
        v-if="mode === 'player'"
        @click="gameStore.clearQueensAndFlags()"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Restart
      </button>
      <button
        v-if="mode === 'solution'"
        @click="gameStore.generateFullSolution"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Generate Solution
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, defineComponent } from 'vue';
import { useGameStore } from '../stores/gameStore';
import Square from './Square.vue';

const props = defineProps({
  mode: {
    type: String as () => 'player' | 'solution',
    default: 'player',
    validator: (value: string) => ['player', 'solution'].includes(value),
  },
  showControls: {
    type: Boolean,
    default: true,
  },
});

const gameStore = useGameStore();
const localGridSize = ref(gameStore.gridSize);

// Watch for grid size changes from the store
watch(
  () => gameStore.gridSize,
  (newSize) => {
    localGridSize.value = newSize;
  }
);

// Initialize localGridSize from store on mount
onMounted(() => {
  localGridSize.value = gameStore.gridSize;
});
</script>

<script lang="ts">
export default defineComponent({
  name: 'GameGrid',
});
</script>
