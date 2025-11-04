<template>
  <!-- KenoDebugPanel -->
  <div class="h-svh bg-gray-900 text-white p-4 overflow-y-auto">
    <h2 class="text-xl font-bold mb-4">Debug Panel</h2>
    <div class="space-y-4">
      <!-- Puzzle Size Selector -->
      <div>
        <label class="block text-sm font-medium mb-2">Puzzle Size</label>
        <PuzzleSizeSelector :store="store" />
      </div>

      <!-- Show Board Toggle -->
      <div>
        <label class="block text-sm font-medium mb-2">Show Solution</label>
        <button
          @click="store.toggleShowBoard()"
          class="w-full px-4 py-2 rounded transition-colors duration-150"
          :class="
            store.showBoard ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
          "
        >
          {{ store.showBoard ? 'Hide Board' : 'Show Board' }}
        </button>
      </div>

      <!-- Game Info -->
      <div class="pt-4 border-t border-gray-700">
        <h3 class="text-lg font-semibold mb-2">Game Info</h3>
        <div class="space-y-1 text-sm">
          <div>Grid Size: {{ store.gridSize }}×{{ store.gridSize }}</div>
          <div>Puzzle Size: {{ store.puzzleSize }}</div>
          <div>Turn: {{ store.currentTurn }}/{{ store.maxTurns }}</div>
          <div>Coins: {{ store.coins }}</div>
          <div>High Score: {{ store.highScore }}</div>
          <div>Selected: {{ store.selectedSquares.size }}/5</div>
          <div>Flipped: {{ store.flippedSquares.size }}</div>
          <div>Game Over: {{ store.gameOver ? 'Yes' : 'No' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PuzzleSizeSelector from './PuzzleSizeSelector.vue';
import type { useKenoStore } from '../../stores/kenoStore';

interface Props {
  store: ReturnType<typeof useKenoStore>;
}

defineProps<Props>();

defineOptions({
  name: 'KenoDebugPanel',
});
</script>
