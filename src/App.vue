<template>
  <div class="min-h-screen bg-slate-900 text-slate-300">
    <!-- Header with Back Button (only show when not on home) -->
    <header v-if="route.path !== '/'" class="p-4 bg-slate-800 border-b border-slate-700">
      <div class="max-w-7xl mx-auto flex items-center gap-4">
        <router-link
          to="/"
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-semibold transition-colors"
        >
          Back to Menu
        </router-link>
        <h1 class="text-2xl font-bold text-white">
          {{ route.path === '/level-builder' ? 'Level Builder' : 'Game Mode' }}
        </h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto p-4">
      <router-view />
    </main>
  </div>
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
