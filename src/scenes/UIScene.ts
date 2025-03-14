// src/scenes/UIScene.ts
import { BaseScene } from './BaseScene';
import { StateManager, GameState } from '../state/StateManager';

export class UIScene extends BaseScene {
  private stateManager: StateManager;
  private statusText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
    this.stateManager = StateManager.getInstance();
  }

  create(): void {
    // Create UI elements
    this.createStatusText();
    this.createRestartButton();

    // Setup event listeners
    this.setupEventListeners();
  }

  private createStatusText(): void {
    // Create the status text at the bottom of the screen
    this.statusText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height - 50, '', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#000000',
        align: 'center',
      })
      .setOrigin(0.5);

    // Set initial text
    this.updateStatusText(this.stateManager.getState().statusMessage || '', false);
  }

  private createRestartButton(): void {
    // Create the restart button
    this.restartButton = this.add
      .text(this.cameras.main.width - 100, 30, 'RESTART', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#000000',
        backgroundColor: '#ffffff',
        padding: { left: 10, right: 10, top: 5, bottom: 5 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        window.gameEvents.emit('restart-game');
      })
      .on('pointerover', () => {
        this.restartButton.setStyle({ color: '#ff0000' });
      })
      .on('pointerout', () => {
        this.restartButton.setStyle({ color: '#000000' });
      });
  }

  private setupEventListeners(): void {
    // Listen for status message updates
    this.stateManager.events.on('status-message', this.updateStatusText, this);

    // Listen for game state changes
    this.stateManager.events.on('state-changed', this.onGameStateChanged, this);
  }

  private updateStatusText(message: string, isError: boolean = false): void {
    if (!this.statusText) return;

    this.statusText.setText(message);
    this.statusText.setStyle({
      color: isError ? '#ff0000' : '#000000',
    });
  }

  private onGameStateChanged(newState: GameState, oldState: GameState): void {
    // Show game over dialog if needed
    if (newState === GameState.GAME_OVER_SUCCESS) {
      this.showGameOverDialog('Victory!', 'Your honey pot ant colony thrives!', true);
    } else if (newState === GameState.GAME_OVER_FAILURE) {
      this.showGameOverDialog('Game Over', 'Your colony has failed!', false);
    }
  }

  private showGameOverDialog(title: string, message: string, isVictory: boolean): void {
    // Create the dialog background
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 0.7);
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    // Create the dialog box
    const dialogWidth = 400;
    const dialogHeight = 250;
    const dialogX = (this.cameras.main.width - dialogWidth) / 2;
    const dialogY = (this.cameras.main.height - dialogHeight) / 2;

    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 16);
    graphics.lineStyle(4, isVictory ? 0x00ff00 : 0xff0000);
    graphics.strokeRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 16);

    // Create the title text
    this.add
      .text(this.cameras.main.width / 2, dialogY + 50, title, {
        fontFamily: 'Arial',
        fontSize: '32px',
        fontStyle: 'bold',
        color: isVictory ? '#00ff00' : '#ff0000',
      })
      .setOrigin(0.5);

    // Create the message text
    this.add
      .text(this.cameras.main.width / 2, dialogY + 100, message, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#000000',
      })
      .setOrigin(0.5);

    // Create the restart button
    this.add
      .text(this.cameras.main.width / 2, dialogY + 170, 'PLAY AGAIN', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        window.gameEvents.emit('restart-game');
        graphics.destroy();
      });
  }

  shutdown(): void {
    // Remove event listeners
    this.stateManager.events.off('status-message', this.updateStatusText, this);
    this.stateManager.events.off('state-changed', this.onGameStateChanged, this);
  }
}
