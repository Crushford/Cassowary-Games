<template>
  <!-- EndOfRoundModal -->
  <div
    v-if="isVisible"
    class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4"
  >
    <div
      class="bg-gray-800 text-white p-6 rounded-xl max-w-md mx-auto space-y-4 shadow-xl"
      @click.stop
    >
      <h2 class="text-yellow-400 font-bold text-2xl text-center">Round Complete!</h2>

      <!-- Summary -->
      <div class="bg-gray-700 p-4 rounded-lg space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-gray-300">Total Coins:</span>
          <span class="text-yellow-400 font-bold text-xl">{{ store.coins }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-300">High Score:</span>
          <span class="text-green-400 font-bold text-xl">{{ store.highScore }}</span>
        </div>
      </div>

      <!-- Turn History -->
      <div class="bg-gray-700 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3 text-center">Turn Summary</h3>
        <div class="space-y-2">
          <div
            v-for="turn in store.turnHistory"
            :key="turn.turn"
            class="flex justify-between items-center text-sm"
          >
            <span class="text-gray-300">Turn {{ turn.turn }}:</span>
            <span class="text-gray-300"
              >{{ turn.selections }} selection{{ turn.selections !== 1 ? 's' : '' }} →</span
            >
            <span class="text-yellow-400 font-semibold">+{{ turn.coinsEarned }} coins</span>
          </div>
          <!-- Show empty turns if any -->
          <div
            v-for="turnNum in emptyTurns"
            :key="`empty-${turnNum}`"
            class="flex justify-between items-center text-sm opacity-50"
          >
            <span class="text-gray-400">Turn {{ turnNum }}:</span>
            <span class="text-gray-400">No selections</span>
          </div>
        </div>
      </div>

      <!-- Restart Button -->
      <button
        @click="handleRestart"
        class="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200"
      >
        Play Again
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useKenoStore } from '../../stores/kenoStore';

interface Props {
  isVisible: boolean;
}

const props = defineProps<Props>();

const store = useKenoStore();

const emptyTurns = computed(() => {
  const usedTurns = new Set(store.turnHistory.map((t) => t.turn));
  const empty: number[] = [];
  for (let i = 1; i <= 5; i++) {
    if (!usedTurns.has(i)) {
      empty.push(i);
    }
  }
  return empty;
});

function handleRestart() {
  store.restartGame();
}
</script>
