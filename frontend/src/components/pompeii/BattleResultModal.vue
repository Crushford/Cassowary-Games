<template>
  <Modal :is-visible="isVisible" @close="handleClose">
    <div class="text-white">
      <h2
        :class="[
          'text-3xl font-bold mb-4',
          battleResult === 'victory' ? 'text-green-500' : 'text-red-500',
        ]"
      >
        {{ battleResult === 'victory' ? 'Victory!' : 'Defeat!' }}
      </h2>

      <div class="mb-6 space-y-3">
        <div v-if="battleResult === 'victory'">
          <p class="text-lg mb-2">The enemy has been defeated!</p>
          <p v-if="battleType === 'countryside'" class="text-green-400">
            Countryside infrastructure is safe.
          </p>
        </div>

        <div v-else>
          <p class="text-lg mb-2">The battle was lost.</p>
          <div v-if="battleType === 'countryside'" class="text-red-400">
            <p>Countryside infrastructure has been damaged.</p>
            <p class="text-sm mt-1">Your army retreats with remaining strength.</p>
          </div>
          <div v-else-if="battleType === 'wall'" class="text-red-400">
            <p>All your soldiers died holding the walls.</p>
            <p v-if="armyCount === 0" class="text-xl font-bold mt-2">
              Your army has been wiped out!
            </p>
          </div>
        </div>
      </div>

      <!-- Battle Summary -->
      <div class="bg-gray-700 rounded p-4 mb-6">
        <h3 class="text-lg font-semibold mb-3">Battle Summary</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-400">Rounds:</span>
            <span class="font-semibold">{{ roundNumber }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Remaining Army:</span>
            <span class="font-semibold">{{ armyCount }} units</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Total Army Strength:</span>
            <span class="font-semibold">{{ totalArmyStrength }}</span>
          </div>
        </div>
      </div>

      <!-- Battle Log Preview -->
      <div class="bg-gray-800 rounded p-3 mb-6 max-h-40 overflow-y-auto">
        <div class="text-sm text-gray-300 mb-2">Recent Rounds</div>
        <div class="space-y-1 text-xs">
          <div v-for="(log, index) in recentLogs" :key="index" class="text-gray-200">
            {{ log }}
          </div>
        </div>
      </div>

      <button
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded transition-colors"
        @click="handleClose"
      >
        Continue
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '../../stores/pompeiiStore';
import Modal from '../shared/Modal.vue';

const store = usePompeiiStore();

const isVisible = computed(() => {
  return (
    store.currentBattle !== null &&
    !store.currentBattle.isActive &&
    store.currentBattle.battleResult !== null
  );
});

const battleResult = computed(() => store.currentBattle?.battleResult || null);
const battleType = computed(() => store.currentBattle?.battleType || null);
const roundNumber = computed(() => store.currentBattle?.roundNumber || 0);
const armyCount = computed(() => store.armyCount);
const totalArmyStrength = computed(() => store.totalArmyStrength);
const recentLogs = computed(() => {
  const logs = store.currentBattle?.battleLog || [];
  return logs.slice(-5); // Last 5 rounds
});

function handleClose(): void {
  store.endBattle();
}

defineOptions({
  name: 'BattleResultModal',
});
</script>
