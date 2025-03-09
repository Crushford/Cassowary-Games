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
  private isMuted: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Listen for global sound toggle events
    if (window.gameEvents) {
      window.gameEvents.on('toggle-sound', (enabled: boolean) => {
        this.setMute(!enabled);
      });
    }
  }

  /**
   * Load sound assets
   */
  public loadSounds(): void {
    // Effects
    this.scene.load.audio('queen-place', 'assets/sounds/queen-place.mp3');
    this.scene.load.audio('queen-death', 'assets/sounds/queen-death.mp3');
    this.scene.load.audio('flag-place', 'assets/sounds/flag-place.mp3');
    this.scene.load.audio('success', 'assets/sounds/success.mp3');
    this.scene.load.audio('button-click', 'assets/sounds/button-click.mp3');
    this.scene.load.audio('coin', 'assets/sounds/coin.mp3');

    // Music
    this.scene.load.audio('menu-music', 'assets/music/menu-theme.mp3');
    this.scene.load.audio('game-music', 'assets/music/game-theme.mp3');
  }

  /**
   * Initialize sounds after loading
   */
  public initSounds(): void {
    // Effects
    this.sounds.set('queen-place', this.scene.sound.add('queen-place'));
    this.sounds.set('queen-death', this.scene.sound.add('queen-death'));
    this.sounds.set('flag-place', this.scene.sound.add('flag-place'));
    this.sounds.set('success', this.scene.sound.add('success'));
    this.sounds.set('button-click', this.scene.sound.add('button-click'));
    this.sounds.set('coin', this.scene.sound.add('coin'));

    // Music - with loop enabled
    this.musicTracks.set('menu-music', this.scene.sound.add('menu-music', { loop: true }));
    this.musicTracks.set('game-music', this.scene.sound.add('game-music', { loop: true }));
  }

  /**
   * Play a sound effect
   */
  public playSound(key: string, volume: number = 1): void {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.play({ volume });
    }
  }

  /**
   * Play background music
   */
  public playMusic(key: string, volume: number = 0.5, fadeIn: number = 1000): void {
    // Stop current music if any
    this.stopMusic();

    // Play new music
    const music = this.musicTracks.get(key);
    if (music) {
      this.currentMusic = music;

      if (fadeIn > 0) {
        music.play({ volume: 0 });
        this.scene.tweens.add({
          targets: music,
          volume: volume,
          duration: fadeIn,
        });
      } else {
        music.play({ volume });
      }
    }
  }

  /**
   * Stop current music
   */
  public stopMusic(fadeOut: number = 1000): void {
    if (this.currentMusic) {
      if (fadeOut > 0) {
        this.scene.tweens.add({
          targets: this.currentMusic,
          volume: 0,
          duration: fadeOut,
          onComplete: () => {
            if (this.currentMusic) {
              this.currentMusic.stop();
              this.currentMusic = null;
            }
          },
        });
      } else {
        this.currentMusic.stop();
        this.currentMusic = null;
      }
    }
  }

  /**
   * Toggle sound mute
   */
  public toggleMute(): void {
    this.setMute(!this.isMuted);
  }

  /**
   * Set mute state
   */
  public setMute(mute: boolean): void {
    this.isMuted = mute;
    this.scene.sound.mute = mute;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopMusic(0);

    this.sounds.forEach((sound) => {
      sound.destroy();
    });

    this.musicTracks.forEach((music) => {
      music.destroy();
    });

    this.sounds.clear();
    this.musicTracks.clear();

    if (window.gameEvents) {
      window.gameEvents.off('toggle-sound');
    }
  }
}
