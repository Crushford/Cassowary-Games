<template>
  <div class="px-4 py-3 bg-gray-900 border-b border-gray-700">
    <!-- Top row: Gold Display -->
    <div class="flex justify-between items-center mb-3">
      <!-- Left: Gold Display -->
      <GoldDisplay />
    </div>

    <!-- Bottom row: Rules and Full Rules Button -->
    <div class="text-center text-sm text-gray-300 space-y-2">
      <!-- Rule 1: Honey pot distribution -->
      <div class="flex justify-center items-center space-x-4">
        <div>The rules of this game are:</div>
        <button
          @click="globalStore.setShowRules(true)"
          class="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition-colors text-xs"
        >
          Full Rules
        </button>
      </div>
      <div class="flex flex-col items-center space-y-1 text-xs">
        <span>- There is only 1 honeypot per Column</span>
        <span>- There is only 1 honeypot per Row</span>
        <span>- There is only 1 honeypot per Color Group</span>
      </div>

      <!-- Rule 2: Card values -->
      <div class="flex justify-center items-center space-x-6 mt-3">
        <div class="flex items-center space-x-2">
          <img src="/assets/card-backs/ant.png" alt="Ant" class="w-8 h-8" />
          <span class="text-red-400 font-semibold">-5 gold</span>
        </div>
        <div class="flex items-center space-x-2">
          <img src="/assets/card-backs/honey.png" alt="Honey Pot" class="w-8 h-8" />
          <span class="text-green-400 font-semibold">+1 gold</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useGlobalStore } from '../../stores/global';

const GoldDisplay = defineAsyncComponent(() => import('./GoldDisplay.vue'));
const globalStore = useGlobalStore();

defineOptions({
  name: 'CasinoHUD',
});
</script>
