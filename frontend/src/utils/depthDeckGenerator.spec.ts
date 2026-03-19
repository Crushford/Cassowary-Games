import { describe, expect, it } from 'vitest';
import { generateDeck, generateDeckWithStyle } from './depthDeckGenerator';

describe('generateDeckWithStyle', () => {
  it('forty / deckSize=5 / average=1 → [3,2,0,0,0] with blue backing', () => {
    const result = generateDeckWithStyle({ deckSize: 5, average: 1, riskProfile: 'forty' });
    expect(result).toEqual({
      cards: [3, 2, 0, 0, 0],
      riskProfile: 'forty',
      backingColor: 'blue',
    });
  });

  it('single / deckSize=5 / average=1 → one card worth 5, rest zeros with red backing', () => {
    const result = generateDeckWithStyle({ deckSize: 5, average: 1, riskProfile: 'single' });
    expect(result).toEqual({
      cards: [5, 0, 0, 0, 0],
      riskProfile: 'single',
      backingColor: 'red',
    });
  });

  it('twenty / deckSize=5 / average=1 → one card worth 5, rest zeros with orange backing', () => {
    // 20% of 5 = 1 active card → same shape as single for a 5-card deck
    const result = generateDeckWithStyle({ deckSize: 5, average: 1, riskProfile: 'twenty' });
    expect(result).toEqual({
      cards: [5, 0, 0, 0, 0],
      riskProfile: 'twenty',
      backingColor: 'orange',
    });
  });

  it('uses default average of 1 when average is omitted', () => {
    const withDefault = generateDeckWithStyle({ deckSize: 5, riskProfile: 'forty' });
    const withExplicit = generateDeckWithStyle({ deckSize: 5, average: 1, riskProfile: 'forty' });
    expect(withDefault).toEqual(withExplicit);
  });
});

describe('generateDeck', () => {
  it('total value equals deckSize × average', () => {
    const cards = generateDeck({ deckSize: 5, average: 2, riskProfile: 'forty' });
    const total = cards.reduce((a, b) => a + b, 0);
    expect(total).toBe(10);
  });

  it('zero cards fill the remainder after active cards', () => {
    const cards = generateDeck({ deckSize: 5, average: 1, riskProfile: 'single' });
    const zeros = cards.filter((v) => v === 0);
    expect(zeros).toHaveLength(4);
  });

  it('throws when deckSize is not a multiple of 5', () => {
    expect(() => generateDeck({ deckSize: 7, riskProfile: 'forty' })).toThrow(
      'deckSize must be a multiple of 5'
    );
  });

  it('throws when deckSize is zero or negative', () => {
    expect(() => generateDeck({ deckSize: 0, riskProfile: 'forty' })).toThrow(
      'deckSize must be > 0'
    );
  });

  it('larger deck / forty → 40% active cards', () => {
    // deckSize=10, average=1, forty → 4 active cards, totalValue=10
    // baseValue=2, remainder=2 → [3,3,2,2,0,0,0,0,0,0]
    const cards = generateDeck({ deckSize: 10, average: 1, riskProfile: 'forty' });
    expect(cards).toHaveLength(10);
    expect(cards.filter((v) => v > 0)).toHaveLength(4);
    expect(cards.reduce((a, b) => a + b, 0)).toBe(10);
  });
});
