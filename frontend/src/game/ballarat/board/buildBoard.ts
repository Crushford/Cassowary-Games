import { getDeckArchetype } from '../constants/deckArchetypes';
import type { BoardState, BuiltLevelDefinition, CardState, StackState } from '../types';
import type { ShuffleFn } from '../utils/shuffle';
import { randomShuffle } from '../utils/shuffle';

export function buildBoard(
  level: BuiltLevelDefinition,
  shuffleFn: ShuffleFn = randomShuffle
): BoardState {
  const stacks: StackState[][] = [];

  for (let row = 0; row < level.rows; row += 1) {
    const rowLayers = level.deckMatrix[row].map((deckId, layerIndex) => {
      const archetype = getDeckArchetype(deckId);
      const forcedOrder = level.testing?.forcedDeckOrder;
      const cards =
        forcedOrder && forcedOrder.length === archetype.cards.length
          ? [...forcedOrder]
          : shuffleFn(
              archetype.cards,
              level.testing?.shuffleSeed && `${level.testing.shuffleSeed}:${row}:${layerIndex}`
            );

      if (cards.length < level.columns) {
        throw new Error(
          `Deck ${deckId} does not have enough cards for ${level.columns} columns at row ${row}, depth ${layerIndex}`
        );
      }

      return { archetype, layerIndex, cards };
    });

    const rowStacks: StackState[] = [];

    for (let col = 0; col < level.columns; col += 1) {
      const stackCards: CardState[] = rowLayers.map((layerInfo) => ({
        value: layerInfo.cards[col],
        backingColor: layerInfo.archetype.backingColor,
        archetypeId: layerInfo.archetype.id,
        layerIndex: layerInfo.layerIndex,
        revealed: false,
        revealedBy: null,
      }));

      rowStacks.push({
        row,
        col,
        cards: stackCards,
      });
    }

    stacks.push(rowStacks);
  }

  return {
    rows: level.rows,
    columns: level.columns,
    depth: level.depth,
    stacks,
  };
}
