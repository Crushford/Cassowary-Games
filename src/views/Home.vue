<template>
  <div class="min-h-dvh bg-gray-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-8">Honey Pot Ant Farming</h1>

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
    </div>
  </div>
</template>

<script setup lang="ts">
// No debug code needed - routing is working properly
</script>
