<template>
  <div
    class="grid gap-3"
    :style="{ gridTemplateColumns: `repeat(${board.columns}, minmax(0, 1fr))` }"
  >
    <button
      v-for="stack in flattenedStacks"
      :key="`${stack.row}-${stack.col}`"
      type="button"
      :disabled="!isSelectable(stack) && !stagedRevealFor(stack)"
      class="group relative min-h-[112px] overflow-hidden rounded-2xl border p-2 text-left transition-all"
      :class="stackClass(stack)"
      @click="$emit('select-position', { row: stack.row, col: stack.col })"
    >
      <div
        class="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-app-textMuted"
      >
        <span>R{{ stack.row + 1 }}</span>
        <span>C{{ stack.col + 1 }}</span>
      </div>

      <div class="mt-2 flex min-h-[42px] items-center justify-center">
        <template v-if="stagedRevealFor(stack)">
          <div class="text-center">
            <div class="[perspective:900px] w-[2.4rem] h-[3.2rem] mx-auto">
              <div
                class="relative w-full h-full [transform-style:preserve-3d] [transition:transform_0.85s_cubic-bezier(0.2,0.8,0.2,1)] [transform:rotateY(180deg)]"
              >
                <div
                  class="absolute inset-0 flex items-center justify-center [border-radius:0.8rem] [backface-visibility:hidden] border border-white/[0.14] [box-shadow:0_10px_24px_rgba(0,0,0,0.18)]"
                  :class="backingSurfaceClass(stagedRevealFor(stack)?.backingColor ?? '')"
                >
                  <div
                    class="h-7 w-5 rounded-sm border border-white/20"
                    :class="backingCardClass(stagedRevealFor(stack)?.backingColor ?? '')"
                  />
                </div>
                <div
                  class="absolute inset-0 flex items-center justify-center [border-radius:0.8rem] [backface-visibility:hidden] border border-white/[0.14] [box-shadow:0_10px_24px_rgba(0,0,0,0.18)] [transform:rotateY(180deg)] bg-app-surface"
                >
                  <div
                    class="text-2xl font-black leading-none"
                    :class="valueClass(stagedRevealFor(stack)?.cardValue ?? 0)"
                  >
                    {{ stagedRevealFor(stack)?.cardValue }}
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-2 text-[10px] uppercase tracking-[0.18em] text-semantic-warning-300">
              Revealed
            </div>
          </div>
        </template>
        <template v-else-if="visibleStackCards(stack).length > 0">
          <div class="text-center">
            <template v-if="showExactValues">
              <div class="stack-stage stack-stage--mahjong mx-auto" :style="stackStageStyle(stack)">
                <div
                  v-for="card in visibleStackCards(stack)"
                  :key="`${stack.row}-${stack.col}-${card.layerIndex}`"
                  class="stack-card stack-card--front"
                  :class="card.revealed ? 'opacity-40' : 'bg-app-surface'"
                  :style="stackCardStyle(card, stack)"
                >
                  <span class="text-xl font-black leading-none" :class="valueClass(card.value)">
                    {{ card.value }}
                  </span>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="stack-stage stack-stage--mahjong mx-auto" :style="stackStageStyle(stack)">
                <div
                  v-for="card in visibleStackCards(stack)"
                  :key="`${stack.row}-${stack.col}-${card.layerIndex}`"
                  class="stack-card"
                  :class="backingCardClass(card.backingColor)"
                  :style="stackCardStyle(card, stack)"
                />
              </div>
            </template>
            <div class="mt-1 text-[10px] text-app-textMuted">
              {{ remainingLayers(stack) }} layer{{ remainingLayers(stack) === 1 ? '' : 's' }}
            </div>
          </div>
        </template>
        <div v-else-if="finalRevealedCard(stack)" class="text-center">
          <div class="stack-stage stack-stage--mahjong mx-auto" :style="stackStageStyle(stack, 1)">
            <div class="stack-card stack-card--front bg-app-surface">
              <span
                class="text-xl font-black leading-none"
                :class="valueClass(finalRevealedCard(stack)?.value ?? 0)"
              >
                {{ finalRevealedCard(stack)?.value }}
              </span>
            </div>
          </div>
          <div class="mt-2 text-[10px] uppercase tracking-[0.18em] text-app-textMuted">Cleared</div>
        </div>
        <div v-else class="text-center">
          <div class="text-sm font-bold uppercase tracking-[0.2em] text-app-textMuted">Cleared</div>
          <div class="mt-1 text-[10px] text-app-textMuted">No cards left</div>
        </div>
      </div>

      <div class="mt-3 flex gap-1">
        <span
          v-for="card in stack.cards"
          :key="`${stack.row}-${stack.col}-${card.layerIndex}`"
          class="h-1.5 flex-1 rounded-full"
          :class="layerClass(card.backingColor, card.revealed)"
        />
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { getTopAccessibleCard } from '@/games/depth/game/board/access';
import type {
  BoardState,
  CardState,
  PositionRef,
  RevealRecord,
  StackState,
} from '@/games/depth/game/types';

const props = defineProps<{
  board: BoardState;
  selectedPosition: PositionRef | null;
  showExactValues: boolean;
  stagedReveals?: RevealRecord[];
}>();

defineEmits<{
  (event: 'select-position', position: PositionRef): void;
}>();

