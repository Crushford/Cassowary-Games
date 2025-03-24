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
          :grid="gameStore.grid"
          :grid-size="gameStore.gridSize"
          :move-history="gameStore.moveHistory"
          @make-move="gameStore.handleDebugMove"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import DebugPanel from './components/DebugPanel.vue';
import { useGameStore } from './stores/gameStore';

const route = useRoute();
const gameStore = useGameStore();
</script>

<style>
/* Add any global styles here */
</style>
