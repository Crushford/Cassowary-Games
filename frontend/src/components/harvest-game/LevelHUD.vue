<template>
  <div
    class="px-4 py-2 bg-gray-900 border-b border-gray-700 relative flex items-center justify-between"
  >
    <!-- Gold Display -->
    <div class="flex-1">
      <GoldDisplay />
    </div>

    <!-- Back to Farms Button (right side) -->
    <button
      v-if="roundStore.boardSize"
      @click="handleLeave"
      class="bg-gradient-to-r from-amber-600 to-amber-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-amber-500 hover:to-amber-400 transition-all duration-200 shadow-lg hover:shadow-xl z-10"
    >
      Back to Farms
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useRoundStore } from '../../stores/round';

const GoldDisplay = defineAsyncComponent(() => import('../casino/GoldDisplay.vue'));
const roundStore = useRoundStore();

const handleLeave = () => {
  if (roundStore.boardSize) {
    roundStore.leaveLevel();
  }
};

defineOptions({
  name: 'LevelHUD',
});
</script>
