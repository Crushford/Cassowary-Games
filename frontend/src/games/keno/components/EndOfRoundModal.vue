<template>
  <!-- EndOfRoundModal -->
  <div
    v-if="isVisible"
    class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4"
  >
    <div
      class="bg-semantic-neutral-800 text-white p-6 rounded-xl max-w-md mx-auto space-y-4 shadow-xl"
      @click.stop
    >
      <h2 class="text-semantic-warning-400 font-bold text-2xl text-center">Round Complete!</h2>

      <!-- Summary -->
      <div class="bg-semantic-neutral-700 p-4 rounded-lg space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-semantic-neutral-300">Total Food:</span>
          <span class="text-semantic-warning-400 font-bold text-xl">{{ store.food }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-semantic-neutral-300">Cassowaries:</span>
          <span class="text-semantic-success-400 font-bold text-xl">{{ store.cassowaries }}</span>
        </div>
      </div>

      <!-- Food Breakdown -->
      <div class="bg-semantic-neutral-700 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3 text-center">Food Breakdown</h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center text-sm">
            <span class="text-semantic-neutral-300">From Forage:</span>
            <span class="text-semantic-warning-400 font-semibold">{{ foodFromForage }}</span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-semantic-neutral-300">From Hunt:</span>
            <span class="text-semantic-warning-400 font-semibold">{{ foodFromHunt }}</span>
          </div>
        </div>
      </div>

      <!-- Nesting Success -->
      <div class="bg-semantic-neutral-700 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3 text-center">Nesting Success</h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center text-sm">
            <span class="text-semantic-neutral-300">Cassowaries Gained:</span>
            <span class="text-semantic-success-400 font-semibold"
              >+{{ totalCassowariesGained }}</span
            >
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-semantic-neutral-300">Cassowaries Lost:</span>
            <span class="text-semantic-danger-400 font-semibold">-{{ totalCassowariesLost }}</span>
          </div>
        </div>
      </div>

      <!-- Turn History -->
      <div class="bg-semantic-neutral-700 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3 text-center">Turn Summary</h3>
        <div class="space-y-2">
          <div
            v-for="turn in store.turnHistory"
            :key="turn.turn"
            class="flex flex-col gap-1 text-sm"
          >
            <div class="flex justify-between items-center">
              <span class="text-semantic-neutral-300"
                >Turn {{ turn.turn }} ({{ turn.action }}):</span
              >
              <span class="text-semantic-neutral-300"
                >{{ turn.selections }} selection{{ turn.selections !== 1 ? 's' : '' }}</span
              >
            </div>
            <div v-if="turn.foodEarned > 0" class="text-semantic-warning-400 text-xs ml-4">
              +{{ turn.foodEarned }} food
            </div>
            <div v-if="turn.cassowariesGained > 0" class="text-semantic-success-400 text-xs ml-4">
              +{{ turn.cassowariesGained }} cassowaries
            </div>
            <div v-if="turn.cassowariesLost > 0" class="text-semantic-danger-400 text-xs ml-4">
              -{{ turn.cassowariesLost }} cassowaries
            </div>
          </div>
          <!-- Show empty turns if any -->
          <div
            v-for="turnNum in emptyTurns"
            :key="`empty-${turnNum}`"
            class="flex justify-between items-center text-sm opacity-50"
          >
            <span class="text-semantic-neutral-400">Turn {{ turnNum }}:</span>
            <span class="text-semantic-neutral-400">No selections</span>
          </div>
        </div>
      </div>

      <!-- Restart Button -->
      <button
        class="w-full py-3 px-6 bg-semantic-success-600 hover:bg-semantic-success-700 text-white font-semibold rounded-lg transition-colors duration-200"
        @click="handleRestart"
      >
        Play Again
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useKenoStore } from '@/games/keno/stores/kenoStore';

interface Props {
  isVisible: boolean;
}

defineProps<Props>();

const store = useKenoStore();

const foodFromForage = computed(() => {
  return store.turnHistory
    .filter((t) => t.action === 'forage')
    .reduce((sum, t) => sum + t.foodEarned, 0);
});

const foodFromHunt = computed(() => {
  return store.turnHistory
    .filter((t) => t.action === 'hunt')
    .reduce((sum, t) => sum + t.foodEarned, 0);
});

const totalCassowariesGained = computed(() => {
  return store.turnHistory.reduce((sum, t) => sum + t.cassowariesGained, 0);
});

const totalCassowariesLost = computed(() => {
  return store.turnHistory.reduce((sum, t) => sum + t.cassowariesLost, 0);
});

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