const flattenedStacks = computed(() => props.board.stacks.flat());
const stagedRevealMap = computed(() => {
  return new Map(
    (props.stagedReveals ?? []).map((reveal) => [`${reveal.row}-${reveal.col}`, reveal])
  );
});

function topCard(stack: StackState) {
  return getTopAccessibleCard(stack);
}

function stagedRevealFor(stack: StackState): (RevealRecord & { backingColor?: string }) | null {
  const reveal = stagedRevealMap.value.get(`${stack.row}-${stack.col}`);
  if (!reveal) {
    return null;
  }

  const card = stack.cards.find((item) => item.layerIndex === reveal.layerIndex);
  return {
    ...reveal,
    backingColor: card?.backingColor,
  };
}

function remainingLayers(stack: StackState): number {
  return stack.cards.filter((card) => !card.revealed).length;
}

function visibleStackCards(stack: StackState): CardState[] {
  return stack.cards.filter((card) => !card.revealed);
}

function finalRevealedCard(stack: StackState): CardState | null {
  if (visibleStackCards(stack).length > 0) {
    return null;
  }

  return stack.cards.at(-1) ?? null;
}

function isSelectable(stack: StackState): boolean {
  return topCard(stack) !== null;
}

function isSelected(stack: StackState): boolean {
  return props.selectedPosition?.row === stack.row && props.selectedPosition?.col === stack.col;
}

function stackClass(stack: StackState): string {
  const stagedReveal = stagedRevealFor(stack);

  if (stagedReveal) {
    return [
      backingSurfaceClass(stagedReveal.backingColor ?? ''),
      'border-semantic-warning-300 shadow-lg shadow-semantic-warning-900/15',
    ].join(' ');
  }

  if (!isSelectable(stack)) {
    return 'cursor-not-allowed border-app-border bg-depth-baseFaint opacity-45';
  }

  const top = topCard(stack);
  const colorClass = top ? backingSurfaceClass(top.backingColor) : 'bg-depth-baseMuted';
  const selectedClass = isSelected(stack)
    ? 'border-semantic-warning-300 ring-2 ring-depth-warningRing ring-offset-2 ring-offset-app-bgAlt'
    : 'border-app-border hover:border-semantic-info-400 hover:-translate-y-0.5';

  return `${colorClass} ${selectedClass}`;
}

function backingSurfaceClass(color: string): string {
  switch (color) {
    case 'blue':
      return 'bg-gradient-to-br from-semantic-info-900 to-feedback-infoSoft';
    case 'orange':
      return 'bg-gradient-to-br from-semantic-warning-900 to-feedback-warningSubtle';
    case 'red':
      return 'bg-gradient-to-br from-semantic-danger-900 to-feedback-dangerSubtle';
    default:
      return 'bg-depth-baseSoft';
  }
}

function backingCardClass(color: string): string {
  switch (color) {
    case 'blue':
      return 'bg-gradient-to-br from-semantic-info-500 to-semantic-info-800';
    case 'orange':
      return 'bg-gradient-to-br from-semantic-warning-500 to-semantic-warning-800';
    case 'red':
      return 'bg-gradient-to-br from-semantic-danger-500 to-semantic-danger-800';
    default:
      return 'bg-app-border';
  }
}

function valueClass(value: number): string {
  if (value >= 10) return 'text-semantic-danger-300';
  if (value >= 5) return 'text-semantic-warning-300';
  if (value >= 3) return 'text-semantic-success-300';
  if (value >= 1) return 'text-semantic-info-300';
  return 'text-app-textMuted';
}

function layerClass(color: string, revealed: boolean): string {
  const opacity = revealed ? 'opacity-25' : 'opacity-100';

  switch (color) {
    case 'blue':
      return `bg-semantic-info-400 ${opacity}`;
    case 'orange':
      return `bg-semantic-warning-400 ${opacity}`;
    case 'red':
      return `bg-semantic-danger-400 ${opacity}`;
    default:
      return `bg-app-border ${opacity}`;
  }
}

const maxStackThickness = 10;

function getStackLayerOffset(layers: number): number {
  if (layers <= 1) return 0;
  return Math.max(1, Math.floor(maxStackThickness / (layers - 1)));
}

function stackStageStyle(stack: StackState, forcedLayers?: number): Record<string, string> {
  const layers = Math.max(1, forcedLayers ?? visibleStackCards(stack).length);
  const thickness = (layers - 1) * getStackLayerOffset(layers);

  return {
    '--stack-thickness': `${thickness}px`,
  };
}

function stackCardStyle(card: CardState, stack: StackState): Record<string, string> {
  const cards = visibleStackCards(stack);
  const index = cards.findIndex((item) => item.layerIndex === card.layerIndex);
  const layerOffset = getStackLayerOffset(cards.length);
  const offset = Math.max(0, index) * layerOffset;

  return {
    right: `${offset}px`,
    bottom: `${offset}px`,
    zIndex: `${cards.length - index}`,
  };
}

defineOptions({
  name: 'Board',
});
</script>

<style scoped>
.stack-stage {
  position: relative;
  max-width: 100%;
  max-height: 100%;
}

.stack-stage--mahjong {
  width: 2rem;
  height: 2.8rem;
}

.stack-card {
  position: absolute;
  width: calc(100% - var(--stack-thickness, 0px));
  height: calc(100% - var(--stack-thickness, 0px));
  border-radius: 0.45rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
}

.stack-card--front {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
