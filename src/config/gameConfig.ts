// src/config/gameConfig.ts
import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';

// Import constants for configuration
import { GAME_CONSTANTS } from './constants';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
  },
  scene: [
    BootScene, // Asset loading
    MainMenuScene, // Title screen
    GameScene, // Main gameplay
    UIScene, // User interface overlay
  ],
  pixelArt: false,
  roundPixels: true,
  antialias: true,
  disableContextMenu: true,
  dom: {
    createContainer: true,
  },
  render: {
    transparent: false,
    antialias: true,
    pixelArt: false,
  },
  callbacks: {
    postBoot: (game) => {
      // Create global event emitter if it doesn't exist yet
      if (!window.gameEvents) {
        window.gameEvents = new Phaser.Events.EventEmitter();
      }

      console.log('Honey Pot Ant Colony game initialized!');
    },
  },
  audio: {
    disableWebAudio: false,
    noAudio: false,
  },
  autoFocus: true,
  title: 'Honey Pot Ant Colony',
  version: '1.0.0',
};
