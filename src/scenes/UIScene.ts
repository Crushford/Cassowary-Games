// src/scenes/UIScene.ts
import { BaseScene } from './BaseScene';
import { GAME_CONSTANTS } from '../config/constants';
import { GameState } from '../managers/GameManager';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { StatusBar } from '../components/ui/StatusBar';

export class UIScene extends BaseScene {
  private scoreText!: Phaser.GameObjects.Text;
  private statusBar!: StatusBar;
  private gameOverPanel!: Panel;
  private resourcesPanel!: Panel;
  private resourcesText!: Phaser.GameObjects.Text;

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
    // Create title panel
    const titlePanel = new Panel(this, this.cameras.main.width / 2, 15, {
      width: this.cameras.main.width,
      height: 40,
      backgroundColor: 0xffffff,
      alpha: 1.0,
    });

    // Create title text
    const titleText = this.createText(
      0,
      0,
      'HONEY POT ANT COLONY',
      '28px',
      '#000000',
      '#000000',
      1
    );
    titlePanel.addContent(titleText);

    // Create score panel
    const scorePanel = new Panel(this, this.cameras.main.width - 110, 70, {
      width: 200,
      height: 34,
      backgroundColor: 0xffffff,
      alpha: 1.0,
    });

    // Create score text
    this.scoreText = this.createText(0, 0, 'Queens: 0', '18px', '#000000', '#000000', 1);
    scorePanel.addContent(this.scoreText);
  }

  private createStatusBar(): void {
    this.statusBar = new StatusBar(this, this.cameras.main.width / 2, 70, {
      width: 600,
      height: 34,
      fontSize: '16px',
      textColor: '#000000',
      backgroundColor: 0xffffff,
    });

    this.statusBar.setDefaultMessage('Place honey pot queens strategically to build your colony!');
  }

  private createResourcesPanel(): void {
    this.resourcesPanel = new Panel(this, 130, 160, {
      width: 250,
      height: 130,
      backgroundColor: GAME_CONSTANTS.COLORS.DARK_GREEN,
      alpha: 0.9,
    });

    // Create resources text
    this.resourcesText = this.createText(
      0,
      0,
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

    this.resourcesPanel.addContent(this.resourcesText);
  }

  private createGameOverPanel(): void {
    // Create main panel
    this.gameOverPanel = new Panel(
      this,
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      {
        width: 500,
        height: 250,
        backgroundColor: GAME_CONSTANTS.COLORS.DARK_GREEN,
        alpha: 0.9,
      }
    );

    // Create game over text
    const gameOverText = this.createText(0, -30, '', '36px', '#FFD700', '#000000', 4);

    // Create restart button
    const restartButton = new Button(
      this,
      0,
      60,
      'New Colony',
      () => {
        if (window.gameEvents) {
          window.gameEvents.emit('restart-game');
        }
      },
      {
        width: 200,
        height: 50,
        fontSize: '24px',
        backgroundColor: GAME_CONSTANTS.COLORS.FOREST_GREEN,
        textColor: '#FFD700',
        strokeColor: GAME_CONSTANTS.COLORS.GOLD,
      }
    );

    // Add elements to panel
    this.gameOverPanel.addContent([gameOverText, restartButton]);

    // Store reference for later access
    this.gameOverPanel.setData('gameOverText', gameOverText);

    // Hide initially
    this.gameOverPanel.setVisible(false);
  }

  private setupEventListeners(): void {
    if (window.gameEvents) {
      // Status message updates
      window.gameEvents.on('status-message', (message: string, autoHide: boolean = false) => {
        this.statusBar.showMessage(message, autoHide);
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

  private updateScore(count: number): void {
    this.scoreText.setText(`Queens: ${count}`);
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
