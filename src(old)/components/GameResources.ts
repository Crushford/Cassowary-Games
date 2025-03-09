// src/components/GameResources.ts
export class GameResources {
  private plots: number = 5;
  private totalAcres: number = 36; // 6x6 grid of 1m² each
  private ownedAcres: number = 5;
  private queens: number = 30;
  private gold: number = 30; // Gold coins (1g each)

  constructor() {}

  public getPlots(): number {
    return this.plots;
  }

  public getOwnedAcres(): number {
    return this.ownedAcres;
  }

  public getTotalAcres(): number {
    return this.totalAcres;
  }

  public getQueens(): number {
    return this.queens;
  }

  public getGold(): number {
    return this.gold;
  }

  public useQueen(): boolean {
    if (this.queens > 0) {
      this.queens--;
      return true;
    }
    return false;
  }

  public returnQueen(): void {
    this.queens++;
  }

  public addAcre(): void {
    if (this.ownedAcres < this.totalAcres) {
      this.ownedAcres++;
    }
  }

  public resetResources(): void {
    this.plots = 5;
    this.ownedAcres = 5;
    this.queens = 30;
    this.gold = 30;
  }
}
