import { getDeckArchetype } from '../constants/deckArchetypes';
import type { BuiltLevelDefinition, LevelInput } from '../types';

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function normalizeDeckMatrix(levelInput: LevelInput): string[][] {
  const {
    board: { rows, depth },
    decks,
  } = levelInput;

  switch (decks.mode) {
    case 'uniform':
      getDeckArchetype(decks.deckId);
      return Array.from({ length: rows }, () => Array.from({ length: depth }, () => decks.deckId));

    case 'by-depth':
      if (decks.depthDeckIds.length !== depth) {
        throw new Error(`Deck assignment depth count must equal depth (${depth})`);
      }
      decks.depthDeckIds.forEach((deckId) => getDeckArchetype(deckId));
      return Array.from({ length: rows }, () => [...decks.depthDeckIds]);

    case 'by-row':
      if (decks.rowDeckIds.length !== rows) {
        throw new Error(`Deck assignment row count must equal rows (${rows})`);
      }
      decks.rowDeckIds.forEach((deckId) => getDeckArchetype(deckId));
      return decks.rowDeckIds.map((deckId) => Array.from({ length: depth }, () => deckId));

    case 'row-depth-matrix':
      if (decks.matrix.length !== rows) {
        throw new Error(`Deck matrix row count must equal rows (${rows})`);
      }

      return decks.matrix.map((rowDeckIds, rowIndex) => {
        if (rowDeckIds.length !== depth) {
          throw new Error(`Deck matrix depth count must equal depth (${depth}) at row ${rowIndex}`);
        }
        rowDeckIds.forEach((deckId) => getDeckArchetype(deckId));
        return [...rowDeckIds];
      });
  }
}

export function buildLevelDefinition(levelInput: LevelInput): BuiltLevelDefinition {
  const { metadata, economy, board, rules, support, testing } = levelInput;

  assertPositiveInteger(metadata.id, 'Level id');
  assertPositiveInteger(board.rows, 'Rows');
  assertPositiveInteger(board.columns, 'Columns');
  assertPositiveInteger(board.depth, 'Depth');
  assertPositiveInteger(economy.rounds, 'Rounds');
  assertPositiveInteger(economy.startingBank, 'Starting bank');
  assertPositiveInteger(economy.minBet, 'Min bet');
  assertPositiveInteger(economy.maxBet, 'Max bet');

  if (economy.minBet > economy.maxBet) {
    throw new Error('Min bet cannot exceed max bet');
  }

  const deckMatrix = normalizeDeckMatrix(levelInput);

  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    tags: metadata.tags ?? [],
    draft: metadata.draft ?? false,
    startingBank: economy.startingBank,
    rounds: economy.rounds,
    minBet: economy.minBet,
    maxBet: economy.maxBet,
    rows: board.rows,
    columns: board.columns,
    depth: board.depth,
    turnRule: rules.turnRule,
    supportMode: support.supportMode ?? 'exact',
    showExactRemainingValues: support.showExactRemainingValues ?? true,
    showRowAverages: support.showRowAverages ?? false,
    showBoardAverage: support.showBoardAverage ?? false,
    dealerEnabled: rules.dealerEnabled ?? rules.turnRule === 'dealer-follow-up',
    dealerAfterPlayer: rules.dealerAfterPlayer ?? rules.turnRule === 'dealer-follow-up',
    deckMatrix,
    testing,
  };
}
