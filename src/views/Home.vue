<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-8">Honey Pot Ant Farming</h1>

      <!-- DEBUG: Show current route info -->
      <div class="bg-gray-800 p-4 rounded-lg mb-8">
        <h2 class="text-xl font-semibold mb-4">🔍 Debug Information</h2>
        <div class="space-y-2 text-sm">
          <p><strong>Current Route:</strong> {{ $route.path }}</p>
          <p><strong>Route Name:</strong> {{ $route.name }}</p>
          <p><strong>Full URL:</strong> {{ currentUrl }}</p>
          <p><strong>Base URL:</strong> {{ baseUrl }}</p>
          <p><strong>User Agent:</strong> {{ userAgent }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <router-link
          to="/game"
          class="block p-6 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <h2 class="text-2xl font-bold mb-2">Play Game</h2>
          <p>Start playing the honeypot ant farming game</p>
        </router-link>

        <router-link
          to="/level-builder"
          class="block p-6 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
        >
          <h2 class="text-2xl font-bold mb-2">Level Builder</h2>
          <p>Create and test custom puzzle levels</p>
        </router-link>
      </div>

      <!-- DEBUG: Manual navigation test -->
      <div class="mt-8 p-4 bg-gray-800 rounded-lg">
        <h3 class="text-lg font-semibold mb-4">🔍 Manual Navigation Test</h3>
        <div class="space-x-4">
          <button
            @click="navigateTo('/game')"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Navigate to /game
          </button>
          <button
            @click="navigateTo('/level-builder')"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
          >
            Navigate to /level-builder
          </button>
          <button @click="refreshPage" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
            Refresh Page (Test 404)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';

const router = useRouter();

// DEBUG: Reactive data for template
const currentUrl = ref('');
const baseUrl = ref('');
const userAgent = ref('');

// DEBUG: Log when Home component is mounted
onMounted(() => {
  console.log('🔍 Home Debug: Home component mounted');
  console.log('🔍 Home Debug: Current route =', router.currentRoute.value.path);

  // Set reactive data
  currentUrl.value = window.location.href;
  baseUrl.value = import.meta.env.BASE_URL;
  userAgent.value = navigator.userAgent;
});

const navigateTo = (path: string) => {
  console.log('🔍 Home Debug: Manually navigating to', path);
  router.push(path);
};

const refreshPage = () => {
  console.log('🔍 Home Debug: Refreshing page to test 404 behavior');
  window.location.reload();
};
</script>
