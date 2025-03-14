import Phaser from 'phaser';

declare global {
  interface Window {
    gameEvents: Phaser.Events.EventEmitter;
  }
}
