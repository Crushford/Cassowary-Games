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

  constructor(scene: Phaser.Scene, resources: GameResources) {
    this.scene = scene;
    this.resources = resources;
    this.createUI();
  }

  private createUI(): void {
    // Create title text
    this.titleText = this.scene.add
      .text(this.scene.cameras.main.width / 2, 10, 'HONEY POT ANT COLONY', {
        fontSize: '28px',
        fontFamily: 'Georgia',
        color: '#FFD700', // Gold color
        stroke: '#006400', // Dark green stroke
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000', fill: true, blur: 5 },
      })
      .setOrigin(0.5, 0)
      .setDepth(100);

    // Create resources panel background with rainforest styling
    this.resourcesPanel = this.scene.add.rectangle(120, 100, 240, 130, 0x006400, 0.8); // Dark green bg
    this.resourcesPanel.setStrokeStyle(3, 0xffd700); // Gold border
    this.resourcesPanel.setDepth(90);

    // Create resources text
    this.resourcesText = this.scene.add.text(16, 80, this.formatResourcesText(), {
      fontSize: '16px',
      fontFamily: 'Georgia',
      color: '#FFD700', // Gold text
      stroke: '#000',
      strokeThickness: 1,
    });
    this.resourcesText.setDepth(100);

    // Create background for score text with rainforest styling
    this.scoreBackground = this.scene.add.rectangle(
      110,
      46,
      220,
      50,
      0x006400, // Dark green
      0.8
    );
    this.scoreBackground.setStrokeStyle(2, 0xffd700); // Gold border
    this.scoreBackground.setDepth(90);

    // Create score text
    this.scoreText = this.scene.add.text(16, 36, 'Queens Placed: 0', {
      fontSize: '24px',
      fontFamily: 'Georgia',
      color: '#FFD700', // Gold text
      stroke: '#000',
      strokeThickness: 2,
    });
    this.scoreText.setDepth(100);

    // Create background for status text
    this.statusBackground = this.scene.add.rectangle(
      290,
      50,
      580,
      30,
      0x006400, // Dark green
      0.8
    );
    this.statusBackground.setStrokeStyle(2, 0xffd700); // Gold border
    this.statusBackground.setDepth(90);

    // Create status text
    this.statusText = this.scene.add.text(
      16,
      42,
      'Place honey pot queens - soldiers will attack any queen in their path!',
      {
        fontSize: '16px',
        fontFamily: 'Georgia',
        color: '#FFD700', // Gold text
        stroke: '#000',
        strokeThickness: 1,
      }
    );
    this.statusText.setDepth(100);

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
    this.scoreText.setText(`Queens Placed: ${score}`);
  }

  public updateStatusText(message: string): void {
    this.statusText.setText(message);
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
    this.statusText.setText(
      'Place honey pot queens - soldiers will attack any queen in their path!'
    );
  }
}
