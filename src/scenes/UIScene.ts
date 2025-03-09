// src/scenes/UIScene.ts
import { BaseScene } from './BaseScene';
import { GAME_CONSTANTS } from '../config/constants';
import { GameState } from '../managers/GameManager';

export class UIScene extends BaseScene {
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private gameOverPanel!: Phaser.GameObjects.Container;
  private resourcesPanel!: Phaser.GameObjects.Container;
  private resourcesText!: Phaser.GameObjects.Text;
  private statusClearTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('UIScene');
  }

  create(): void {
    // Create UI elements
    this.createHeader();
    this.createStatusBar();
    this.createResourcesPanel();
    this.createGameOverPanel();

    // Set up event listeners
    this.setupEventListeners();
  }

  private createHeader(): void {
    // Create title text
    const titleText = this.createText(
      this.cameras.main.width / 2,
      15,
      'HONEY POT ANT COLONY',
      '28px',
      '#FFD700',
      '#006400',
      4
    );
    titleText.setShadow(2, 2, '#000000', 5, true);
    titleText.setDepth(100);

    // Create score display in top right
    const scoreBackground = this.add.rectangle(
      this.cameras.main.width - 110,
      70,
      200,
      34,
      GAME_CONSTANTS.COLORS.DARK_GREEN,
      0.9
    );
    scoreBackground.setStrokeStyle(2, GAME_CONSTANTS.COLORS.GOLD);
    scoreBackground.setDepth(90);

    this.scoreText = this.createText(
      this.cameras.main.width - 110,
      70,
      'Queens: 0',
      '18px',
      '#FFD700',
      '#000000',
      1
    );
    this.scoreText.setDepth(100);
  }

  private createStatusBar(): void {
    // Create status text with more space below the title
    const statusBackground = this.add.rectangle(
      this.cameras.main.width / 2,
      70,
      600,
      34,
      GAME_CONSTANTS.COLORS.DARK_GREEN,
      0.9
    );
    statusBackground.setStrokeStyle(2, GAME_CONSTANTS.COLORS.GOLD);
    statusBackground.setDepth(90);

    this.statusText = this.createText(
      this.cameras.main.width / 2,
      70,
      'Place honey pot queens strategically to build your colony!',
      '16px',
      '#FFD700',
      '#000000',
      1
    );
    this.statusText.setDepth(100);
  }

  private createResourcesPanel(): void {
    // Create resources panel container
    this.resourcesPanel = this.add.container(0, 0);
    this.resourcesPanel.setDepth(90);

    // Create resources panel background
    const background = this.add.rectangle(
      130,
      160,
      250,
      130,
      GAME_CONSTANTS.COLORS.DARK_GREEN,
      0.9
    );
    background.setStrokeStyle(3, GAME_CONSTANTS.COLORS.GOLD);

    // Create resources text
    this.resourcesText = this.createText(
      20,
      110,
      this.formatResourcesText({
        queens: GAME_CONSTANTS.INITIAL_QUEENS,
        gold: GAME_CONSTANTS.INITIAL_GOLD,
        acres: GAME_CONSTANTS.OWNED_ACRES,
        plots: GAME_CONSTANTS.PLOTS,
      }),
      '16px',
      '#FFD700',
      '#000000',
      1
    );
    this.resourcesText.setOrigin(0, 0);
    this.resourcesText.setDepth(100);

    // Add elements to panel
    this.resourcesPanel.add([background, this.resourcesText]);
  }

  private createGameOverPanel(): void {
    // Create panel for game over content
    this.gameOverPanel = this.add.container(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2
    );
    this.gameOverPanel.setDepth(200);

    // Create panel background
    const panel = this.add.rectangle(0, 0, 500, 250, GAME_CONSTANTS.COLORS.DARK_GREEN, 0.9);
    panel.setStrokeStyle(6, GAME_CONSTANTS.COLORS.GOLD);

    // Create game over text
    const gameOverText = this.createText(0, -30, '', '36px', '#FFD700', '#000000', 4);

    // Create restart button
    const restartButton = this.add.container(0, 60);

    const buttonBg = this.add.rectangle(0, 0, 200, 50, GAME_CONSTANTS.COLORS.FOREST_GREEN);
    buttonBg.setStrokeStyle(2, GAME_CONSTANTS.COLORS.GOLD);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.createText(0, 0, 'New Colony', '24px', '#FFD700', '#000000', 1);

    // Add hover effect
    buttonBg.on('pointerover', () => {
      buttonBg.fillColor = GAME_CONSTANTS.COLORS.LIGHT_GREEN;
    });

    buttonBg.on('pointerout', () => {
      buttonBg.fillColor = GAME_CONSTANTS.COLORS.FOREST_GREEN;
    });

    // Restart game on click
    buttonBg.on('pointerdown', () => {
      if (window.gameEvents) {
        window.gameEvents.emit('restart-game');
      }
    });

    restartButton.add([buttonBg, buttonText]);

    // Add elements to panel
    this.gameOverPanel.add([panel, gameOverText, restartButton]);

    // Store references for later access
    this.gameOverPanel.setData('gameOverText', gameOverText);

    // Hide initially
    this.gameOverPanel.setVisible(false);
  }

  private setupEventListeners(): void {
    // Get references to game scene and manager
    const gameScene = this.scene.get('GameScene');

    if (gameScene && window.gameEvents) {
      // Status message updates
      window.gameEvents.on('status-message', (message: string, autoHide: boolean = false) => {
        this.updateStatusText(message, autoHide);
      });

      // Queen count updates
      window.gameEvents.on('queen-placed', (count: number) => {
        this.updateScore(count);
      });

      // Resource updates
      window.gameEvents.on('resources-updated', (resources: any) => {
        this.updateResources(resources);
      });

      // Game state changes
      window.gameEvents.on('state-changed', (state: GameState) => {
        if (state === GameState.GAME_OVER_SUCCESS || state === GameState.GAME_OVER_FAILURE) {
          this.scene.get('GameScene').events.once('game-over', (data: any) => {
            this.showGameOver(state === GameState.GAME_OVER_SUCCESS, data.score);
          });
        }
      });

      // Game restart
      window.gameEvents.on('game-restarted', () => {
        this.hideGameOver();
      });
    }
  }

  private updateStatusText(message: string, autoHide: boolean = false): void {
    this.statusText.setText(message);

    // Clear any existing timer
    if (this.statusClearTimer) {
      this.statusClearTimer.destroy();
      this.statusClearTimer = null;
    }

    // Auto-hide status text after a delay if requested
    if (autoHide) {
      this.statusClearTimer = this.time.delayedCall(3000, () => {
        this.statusText.setText('Place honey pot queens strategically to build your colony!');
        this.statusClearTimer = null;
      });
    }
  }

  private updateScore(count: number): void {
    this.scoreText.setText(`Queens: ${count}`);

    // Also broadcast to main app
    if (window.gameEvents) {
      window.gameEvents.emit('queen-placed', count);
    }
  }

  private formatResourcesText(resources: any): string {
    return (
      `Plots: ${resources.plots}\n` +
      `Land Area: ${resources.acres}/${GAME_CONSTANTS.TOTAL_ACRES} m²\n` +
      `Honey Pot Queens: ${resources.queens}\n` +
      `Gold Coins: ${resources.gold}`
    );
  }

  private updateResources(resources: any): void {
    this.resourcesText.setText(this.formatResourcesText(resources));
  }

  private showGameOver(success: boolean, score: number): void {
    const gameOverText = this.gameOverPanel.getData('gameOverText') as Phaser.GameObjects.Text;

    if (success) {
      gameOverText.setText(`Colony Thriving!\nYou placed ${score} queens`);
      gameOverText.setColor('#FFD700');
    } else {
      gameOverText.setText(
        `Colony Failed!\nQueens attacked by soldier ants\nHarvested Honey: ${score * 3}ml`
      );
      gameOverText.setColor('#FF6347');
    }

    this.gameOverPanel.setVisible(true);
  }

  private hideGameOver(): void {
    this.gameOverPanel.setVisible(false);
  }
}
