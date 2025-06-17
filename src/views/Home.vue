<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <h1 class="text-4xl font-bold text-white mb-12">N-Queens Puzzle</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
      <!-- Level Builder Option -->
      <router-link
        to="/level-builder"
        class="p-8 bg-slate-800 rounded-lg shadow-lg hover:bg-slate-700 transition-colors group"
      >
        <h2 class="text-2xl font-semibold text-white mb-3">Level Builder</h2>
        <p class="text-slate-400">Create and test custom N-Queens puzzles</p>
      </router-link>

      <!-- Game Mode Option -->
      <router-link
        to="/game"
        class="p-8 bg-slate-800 rounded-lg shadow-lg hover:bg-slate-700 transition-colors group"
      >
        <h2 class="text-2xl font-semibold text-white mb-3">Game Mode</h2>
        <p class="text-slate-400">Play and solve N-Queens puzzles</p>
      </router-link>
    </div>
  </div>
</template>
