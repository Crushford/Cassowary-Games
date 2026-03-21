<template>
  <!-- KenoDebugPanel -->
  <div class="h-svh bg-semantic-neutral-900 text-white p-4 overflow-y-auto">
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
          class="w-full px-4 py-2 rounded transition-colors duration-150"
          :class="
            store.showBoard
              ? 'bg-semantic-success-600 hover:bg-semantic-success-700'
              : 'bg-semantic-neutral-700 hover:bg-semantic-neutral-600'
          "
          @click="store.toggleShowBoard()"
        >
          {{ store.showBoard ? 'Hide Board' : 'Show Board' }}
        </button>
      </div>

      <!-- Game Info -->
      <div class="pt-4 border-t border-semantic-neutral-700">
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
import type { useKenoStore } from '@/games/keno/stores/kenoStore';

interface Props {
  store: ReturnType<typeof useKenoStore>;
}

defineProps<Props>();

defineOptions({
  name: 'KenoDebugPanel',
});
</script>
