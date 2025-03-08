// src/components/AntGameUI.ts
import Phaser from 'phaser';

export class AntGameUI {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI(): void {
    // Create score text
    this.scoreText = this.scene.add.text(16, 16, 'Queens Placed: 0', {
      fontSize: '24px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 4,
    });

    this.statusText = this.scene.add.text(
      16,
      50,
      'Place queens - none can share row, column, or diagonal',
      {
        fontSize: '16px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 2,
      }
    );

    // Game over text (hidden initially)
    this.gameOverText = this.scene.add
      .text(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, '', {
        fontSize: '36px',
        color: '#ff0000',
        stroke: '#000',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Restart button (hidden initially)
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
      .setVisible(false);
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

    this.gameOverText.setVisible(true);
    this.restartButton.setVisible(true);
  }

  public hideGameOver(): void {
    this.gameOverText.setVisible(false);
    this.restartButton.setVisible(false);
    this.statusText.setText('Place queens - none can share row, column, or diagonal');
  }
}
