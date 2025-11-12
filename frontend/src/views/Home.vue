<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-8">Honey Pot Ant Games</h1>

      <!-- Games Section -->
      <div class="mb-8">
        <h2 class="text-2xl font-semibold mb-4 text-blue-300">Choose a Game</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <router-link
            to="/queens"
            class="block p-6 bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors"
          >
            <h3 class="text-xl font-bold mb-2">Queens Game</h3>
            <p>A clone of the game Queens</p>
          </router-link>

          <router-link
            to="/casino"
            class="block p-6 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
          >
            <h3 class="text-xl font-bold mb-2">Honey Pot Ant Farming</h3>
            <p>A honey pot ant farming skin on the queens game</p>
          </router-link>

          <router-link
            to="/keno"
            class="block p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors opacity-75"
          >
            <h3 class="text-sm font-bold mb-1">(Under construction) Keno Game</h3>
            <p class="text-xs">Play the Keno game</p>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
