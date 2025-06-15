<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from './stores/gameStore';

const route = useRoute();
const gameStore = useGameStore();

// Load saved puzzles from local storage on app mount
onMounted(() => {
  gameStore.loadPuzzlesFromLocalStorage();
  gameStore.loadHighScore();
  gameStore.loadCurrentDay();
});
</script>
