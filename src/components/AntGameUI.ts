// src/components/AntGameUI.ts
import Phaser from 'phaser';

export class AntGameUI {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Text;
  private scoreBackground!: Phaser.GameObjects.Rectangle;
  private statusBackground!: Phaser.GameObjects.Rectangle;
  private gameOverPanel!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI(): void {
    // Create background for score text
    this.scoreBackground = this.scene.add.rectangle(
      110, // Positioned to encompass the text
      26,
      220,
      40,
      0x000000,
      0.7 // Semi-transparent
    );
    this.scoreBackground.setDepth(90);

    // Create score text
    this.scoreText = this.scene.add.text(16, 16, 'Queens Placed: 0', {
      fontSize: '24px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 2,
    });
    this.scoreText.setDepth(100);

    // Create background for status text
    this.statusBackground = this.scene.add.rectangle(
      290, // Positioned to encompass the text
      50,
      580,
      30,
      0x000000,
      0.7 // Semi-transparent
    );
    this.statusBackground.setDepth(90);

    // Create status text
    this.statusText = this.scene.add.text(
      16,
      42,
      'Place queens - none can share row, column, or diagonal',
      {
        fontSize: '16px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 1,
      }
    );
    this.statusText.setDepth(100);

    // Create panel for game over content
    this.gameOverPanel = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      500,
      200,
      0x000000,
      0.8
    );
    this.gameOverPanel.setDepth(180);
    this.gameOverPanel.setVisible(false);

    // Create game over text
    this.gameOverText = this.scene.add
      .text(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, '', {
        fontSize: '36px',
        color: '#ff0000',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(200);

    // Create restart button
    this.restartButton = this.scene.add
      .text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 + 60,
        'Restart Game',
        {
          fontSize: '24px',
          color: '#fff',
          backgroundColor: '#1a5e1a',
          padding: { x: 20, y: 10 },
        }
      )
      .setOrigin(0.5)
      .setInteractive()
      .setVisible(false)
      .setDepth(200);
  }

  public setupRestartButton(callback: () => void): void {
    this.restartButton.on('pointerdown', callback);
  }

  public updateScore(score: number): void {
    this.scoreText.setText(`Queens Placed: ${score}`);
  }

  public showGameOver(success: boolean, score: number): void {
    if (success) {
      this.gameOverText.setText(`Level Complete!\nYou placed ${score} queens`);
      this.gameOverText.setColor('#00ff00');
    } else {
      this.gameOverText.setText(
        `Game Over!\nQueens cannot attack each other\nFinal Score: ${score}`
      );
      this.gameOverText.setColor('#ff0000');
    }

    this.gameOverPanel.setVisible(true);
    this.gameOverText.setVisible(true);
    this.restartButton.setVisible(true);
  }

  public hideGameOver(): void {
    this.gameOverPanel.setVisible(false);
    this.gameOverText.setVisible(false);
    this.restartButton.setVisible(false);
    this.statusText.setText('Place queens - none can share row, column, or diagonal');
  }
}
