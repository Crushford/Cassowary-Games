<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-8">Honey Pot Ant Farming</h1>

      <!-- Games Section -->
      <div class="mb-8">
        <h2 class="text-2xl font-semibold mb-4 text-blue-300">Games</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <router-link
            to="/harvest"
            class="block p-6 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <h3 class="text-xl font-bold mb-2">Harvesting Game</h3>
            <p>In this game you harvest the honey pot ant farms</p>
          </router-link>

          <router-link
            to="/plant"
            class="block p-6 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <h3 class="text-xl font-bold mb-2">Planting Game</h3>
            <p>In this game you plant the honey pot ant farms</p>
          </router-link>
        </div>
      </div>

      <!-- Development Tools Section -->
      <div>
        <h2 class="text-2xl font-semibold mb-4 text-yellow-300">Development Tools</h2>
        <div class="grid grid-cols-1 gap-6">
          <router-link
            to="/level-builder"
            class="block p-6 bg-yellow-700 hover:bg-yellow-600 rounded-lg transition-colors border border-yellow-500"
          >
            <h3 class="text-xl font-bold mb-2">Level Builder</h3>
            <p class="text-yellow-200">
              Create and test custom puzzle levels for development purposes
            </p>
            <p class="text-sm text-yellow-300 mt-2 italic">
              For developers and content creators only
            </p>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
