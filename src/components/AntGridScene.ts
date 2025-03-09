// src/components/AntGridScene.ts
import Phaser from 'phaser';
import { AntGameUI } from './AntGameUI';
import { GameResources } from './GameResources';
import { RainforestAmbiance } from './RainforestAmbiance';
import { GameController } from './GameController';
import { AssetLoader } from './AssetLoader';

// Using latest stable version of Phaser (3.60.0 as of March 2025)

export enum CellState {
  EMPTY = 0,
  FLAG = 1, // Now represents soldier ants
  QUEEN = 2, // Now represents honey pot ant queens
}

export class AntGridScene extends Phaser.Scene {
  private ui!: AntGameUI;
  private resources!: GameResources;
  private ambiance!: RainforestAmbiance;
  private gameController!: GameController;
  private assetLoader!: AssetLoader;

  constructor() {
    super({ key: 'AntGridScene' });
  }

  preload(): void {
    // Load all game assets
    this.assetLoader = new AssetLoader(this);
    this.assetLoader.preloadAssets();
  }

  create(): void {
    // Ensure all assets are available
    this.assetLoader.ensureAssets();

    // Create rainforest ambiance
    this.ambiance = new RainforestAmbiance(this);

    // Initialize game resources
    this.resources = new GameResources();

    // Create UI elements
    this.ui = new AntGameUI(this, this.resources);

    // Initialize game controller
    this.gameController = new GameController(this, this.resources, this.ui);

    // Emit game started event
    if (window.gameEvents) {
      window.gameEvents.emit('gameStarted');
    }
  }
}

// Add global type definitions
declare global {
  interface Window {
    gameEvents?: Phaser.Events.EventEmitter;
  }
}
