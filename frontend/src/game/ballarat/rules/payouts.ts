export function clampBet(amount: number, minBet: number, maxBet: number): number {
  return Math.max(minBet, Math.min(maxBet, Math.floor(amount)));
}

export function getAllowedMaxBet(bank: number, maxBet: number): number {
  return Math.min(maxBet, Math.max(0, bank));
}

export function canAffordBet(bank: number, bet: number): boolean {
  return bank >= bet;
}

export function getPayout(cardValue: number, bet: number): number {
  return cardValue * bet;
}
