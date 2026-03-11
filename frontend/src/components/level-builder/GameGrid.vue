<template>
  <div class="flex flex-col items-center">
    <!-- Game Grid -->
    <div
      class="grid w-full bg-slate-800 border-2 border-slate-700 p-1 rounded-lg shadow-lg gap-1"
      :style="{
        gridTemplateColumns: `repeat(${levelStore.gridSize}, minmax(0, 1fr))`,
      }"
    >
      <template v-for="rowIndex in levelStore.gridSize" :key="rowIndex">
        <Square
          v-for="colIndex in levelStore.gridSize"
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
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        @click="levelStore.handleUndo()"
      >
        Undo
      </button>
      <button
        v-if="mode === 'player'"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        @click="levelStore.clearMarkers()"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useLevelBuilderStore } from '../../stores/levelBuilderStore';
import Square from './Square.vue';

defineProps<{
  mode: 'solution' | 'player' | 'autoTest';
  showControls?: boolean;
}>();

const levelStore = useLevelBuilderStore();
const localGridSize = ref(levelStore.gridSize);

// Watch for grid size changes from the store
watch(
  () => levelStore.gridSize,
  (newSize) => {
    localGridSize.value = newSize;
  }
);

// Initialize localGridSize from store on mount
onMounted(() => {
  localGridSize.value = levelStore.gridSize;
});
</script>

<script lang="ts">
export default {
  name: 'GameGrid',
};
</script>
