// src/components/AntGameUI.ts
import Phaser from 'phaser';
import { GameResources } from './GameResources';

export class AntGameUI {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Text;
  private scoreBackground!: Phaser.GameObjects.Rectangle;
  private statusBackground!: Phaser.GameObjects.Rectangle;
  private gameOverPanel!: Phaser.GameObjects.Rectangle;
  private resourcesPanel!: Phaser.GameObjects.Rectangle;
  private resourcesText!: Phaser.GameObjects.Text;
  private resources: GameResources;
  private titleText!: Phaser.GameObjects.Text;
  private statusClearTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, resources: GameResources) {
    this.scene = scene;
    this.resources = resources;
    this.createUI();
  }

  private createUI(): void {
    // Create title text
    this.titleText = this.scene.add
      .text(this.scene.cameras.main.width / 2, 15, 'HONEY POT ANT COLONY', {
        fontSize: '28px',
        fontFamily: 'Georgia',
        color: '#FFD700', // Gold color
        stroke: '#006400', // Dark green stroke
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000', fill: true, blur: 5 },
      })
      .setOrigin(0.5, 0)
      .setDepth(100);

    // Create status text with more space below the title
    this.statusBackground = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      70,
      600,
      34,
      0x006400, // Dark green
      0.9
    );
    this.statusBackground.setStrokeStyle(2, 0xffd700); // Gold border
    this.statusBackground.setDepth(90);

    this.statusText = this.scene.add
      .text(
        this.scene.cameras.main.width / 2,
        70,
        'Place honey pot queens strategically to build your colony!',
        {
          fontSize: '16px',
          fontFamily: 'Georgia',
          color: '#FFD700', // Gold text
          stroke: '#000',
          strokeThickness: 1,
          align: 'center',
        }
      )
      .setOrigin(0.5, 0.5)
      .setDepth(100);

    // Create resources panel background with rainforest styling - moved to the left
    this.resourcesPanel = this.scene.add.rectangle(130, 160, 250, 130, 0x006400, 0.9);
    this.resourcesPanel.setStrokeStyle(3, 0xffd700); // Gold border
    this.resourcesPanel.setDepth(90);

    // Create resources text moved to match the panel
    this.resourcesText = this.scene.add.text(20, 110, this.formatResourcesText(), {
      fontSize: '16px',
      fontFamily: 'Georgia',
      color: '#FFD700', // Gold text
      stroke: '#000',
      strokeThickness: 1,
    });
    this.resourcesText.setDepth(100);

    // Create score display near the top-right
    this.scoreBackground = this.scene.add.rectangle(
      this.scene.cameras.main.width - 110,
      70,
      200,
      34,
      0x006400, // Dark green
      0.9
    );
    this.scoreBackground.setStrokeStyle(2, 0xffd700); // Gold border
    this.scoreBackground.setDepth(90);

    this.scoreText = this.scene.add
      .text(this.scene.cameras.main.width - 110, 70, 'Queens: 0', {
        fontSize: '18px',
        fontFamily: 'Georgia',
        color: '#FFD700', // Gold text
        stroke: '#000',
        strokeThickness: 1,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(100);

    // Create panel for game over content with rainforest styling
    this.gameOverPanel = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      500,
      250,
      0x006400, // Dark green
      0.9
    );
    this.gameOverPanel.setStrokeStyle(6, 0xffd700); // Thicker gold border
    this.gameOverPanel.setDepth(180);
    this.gameOverPanel.setVisible(false);

    // Create game over text
    this.gameOverText = this.scene.add
      .text(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2 - 30, '', {
        fontSize: '36px',
        fontFamily: 'Georgia',
        color: '#FFD700', // Gold text
        stroke: '#000',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(200);

    // Create restart button with rainforest styling
    this.restartButton = this.scene.add
      .text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 + 60,
        'New Colony',
        {
          fontSize: '24px',
          fontFamily: 'Georgia',
          color: '#FFD700', // Gold text
          backgroundColor: '#228B22', // Forest green button
          padding: { x: 20, y: 10 },
          stroke: '#000',
          strokeThickness: 1,
          shadow: { offsetX: 2, offsetY: 2, color: '#000', fill: true },
        }
      )
      .setOrigin(0.5)
      .setInteractive()
      .setVisible(false)
      .setDepth(200);

    // Add hover effect to restart button
    this.restartButton.on('pointerover', () => {
      this.restartButton.setBackgroundColor('#32CD32'); // Lighter green on hover
    });
    this.restartButton.on('pointerout', () => {
      this.restartButton.setBackgroundColor('#228B22'); // Back to original color
    });
  }

  public setupRestartButton(callback: () => void): void {
    this.restartButton.on('pointerdown', callback);
  }

  public updateScore(score: number): void {
    this.scoreText.setText(`Queens: ${score}`);
  }

  public updateStatusText(message: string, autoHide: boolean = false): void {
    this.statusText.setText(message);

    // Clear any existing timer
    if (this.statusClearTimer) {
      this.statusClearTimer.destroy();
      this.statusClearTimer = null;
    }

    // Auto-hide status text after a delay if requested
    if (autoHide) {
      this.statusClearTimer = this.scene.time.delayedCall(3000, () => {
        this.statusText.setText('Place honey pot queens strategically to build your colony!');
        this.statusClearTimer = null;
      });
    }
  }

  public formatResourcesText(): string {
    return (
      `Plots: ${this.resources.getPlots()}\n` +
      `Land Area: ${this.resources.getOwnedAcres()}/${this.resources.getTotalAcres()} m²\n` +
      `Honey Pot Queens: ${this.resources.getQueens()}\n` +
      `Gold Coins: ${this.resources.getGold()}`
    );
  }

  public updateResources(): void {
    this.resourcesText.setText(this.formatResourcesText());
  }

  public showGameOver(success: boolean, score: number): void {
    if (success) {
      this.gameOverText.setText(`Colony Thriving!\nYou placed ${score} queens`);
      this.gameOverText.setColor('#FFD700'); // Gold text for success
    } else {
      this.gameOverText.setText(
        `Colony Failed!\nQueens attacked by soldier ants\nHarvested Honey: ${score * 3}ml`
      );
      this.gameOverText.setColor('#FF6347'); // Tomato color for failure
    }

    this.gameOverPanel.setVisible(true);
    this.gameOverText.setVisible(true);
    this.restartButton.setVisible(true);
  }

  public hideGameOver(): void {
    this.gameOverPanel.setVisible(false);
    this.gameOverText.setVisible(false);
    this.restartButton.setVisible(false);
    this.statusText.setText('Place honey pot queens strategically to build your colony!');
  }
}
