// src/config/gameConfig.ts
import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';
import { GAME_CONSTANTS } from './constants';

// Calculate grid dimensions
const gridWidth = GAME_CONSTANTS.GRID_SIZE * GAME_CONSTANTS.CELL_SIZE;
const gridHeight = GAME_CONSTANTS.GRID_SIZE * GAME_CONSTANTS.CELL_SIZE;

// For portrait mobile layout, use fixed width-to-height ratio
// with extra space for top and bottom UI bars
const TOP_BAR_HEIGHT = 100; // Height for the top information bar
const BOTTOM_BAR_HEIGHT = 80; // Height for the bottom status bar
const PADDING = 20; // Side padding

// Set game dimensions for portrait mode
const width = gridWidth + PADDING * 2; // Grid width plus padding
const height = gridHeight + TOP_BAR_HEIGHT + BOTTOM_BAR_HEIGHT; // Grid height plus UI areas

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width,
  height,
  backgroundColor: 0xffffff,
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
    width,
    height,
  },
  scene: [BootScene, MainMenuScene, GameScene, UIScene],
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
    postBoot: (game: Phaser.Game) => {
      // Create global event emitter if it doesn't exist yet
      if (!window.gameEvents) {
        window.gameEvents = new Phaser.Events.EventEmitter();
      }

      // eslint-disable-next-line no-console
      console.log('Honey Pot Ant Colony game initialized!');
    },
  },
  autoFocus: true,
  title: 'Honey Pot Ant Colony',
  version: '1.0.0',
};
