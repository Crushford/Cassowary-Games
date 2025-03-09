// src/scenes/GameScene.ts
import { BaseScene } from './BaseScene';
import { Board } from '../prefabs/Board';
import { GameManager, GameState } from '../managers/GameManager';
import { Cell } from '../prefabs/Cell';

export class GameScene extends BaseScene {
  private board!: Board;
  private gameManager!: GameManager;
  private raindrops: Phaser.GameObjects.Image[] = [];
  private leaves: Phaser.GameObjects.Image[] = [];
  private rainTimer!: Phaser.Time.TimerEvent;
  private leavesTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super('GameScene');
  }

  create(): void {
    // Create rainforest background with a darker tint for more atmosphere
    this.createBackground('rainforest');
    const bg = this.children
      .getAll()
      .find((child) => child.type === 'Image') as Phaser.GameObjects.Image;
    if (bg) {
      bg.setTint(0x88aa88);
    }

    // Create ambient effects
    this.createAmbience();

    // Initialize game board
    this.board = new Board(this);

    // Initialize game manager
    this.gameManager = new GameManager(this, this.board);

    // Set up event listeners for visual effects
    this.setupEventListeners();
  }

  private createAmbience(): void {
    // Create occasional falling raindrops
    this.rainTimer = this.time.addEvent({
      delay: 800,
      callback: this.createRaindrop,
      callbackScope: this,
      loop: true,
    });

    // Create occasional falling leaves
    this.leavesTimer = this.time.addEvent({
      delay: 3000,
      callback: this.createLeaf,
      callbackScope: this,
      loop: true,
    });
  }

  private createRaindrop(): void {
    if (this.raindrops.length > 10) return; // Limit number of raindrops

    const x = Phaser.Math.Between(0, this.cameras.main.width);
    const raindrop = this.add.image(x, -20, 'raindrop');
    raindrop.setAlpha(0.6);
    raindrop.setScale(0.5);
    raindrop.setDepth(5);

    this.raindrops.push(raindrop);

    this.tweens.add({
      targets: raindrop,
      y: this.cameras.main.height + 50,
      duration: Phaser.Math.Between(1500, 2500),
      onComplete: () => {
        // Remove raindrop from array and destroy
        const index = this.raindrops.indexOf(raindrop);
        if (index > -1) {
          this.raindrops.splice(index, 1);
        }
        raindrop.destroy();
      },
    });
  }

  private createLeaf(): void {
    if (this.leaves.length > 5) return; // Limit number of leaves

    const x = Phaser.Math.Between(0, this.cameras.main.width);
    const leaf = this.add.image(x, -20, 'leaf');
    leaf.setAlpha(0.8);
    leaf.setScale(0.3);
    leaf.setAngle(Phaser.Math.Between(0, 360));
    leaf.setDepth(5);

    this.leaves.push(leaf);

    this.tweens.add({
      targets: leaf,
      y: this.cameras.main.height + 50,
      x: x + Phaser.Math.Between(-100, 100),
      angle: leaf.angle + Phaser.Math.Between(180, 360),
      duration: Phaser.Math.Between(4000, 6000),
      onComplete: () => {
        // Remove leaf from array and destroy
        const index = this.leaves.indexOf(leaf);
        if (index > -1) {
          this.leaves.splice(index, 1);
        }
        leaf.destroy();
      },
    });
  }

  private setupEventListeners(): void {
    if (window.gameEvents) {
      // Listen for restart from UI buttons
      window.gameEvents.on('restart-game', () => {
        if (this.gameManager) {
          this.gameManager.restartGame();
        }
      });

      // Visual effects for queen placement
      this.gameManager.events.on('queen-placement-effect', (data: { row: number; col: number }) => {
        this.showQueenPlacementEffect(data.row, data.col);
        this.showGoldCoinAnimation();
      });

      // Visual effects for queen death
      this.gameManager.events.on('queen-death-effect', (data: { row: number; col: number }) => {
        this.showQueenDeathEffect(data.row, data.col);
      });

      // Success effects
      this.gameManager.events.on('success-effect', () => {
        this.showSuccessEffect();
      });
    }
  }

  private showQueenPlacementEffect(row: number, col: number): void {
    // Get cell position from board
    const cell = this.board.getCell(row, col);
    if (!cell) return;

    // Create a circle that expands and fades out
    const worldPos = this.getWorldPosition(cell);
    const circle = this.add.circle(worldPos.x, worldPos.y, 5, 0xffd700, 0.7);
    circle.setDepth(120);

    this.tweens.add({
      targets: circle,
      radius: 40,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        circle.destroy();
      },
    });
  }

  private showQueenDeathEffect(row: number, col: number): void {
    // Get cell position from board
    const cell = this.board.getCell(row, col);
    if (!cell) return;

    // Get world position
    const worldPos = this.getWorldPosition(cell);

    // Create particles for queen death
    const particles = this.add.particles(worldPos.x, worldPos.y, 'raindrop', {
      speed: { min: 20, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0.1 },
      blendMode: 'ADD',
      lifespan: 800,
      quantity: 15,
    });

    // Stop emitting after a short time and then destroy
    this.time.delayedCall(300, () => {
      particles.stop();
      this.time.delayedCall(800, () => {
        particles.destroy();
      });
    });
  }

  private showGoldCoinAnimation(): void {
    // Create gold coin that spins and vanishes
    const posX = this.cameras.main.width - 50;
    const posY = 120;

    const coin = this.add.image(posX, posY, 'gold-coin');
    coin.setScale(0.5);
    coin.setDepth(150);

    this.tweens.add({
      targets: coin,
      angle: 360,
      alpha: { from: 1, to: 0 },
      y: posY + 30,
      duration: 1500,
      onComplete: () => {
        coin.destroy();
      },
    });
  }

  private showSuccessEffect(): void {
    // Create colorful particles from the top of the screen
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(100, this.cameras.main.width - 100);
      const particles = this.add.particles(x, -20, 'leaf', {
        speed: { min: 100, max: 200 },
        angle: { min: 80, max: 100 },
        scale: { start: 0.2, end: 0.1 },
        lifespan: 3000,
        frequency: 100,
        quantity: 1,
      });

      // Stop emitting after 2 seconds and destroy
      this.time.delayedCall(2000, () => {
        particles.stop();
        this.time.delayedCall(3000, () => {
          particles.destroy();
        });
      });
    }
  }

  private getWorldPosition(cell: Cell): { x: number; y: number } {
    // Convert cell container position to world position
    const worldX = this.board.x + cell.x;
    const worldY = this.board.y + cell.y;
    return { x: worldX, y: worldY };
  }

  shutdown(): void {
    // Clean up timers
    if (this.rainTimer) this.rainTimer.destroy();
    if (this.leavesTimer) this.leavesTimer.destroy();

    // Clean up existing raindrops and leaves
    this.raindrops.forEach((raindrop) => raindrop.destroy());
    this.leaves.forEach((leaf) => leaf.destroy());

    // Clean up event listeners
    if (window.gameEvents) {
      window.gameEvents.off('restart-game');
    }

    if (this.gameManager) {
      this.gameManager.events.removeAllListeners();
    }
  }
}
