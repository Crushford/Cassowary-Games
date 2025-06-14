<template>
  <div class="flex flex-col bg-gray-900">
    <div class="w-full max-w-full mx-auto">
      <div class="flex flex-col items-center w-full">
        <div class="w-full aspect-square">
          <PlayGrid />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import PlayGrid from '../components/PlayGrid.vue';
import { onMounted } from 'vue';

const gameStore = useGameStore();

onMounted(() => {
  debugger;
  gameStore.findValidPuzzleWithSteps();
});

defineOptions({
  name: 'GameMode',
});
</script>
