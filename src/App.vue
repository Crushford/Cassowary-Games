<template>
  <div class="app flex flex-col h-screen">
    <header class="bg-white text-black p-4 text-center border-b border-black">
      <h1 class="text-3xl font-bold">Honey Pot Ant Colony</h1>
    </header>

    <main class="flex-1 min-h-0 overflow-hidden flex justify-center items-center bg-white">
      <div id="game-container" class="w-full h-full"></div>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted } from 'vue';
import Phaser from 'phaser';
import { GameConfig } from './config/gameConfig';

// Add global type definitions
declare global {
  interface Window {
    gameEvents: Phaser.Events.EventEmitter;
  }
}

export default defineComponent({
  name: 'App',
  setup() {
    let game: Phaser.Game | null = null;

    // Initialize the game
    onMounted(() => {
      // Create global event emitter for cross-scene communication
      window.gameEvents = new Phaser.Events.EventEmitter();

      // Initialize the Phaser game
      game = new Phaser.Game({
        ...GameConfig,
        parent: 'game-container',
      });
    });

    // Clean up
    onUnmounted(() => {
      if (game) {
        game.destroy(true);
      }
    });

    return {};
  },
});
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
  background-color: white;
  color: black;
}

canvas {
  display: block;
}
</style>
