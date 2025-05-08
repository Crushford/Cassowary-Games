<template>
  <div class="min-h-screen bg-slate-900 text-slate-300">
    <div class="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] min-h-screen overflow-y-auto">
      <!-- Basic Controls Sidebar -->
      <aside class="p-4 bg-slate-800 border-r border-slate-700 overflow-y-auto">
        <BasicControls v-if="route.path === '/'" />
        <router-link
          v-if="route.path === '/level-builder'"
          to="/"
          class="inline-block mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-semibold transition-colors"
        >
          Back to Game
        </router-link>
      </aside>

      <!-- Main Content Area -->
      <main class="p-4 bg-slate-900 flex flex-col">
        <!-- Navigation -->
        <div class="flex justify-between mb-6">
          <h1 class="text-2xl font-bold text-white">N-Queens Puzzle</h1>
          <div class="flex gap-2">
            <router-link
              :to="route.path === '/' ? '/level-builder' : '/'"
              class="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-white font-semibold transition-colors"
            >
              {{ route.path === '/' ? 'Level Builder' : 'Play Game' }}
            </router-link>
          </div>
        </div>

        <!-- Game View -->
        <div class="flex-1 flex items-center justify-center">
          <router-view />
        </div>
      </main>

      <!-- Advanced Controls Sidebar -->
      <aside class="p-4 bg-slate-800 border-l border-slate-700 overflow-y-auto">
        <AdvancedControls v-if="route.path === '/'" />
        <div v-else></div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from './stores/gameStore';
import BasicControls from './components/BasicControls.vue';
import AdvancedControls from './components/AdvancedControls.vue';

const route = useRoute();
const gameStore = useGameStore();

// Load saved puzzles from local storage on app mount
onMounted(() => {
  gameStore.loadPuzzlesFromLocalStorage();
});
</script>
