import { GameResources } from './StateManager';
import { GAME_CONSTANTS } from '../config/constants';
import { StateManager } from './StateManager';

export class ResourceManager {
  private stateManager: StateManager;

  constructor() {
    this.stateManager = StateManager.getInstance();
  }

  // Get current resources
  public getResources(): GameResources {
    return this.stateManager.getState().resources;
  }

  // Initialize resources
  public resetResources(): void {
    this.stateManager.updateResources({
      queens: GAME_CONSTANTS.INITIAL_QUEENS,
      gold: GAME_CONSTANTS.INITIAL_GOLD,
      acres: GAME_CONSTANTS.OWNED_ACRES,
      plots: GAME_CONSTANTS.PLOTS,
    });
  }

  // Update a specific resource
  public updateResource(
    resourceName: keyof GameResources,
    amount: number,
    isIncrement: boolean = false
  ): boolean {
    const currentResources = this.getResources();
    const newValue = isIncrement ? currentResources[resourceName] + amount : amount;

    // Check if the update is valid (no negative values)
    if (newValue < 0) {
      return false;
    }

    // Update the resource
    this.stateManager.updateResources({
      [resourceName]: newValue,
    } as Partial<GameResources>);

    return true;
  }

  // Spend a queen (decrement by 1)
  public spendQueen(): boolean {
    return this.updateResource('queens', -1, true);
  }

  // Refund a queen (increment by 1)
  public refundQueen(): void {
    this.updateResource('queens', 1, true);
  }

  // Purchase a queen with gold
  public purchaseQueen(cost: number): boolean {
    if (this.getResources().gold < cost) {
      return false;
    }

    // First spend gold
    const goldSpent = this.updateResource('gold', -cost, true);
    if (!goldSpent) {
      return false;
    }

    // Then add a queen
    this.updateResource('queens', 1, true);
    return true;
  }

  // Check if there are enough queens
  public hasQueensAvailable(): boolean {
    return this.getResources().queens > 0;
  }

  // Check if there is enough gold
  public hasEnoughGold(amount: number): boolean {
    return this.getResources().gold >= amount;
  }
}
