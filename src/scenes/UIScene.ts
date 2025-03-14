// src/scenes/UIScene.ts
import { BaseScene } from './BaseScene';
import { StateManager, GameState, GameResources } from '../state/StateManager';
import { Button } from '../components/ui/Button';
import { StatusMessage } from '../components/ui/StatusMessage';
import { ResourceDisplay } from '../components/ui/ResourceDisplay';
import { Dialog } from '../components/ui/Dialog';
import { GAME_CONSTANTS } from '../config/constants';

export class UIScene extends BaseScene {
  private stateManager: StateManager;
  private statusMessage!: StatusMessage;
  private restartButton!: Button;
  private resourceDisplay!: ResourceDisplay;
  private topBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('UIScene');
    this.stateManager = StateManager.getInstance();
  }

  create(): void {
    // Create UI elements using our new components
    this.createTopBar();
    this.createResourceDisplay();
    this.createStatusMessage();
    this.createRestartButton();

    // Setup event listeners
    this.setupEventListeners();
  }

  private createTopBar(): void {
    // Create top bar for game information
    this.topBar = this.add.graphics();
    this.topBar.fillStyle(GAME_CONSTANTS.COLORS.BG_SECONDARY, 1);
    this.topBar.fillRect(0, 0, this.cameras.main.width, GAME_CONSTANTS.UI.LAYOUT.TOP_BAR_HEIGHT);

    // Add a thin border at the bottom of the top bar
    this.topBar.lineStyle(2, GAME_CONSTANTS.COLORS.BORDER, 1);
    this.topBar.lineBetween(
      0,
      GAME_CONSTANTS.UI.LAYOUT.TOP_BAR_HEIGHT,
      this.cameras.main.width,
      GAME_CONSTANTS.UI.LAYOUT.TOP_BAR_HEIGHT
    );
  }

  private createResourceDisplay(): void {
    // Create resource display in the top bar, centered
    this.resourceDisplay = new ResourceDisplay(this, {
      x: 20,
      y: 30, // Position in the middle of the top bar
      width: this.cameras.main.width - 140, // Leave space for restart button
      horizontalLayout: true, // Use horizontal layout for mobile
      borderRadius: 8, // Rounded corners for mobile style
    });

    // Initial resource values
    this.updateResourceDisplay(this.stateManager.getState().resources);
  }

  private createStatusMessage(): void {
    // Create the status message at the bottom of the screen
    const bottomPosition =
      this.cameras.main.height - GAME_CONSTANTS.UI.LAYOUT.BOTTOM_BAR_HEIGHT + 15;

    this.statusMessage = new StatusMessage(this, {
      x: (this.cameras.main.width - GAME_CONSTANTS.UI.STATUS.DEFAULT_WIDTH) / 2,
      y: bottomPosition,
      width: GAME_CONSTANTS.UI.STATUS.DEFAULT_WIDTH,
      height: GAME_CONSTANTS.UI.STATUS.DEFAULT_HEIGHT,
      backgroundColor: GAME_CONSTANTS.COLORS.BG_SECONDARY,
    });

    // Set initial text if exists
    const initialMessage = this.stateManager.getState().statusMessage;
    if (initialMessage) {
      this.statusMessage.setMessage(initialMessage);
    }

    // Add a background bar for the bottom section
    const bottomBar = this.add.graphics();
    bottomBar.fillStyle(GAME_CONSTANTS.COLORS.BG_SECONDARY, 1);
    bottomBar.fillRect(
      0,
      this.cameras.main.height - GAME_CONSTANTS.UI.LAYOUT.BOTTOM_BAR_HEIGHT,
      this.cameras.main.width,
      GAME_CONSTANTS.UI.LAYOUT.BOTTOM_BAR_HEIGHT
    );

    // Add a thin border at the top of the bottom bar
    bottomBar.lineStyle(2, GAME_CONSTANTS.COLORS.BORDER, 1);
    bottomBar.lineBetween(
      0,
      this.cameras.main.height - GAME_CONSTANTS.UI.LAYOUT.BOTTOM_BAR_HEIGHT,
      this.cameras.main.width,
      this.cameras.main.height - GAME_CONSTANTS.UI.LAYOUT.BOTTOM_BAR_HEIGHT
    );

    // Move the status message to be above the bottom bar graphics so it's visible
    this.statusMessage.getContainer().setDepth(1);
  }

  private createRestartButton(): void {
    // Create the restart button in the top bar
    this.restartButton = new Button(
      this,
      {
        x: this.cameras.main.width - 80,
        y: GAME_CONSTANTS.UI.LAYOUT.TOP_BAR_HEIGHT / 2,
        text: 'RESTART',
        width: 100,
        height: 36,
      },
      () => {
        window.gameEvents.emit('restart-game');
      }
    );
  }

  private setupEventListeners(): void {
    // Listen for status message updates
    this.stateManager.events.on('status-message', this.updateStatusMessage, this);

    // Listen for game state changes
    this.stateManager.events.on('state-changed', this.onGameStateChanged, this);

    // Listen for resource updates
    this.stateManager.events.on('resources-updated', this.updateResourceDisplay, this);
  }

  private updateStatusMessage(message: string, isError: boolean = false): void {
    if (!this.statusMessage) return;
    this.statusMessage.setMessage(message, isError);
  }

  private updateResourceDisplay(resources: GameResources): void {
    if (!this.resourceDisplay) return;

    // Format resources for display
    const resourceData: Record<string, string | number> = {
      Queens: resources.queens,
      Gold: resources.gold,
      Acres: `${resources.acres}/${GAME_CONSTANTS.TOTAL_ACRES}`,
      Plots: resources.plots,
    };

    this.resourceDisplay.setResources(resourceData);
  }

  private onGameStateChanged(newState: GameState, oldState: GameState): void {
    // Show game over dialog if needed
    if (newState === GameState.GAME_OVER_SUCCESS) {
      this.showGameOverDialog('Victory!', 'Your honey pot ant colony thrives!', true);
    } else if (newState === GameState.GAME_OVER_FAILURE) {
      this.showGameOverDialog('Game Over', 'Your colony has failed!', false);
    }
  }

  private showGameOverDialog(title: string, message: string, isSuccess: boolean): void {
    // Create a dialog directly
    const dialog = new Dialog(this, {
      borderColor: GAME_CONSTANTS.COLORS.SECONDARY,
    });

    dialog.showMessageDialog(title, message, 'PLAY AGAIN', () => {
      window.gameEvents.emit('restart-game');
    });
  }

  shutdown(): void {
    // Clean up components
    this.resourceDisplay.destroy();
    this.statusMessage.destroy();
    this.restartButton.destroy();

    // Remove event listeners
    this.stateManager.events.off('status-message', this.updateStatusMessage, this);
    this.stateManager.events.off('state-changed', this.onGameStateChanged, this);
    this.stateManager.events.off('resources-updated', this.updateResourceDisplay, this);
  }
}
