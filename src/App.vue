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

    <div class="flex">
      <!-- Main Content -->
      <div class="flex-1">
        <router-view></router-view>
      </div>

      <!-- Global Debug Panel -->
      <div class="w-96 bg-surface shadow-lg">
        <DebugPanel
          :grid="gameState.grid"
          :grid-size="gameState.gridSize"
          :move-history="gameState.moveHistory"
          @make-move="handleDebugMove"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import { useRoute } from 'vue-router';
import DebugPanel from './components/DebugPanel.vue';
import type { GridSquare } from './components/GameGrid.vue';

const route = useRoute();

// Game state management
const gameState = ref({
  grid: [] as GridSquare[],
  gridSize: 6,
  moveHistory: [] as { grid: GridSquare[] }[],
});

// Provide game state to child components
provide('gameState', gameState);

// Handle debug panel moves
const handleDebugMove = (index: number) => {
  // Emit a custom event that child components can listen to
  window.dispatchEvent(new CustomEvent('debug-move', { detail: { index } }));
};
</script>

<style>
/* Add any global styles here */
</style>
