<template>
  <div class="relative flex flex-col items-center">
    <!-- Game Grid -->
    <div
      class="grid w-full bg-slate-800 border-2 border-slate-700 p-1 rounded-lg shadow-lg gap-1"
      :style="{
        gridTemplateColumns: `repeat(${gameStore.gridSize}, minmax(0, 1fr))`,
      }"
    >
      <template v-for="rowIndex in gameStore.gridSize" :key="rowIndex">
        <Square
          v-for="colIndex in gameStore.gridSize"
          :key="`${rowIndex}-${colIndex}`"
          :row="rowIndex - 1"
          :col="colIndex - 1"
          :mode="mode"
        />
      </template>
    </div>

    <!-- Control Buttons -->
    <div class="mt-4 flex gap-4">
      <button
        v-if="mode === 'player'"
        @click="gameStore.handleUndo()"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Undo
      </button>
      <button
        v-if="mode === 'player'"
        @click="gameStore.clearMarkers()"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useGameStore } from '../stores/gameStore';
import Square from './Square.vue';

const props = defineProps<{
  mode: 'solution' | 'player';
  showControls?: boolean;
}>();

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
export default {
  name: 'GameGrid',
};
</script>
