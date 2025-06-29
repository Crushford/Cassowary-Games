<template>
  <div class="flex justify-between items-center">
    <div class="flex items-center space-x-2">
      <span class="text-amber-400">🍯</span>
      <span>{{ gameStore.honeyPots }}</span>
      <span v-if="gameStore.isTrainingDay" class="text-green-400 text-sm ml-2"> (Training) </span>
    </div>
    <BitesDisplay />
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../../stores/gameStore';
import BitesDisplay from './BitesDisplay.vue';

const gameStore = useGameStore();
</script>

<script lang="ts">
export default {
  name: 'GameHUD',
};
</script>
