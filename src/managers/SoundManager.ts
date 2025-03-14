// src/managers/SoundManager.ts
import Phaser from 'phaser';

declare global {
  interface Window {
    gameEvents: Phaser.Events.EventEmitter;
  }
}

export class SoundManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private musicTracks: Map<string, Phaser.Sound.BaseSound> = new Map();
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private isMuted: boolean = true; // Set to true by default

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Listen for global sound toggle events
    if (window.gameEvents) {
      window.gameEvents.on('toggle-sound', (enabled: boolean) => {
        // Do nothing - sounds are disabled
      });
    }
  }

  /**
   * Load sound assets - disabled
   */
  public loadSounds(): void {
    // No-op: Don't load any sounds
  }

  /**
   * Initialize sounds after loading - disabled
   */
  public initSounds(): void {
    // No-op: Don't initialize any sounds
  }

  /**
   * Play a sound effect - disabled
   */
  public playSound(key: string, volume: number = 1): void {
    // No-op: Don't play any sounds
  }

  /**
   * Play background music - disabled
   */
  public playMusic(key: string, volume: number = 0.5, fadeIn: number = 1000): void {
    // No-op: Don't play any music
  }

  /**
   * Stop current music - disabled
   */
  public stopMusic(fadeOut: number = 1000): void {
    // No-op: No music to stop
  }

  /**
   * Toggle sound mute - disabled
   */
  public toggleMute(): void {
    // No-op: Always muted
  }

  /**
   * Set mute state - disabled
   */
  public setMute(mute: boolean): void {
    this.isMuted = true; // Always muted
    this.scene.sound.mute = true;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (window.gameEvents) {
      window.gameEvents.off('toggle-sound');
    }
  }
}
