<template>
  <div class="app">
    <header class="bg-gray-800 text-white p-4 text-center">
      <h1 class="text-3xl font-bold text-amber-600">Honey Pot Ant Farming</h1>
    </header>

    <main class="flex-1 min-h-0">
      <PhaserGame @score-changed="onScoreChanged" @game-started="onGameStarted" />
    </main>

    <footer class="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div class="text-2xl font-bold text-amber-400">Score: {{ score }}</div>
      <button
        class="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded"
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
    PhaserGame,
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
      resetGame,
    };
  },
});
</script>
