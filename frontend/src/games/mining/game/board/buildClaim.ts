import { randomShuffle, type ShuffleFn } from '@/games/depth/game/utils/shuffle';

import { getGroundDeck } from '../../constants/groundDecks';
import type { ClaimBoardState, ClaimDefinition, GroundTileState } from '../types';

export function buildClaim(
  claim: ClaimDefinition,
  shuffleFn: ShuffleFn = randomShuffle
): ClaimBoardState {
  const stacks = [];

  for (let row = 0; row < claim.rows; row += 1) {
    const rowLayers = claim.deckMatrix[row].map((groundType, layerIndex) => {
      const deck = getGroundDeck(groundType);
      const cards = shuffleFn(deck.cards, `${claim.id}:${row}:${layerIndex}`);

      if (cards.length < claim.columns) {
        throw new Error(
          `Ground deck ${groundType} does not have enough cards for row ${row} at depth ${layerIndex}`
        );
      }

      return {
        groundType,
        layerIndex,
        deck,
        cards,
      };
    });

    const rowStacks = [];

    for (let col = 0; col < claim.columns; col += 1) {
      const tiles: GroundTileState[] = rowLayers.map((layer) => ({
        id: `${row}-${col}-${layer.layerIndex}`,
        row,
        col,
        layerIndex: layer.layerIndex,
        groundType: layer.groundType,
        goldValue: layer.cards[col],
        digTime: layer.deck.digTime,
        processingTime: layer.deck.processingTime,
        maxDensity: layer.deck.digTime,
        currentDensity: layer.deck.digTime,
        cleared: false,
      }));

      rowStacks.push({
        row,
        col,
        tiles,
      });
    }

    stacks.push(rowStacks);
  }

  return {
    rows: claim.rows,
    columns: claim.columns,
    depth: claim.depth,
    stacks,
  };
}
