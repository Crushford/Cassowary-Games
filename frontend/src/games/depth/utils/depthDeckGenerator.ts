export type RiskProfile = 'single' | 'twenty' | 'forty';

export interface GenerateDeckOptions {
  deckSize: number;
  average?: number; // default = 1
  riskProfile: RiskProfile;
}

export interface GeneratedDeck {
  cards: number[];
  riskProfile: RiskProfile;
  backingColor: string;
}

export function generateDeck({
  deckSize,
  average = 1,
  riskProfile,
}: GenerateDeckOptions): number[] {
  if (deckSize <= 0) {
    throw new Error('deckSize must be > 0');
  }

  if (deckSize % 5 !== 0) {
    throw new Error('deckSize must be a multiple of 5');
  }

  const totalValue = deckSize * average;

  let activeCardCount: number;

  switch (riskProfile) {
    case 'single':
      activeCardCount = 1;
      break;
    case 'twenty':
      activeCardCount = deckSize * 0.2;
      break;
    case 'forty':
      activeCardCount = deckSize * 0.4;
      break;
    default:
      throw new Error(`Unknown risk profile: ${riskProfile}`);
  }

  activeCardCount = Math.max(1, Math.floor(activeCardCount));

  const baseValue = Math.floor(totalValue / activeCardCount);
  let remainder = totalValue % activeCardCount;

  const activeValues: number[] = [];

  for (let i = 0; i < activeCardCount; i++) {
    let value = baseValue;
    if (remainder > 0) {
      value += 1;
      remainder--;
    }
    activeValues.push(value);
  }

  const zeros = new Array(deckSize - activeCardCount).fill(0);

  return [...activeValues, ...zeros];
}

function getBackingColor(riskProfile: RiskProfile): string {
  switch (riskProfile) {
    case 'single':
      return 'red';
    case 'twenty':
      return 'orange';
    case 'forty':
      return 'blue';
  }
}

export function generateDeckWithStyle(options: GenerateDeckOptions): GeneratedDeck {
  const cards = generateDeck(options);
  const backingColor = getBackingColor(options.riskProfile);

  return {
    cards,
    riskProfile: options.riskProfile,
    backingColor,
  };
}
