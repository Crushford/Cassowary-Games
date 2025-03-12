import { Scene } from 'phaser';
import { UIComponent } from './UIComponent';
import { Panel } from './Panel';
import { GAME_CONSTANTS } from '../../config/constants';

interface StatusBarConfig {
  width?: number;
  height?: number;
  fontSize?: string;
  textColor?: string;
  backgroundColor?: number;
}

export class StatusBar extends UIComponent {
  private panel: Panel;
  private statusText: Phaser.GameObjects.Text;
  private clearTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Scene, x: number, y: number, config: StatusBarConfig = {}) {
    super(scene, x, y);

    const {
      width = 600,
      height = 34,
      fontSize = '16px',
      textColor = '#FFD700',
      backgroundColor = GAME_CONSTANTS.COLORS.DARK_GREEN,
    } = config;

    // Create panel
    this.panel = new Panel(scene, 0, 0, {
      width,
      height,
      backgroundColor,
      alpha: 0.9,
    });

    // Create status text
    this.statusText = this.createText(0, 0, '', fontSize, textColor);
    this.statusText.setDepth(100);

    // Add components
    this.add([this.panel as unknown as Phaser.GameObjects.GameObject, this.statusText]);
  }

  public showMessage(message: string, autoHide: boolean = false, duration: number = 3000): this {
    this.statusText.setText(message);

    // Clear any existing timer
    if (this.clearTimer) {
      this.clearTimer.destroy();
      this.clearTimer = null;
    }

    // Auto-hide if requested
    if (autoHide) {
      this.clearTimer = this.scene.time.delayedCall(duration, () => {
        this.clearMessage();
        this.clearTimer = null;
      });
    }

    return this;
  }

  public clearMessage(): this {
    this.statusText.setText('');
    return this;
  }

  public setDefaultMessage(message: string): this {
    if (!this.statusText.text) {
      this.showMessage(message);
    }
    return this;
  }
}
