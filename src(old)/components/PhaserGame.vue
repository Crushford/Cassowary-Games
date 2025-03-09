<template>
  <div class="game-container">
    <div id="phaser-game"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted } from 'vue';
import Phaser from 'phaser';
import { AntGridScene } from './AntGridScene';

export default defineComponent({
  name: 'PhaserGame',
  emits: ['score-changed', 'game-started', 'game-over', 'game-restarted'],
  setup(props, { emit }) {
    let game: Phaser.Game | null = null;

    onMounted(() => {
      // Create event emitter for communication
      window.gameEvents = new Phaser.Events.EventEmitter();

      // Setup event listeners
      window.gameEvents.on('scoreChanged', (score: number) => {
        emit('score-changed', score);
      });

      window.gameEvents.on('gameStarted', () => {
        emit('game-started');
      });

      window.gameEvents.on('gameOver', (data: { success: boolean; score: number }) => {
        emit('game-over', data);
      });

      window.gameEvents.on('gameRestarted', () => {
        emit('game-restarted');
      });

      // Game config
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 600,
        height: 600,
        parent: 'phaser-game',
        backgroundColor: '#87CEEB', // Sky blue background
        scene: AntGridScene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      // Initialize Phaser game
      game = new Phaser.Game(config);
    });

    onUnmounted(() => {
      // Clean up
      if (game) {
        game.destroy(true);
        game = null;
      }

      if (window.gameEvents) {
        window.gameEvents.removeAllListeners();
        window.gameEvents = undefined;
      }
    });

    return {};
  },
});
</script>

<style>
.game-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: #000;
}

#phaser-game {
  max-width: 100%;
  max-height: 100%;
}
</style>
