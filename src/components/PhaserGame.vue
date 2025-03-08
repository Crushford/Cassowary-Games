<template>
  <div class="game-container">
    <div id="phaser-game"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted } from 'vue';
import Phaser from 'phaser';

interface TouchControls {
  left: boolean;
  right: boolean;
  up: boolean;
}

class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private stars!: Phaser.Physics.Arcade.Group;
  private touchControls: TouchControls = { left: false, right: false, up: false };

  constructor() {
    super({ key: 'MainScene' });
  }

  preload(): void {
    this.load.spritesheet('character', 
      'https://examples.phaser.io/assets/sprites/dude.png',
      { frameWidth: 32, frameHeight: 48 }
    );
    this.load.image('ground', 'https://examples.phaser.io/assets/sprites/platform.png');
    this.load.image('star', 'https://examples.phaser.io/assets/sprites/star.png');
    this.load.image('sky', 'https://examples.phaser.io/assets/skies/space3.png');
  }

  create(): void {
    // Add background
    this.add.image(400, 300, 'sky');

    // Create platforms
    const platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');

    // Player
    this.player = this.physics.add.sprite(100, 450, 'character');
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);

    // Player animations
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('character', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'turn',
      frames: [{ key: 'character', frame: 4 }],
      frameRate: 20
    });
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('character', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });

    // Stars
    this.stars = this.physics.add.group({
      key: 'star',
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 }
    });

    this.stars.children.iterate((child) => {
      const c = child as Phaser.Physics.Arcade.Image;
      c.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      return true;
    });

    // Collisions
    this.physics.add.collider(this.player, platforms);
    this.physics.add.collider(this.stars, platforms);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, undefined, this);

    // Score text
    this.scoreText = this.add.text(16, 16, 'Score: 0', { 
      fontSize: '32px', 
      color: '#fff'
    });

    // Cursors
    this.cursors = this.input.keyboard.createCursorKeys();

    // Touch controls
    this.setupTouchControls();

    // Emit event
    if (window.gameEvents) {
      window.gameEvents.emit('gameStarted');
    }
  }

  setupTouchControls(): void {
    // Left zone
    const leftZone = this.add.zone(200, 500, 200, 200).setInteractive();
    leftZone.on('pointerdown', () => { this.touchControls.left = true; });
    leftZone.on('pointerup', () => { this.touchControls.left = false; });
    leftZone.on('pointerout', () => { this.touchControls.left = false; });

    // Right zone
    const rightZone = this.add.zone(600, 500, 200, 200).setInteractive();
    rightZone.on('pointerdown', () => { this.touchControls.right = true; });
    rightZone.on('pointerup', () => { this.touchControls.right = false; });
    rightZone.on('pointerout', () => { this.touchControls.right = false; });

    // Jump zone
    const jumpZone = this.add.zone(400, 300, 800, 300).setInteractive();
    jumpZone.on('pointerdown', () => { this.touchControls.up = true; });
    jumpZone.on('pointerup', () => { this.touchControls.up = false; });
    jumpZone.on('pointerout', () => { this.touchControls.up = false; });
  }

  collectStar(player: Phaser.GameObjects.GameObject, star: Phaser.GameObjects.GameObject): void {
    const s = star as Phaser.Physics.Arcade.Image;
    s.disableBody(true, true);
    
    // Update score
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);
    
    // Emit score change event
    if (window.gameEvents) {
      window.gameEvents.emit('scoreChanged', this.score);
    }
    
    // Respawn stars when all collected
    if (this.stars.countActive(true) === 0) {
      this.stars.children.iterate((child) => {
        const c = child as Phaser.Physics.Arcade.Image;
        c.enableBody(true, c.x, 0, true, true);
        return true;
      });
    }
  }

  update(): void {
    // Movement
    if (this.cursors.left.isDown || this.touchControls.left) {
      this.player.setVelocityX(-160);
      this.player.anims.play('left', true);
    } else if (this.cursors.right.isDown || this.touchControls.right) {
      this.player.setVelocityX(160);
      this.player.anims.play('right', true);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play('turn');
    }

    // Jump
    if ((this.cursors.up.isDown || this.touchControls.up) && this.player.body.touching.down) {
      this.player.setVelocityY(-330);
      this.touchControls.up = false; // Reset to prevent continuous jumps
    }
  }
}

// Add type definitions for the global event emitter
declare global {
  interface Window {
    gameEvents?: Phaser.Events.EventEmitter;
  }
}

export default defineComponent({
  name: 'PhaserGame',
  emits: ['score-changed', 'game-started'],
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

      // Game config
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: 'phaser-game',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 300 },
            debug: false
          }
        },
        scene: MainScene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        }
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
  }
});
</script>

<style scoped>
.game-container {
  @apply flex justify-center items-center w-full h-full bg-black;
}

#phaser-game {
  @apply max-w-full max-h-full;
}
</style>
