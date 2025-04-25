<template>
  <div class="min-h-screen bg-background">
    <nav class="bg-surface shadow-md">
      <div class="max-w-7xl mx-auto px-4 py-3">
        <div class="flex justify-between items-center">
          <h1 class="text-xl font-bold text-text">Honey Pot Ant Farming</h1>
          <div class="flex gap-4">
            <router-link
              to="/"
              class="text-text hover:text-primary-hover"
              :class="{ 'font-bold': route.path === '/' }"
            >
              Game Mode
            </router-link>
            <router-link
              to="/builder"
              class="text-text hover:text-primary-hover"
              :class="{ 'font-bold': route.path === '/builder' }"
            >
              Level Builder
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <div class="flex flex-col lg:flex-row">
      <!-- Main Content -->
      <div class="w-full lg:w-2/3 p-4">
        <router-view></router-view>
      </div>

      <!-- Global Debug Panel -->
      <div class="flex-1 bg-surface shadow-lg">
        <DebugPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import DebugPanel from './components/DebugPanel.vue';
import { useGameStore } from './stores/gameStore';
import { onMounted } from 'vue';

const route = useRoute();
const gameStore = useGameStore();

onMounted(() => {
  // Load saved puzzles when the app starts
  gameStore.loadPuzzlesFromLocalStorage();
});
</script>

<style>
/* Add any global styles here */
</style>
