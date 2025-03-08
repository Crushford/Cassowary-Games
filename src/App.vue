<template>
  <div class="app">
    <header class="app-header">
      <h1 class="text-3xl font-bold text-amber-600">Honey Pot Ant Farming</h1>
    </header>
    
    <main class="app-main">
      <PhaserGame
        @score-changed="onScoreChanged"
        @game-started="onGameStarted"
      />
    </main>
    
    <footer class="app-footer">
      <div class="score-display">Score: {{ score }}</div>
      <button 
        class="reset-button"
        @click="resetGame"
      >
        Reset Game
      </button>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import PhaserGame from './components/PhaserGame.vue';

export default defineComponent({
  name: 'App',
  components: {
    PhaserGame
  },
  setup() {
    const score = ref(0);
    const gameStarted = ref(false);
    
    const onScoreChanged = (newScore: number) => {
      score.value = newScore;
    };
    
    const onGameStarted = () => {
      gameStarted.value = true;
      console.log('Game has been initialized and started!');
    };
    
    const resetGame = () => {
      // You would implement game reset logic here
      // This could reload the component or call a method on the game instance
      score.value = 0;
      window.location.reload();
    };
    
    return {
      score,
      gameStarted,
      onScoreChanged,
      onGameStarted,
      resetGame
    };
  }
});
</script>

<style>
.app {
  @apply flex flex-col h-screen w-screen;
}

.app-header {
  @apply bg-gray-800 text-white p-4 text-center;
}

.app-main {
  @apply flex-1 min-h-0;
}

.app-footer {
  @apply bg-gray-800 text-white p-4 flex justify-between items-center;
}

.score-display {
  @apply text-2xl font-bold text-amber-400;
}

.reset-button {
  @apply bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded;
}
</style>
