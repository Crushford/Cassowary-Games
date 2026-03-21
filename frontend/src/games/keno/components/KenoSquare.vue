<template>
  <!-- KenoSquare -->
  <button
    class="w-full h-full aspect-square border border-black transition-colors duration-150 cursor-pointer flex items-center justify-center relative outline-none box-border"
    :class="buttonClasses"
    :disabled="isFlipped || gameOver"
    @click="handleClick"
  >
    <!-- Number display (before flip) -->
    <div v-if="!isFlipped" class="w-full h-full flex items-center justify-center relative">
      <span class="text-2xl font-bold text-white">{{ squareNumber }}</span>
      <!-- Solution overlay when showBoard is true -->
      <div
        v-if="showBoard && isHoneypot"
        class="absolute inset-0 flex items-center justify-center bg-semantic-success-500 bg-opacity-50 z-10"
      >
        <span class="text-4xl">🐅</span>
      </div>
    </div>

    <!-- Card flip animation and image (after flip) -->
    <div v-else class="w-full h-full relative card-flip" :class="{ flipping: shouldFlip }">
      <!-- Honeypot (tiger emoji) overlay when isHoneypot is true -->
      <div
        v-if="isHoneypot"
        class="absolute inset-0 flex items-center justify-center bg-semantic-neutral-800 z-10"
      >
        <span class="text-4xl">🐅</span>
      </div>
      <!-- Fruit emoji overlay when hasFruit is true -->
      <div
        v-if="hasFruit && !isHoneypot"
        class="absolute inset-0 flex items-center justify-center bg-semantic-neutral-800 z-10"
      >
        <span class="text-4xl">🍎</span>
      </div>
      <!-- Nest emoji overlay when no fruit and no honeypot -->
      <div
        v-if="!hasFruit && !isHoneypot"
        class="absolute inset-0 flex items-center justify-center bg-semantic-neutral-800 z-10"
      >
        <span class="text-4xl">🪺</span>
      </div>
    </div>

    <!-- Popup for score display -->
    <Transition name="popup">
      <div
        v-if="showPopup"
        class="absolute -top-12 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
        :class="popupClasses"
      >
        <span class="text-3xl font-bold"
          >{{ (popupValue ?? 0) > 0 ? '+' : '' }}{{ popupValue ?? 0 }}</span
        >
      </div>
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { GridSquare } from '@/games/queens/types/types';

interface KenoSquareStore {
  grid: GridSquare[][];
  gameOver: boolean;
  showBoard: boolean;
  canSelectMore: boolean;
  getSquareNumber: (row: number, col: number) => number;
  isFlipped: (row: number, col: number) => boolean;
  isSelected: (row: number, col: number) => boolean;
  isShowingPopup: (row: number, col: number) => boolean;
  getPopupValue: (row: number, col: number) => number | null;
  selectSquare: (row: number, col: number) => void;
}

interface Props {
  rowIndex: number;
  colIndex: number;
  store: KenoSquareStore;
}

const props = defineProps<Props>();

// Track if this card should flip
const shouldFlip = ref(false);
const isFlipping = ref(false);

const gridCell = computed(() => {
  return props.store.grid[props.rowIndex]?.[props.colIndex];
});

const squareNumber = computed(() => {
  return props.store.getSquareNumber(props.rowIndex, props.colIndex);
});

const isFlipped = computed(() => {
  return props.store.isFlipped(props.rowIndex, props.colIndex);
});

const gameOver = computed(() => {
  return props.store.gameOver;
});

const showBoard = computed(() => {
  return props.store.showBoard;
});

const isSelected = computed(() => {
  return props.store.isSelected(props.rowIndex, props.colIndex);
});

const isHoneypot = computed(() => {
  return gridCell.value.isSolutionQueen;
});

const showPopup = computed(() => {
  return props.store.isShowingPopup(props.rowIndex, props.colIndex);
});

const popupValue = computed(() => {
  return props.store.getPopupValue(props.rowIndex, props.colIndex);
});

const popupClasses = computed(() => {
  const value = popupValue.value;
  if (value === null) return '';
  // Red for negative values (loss), green for positive values (gain), gray for zero
  if (value < 0) return 'text-semantic-danger-500';
  if (value > 0) return 'text-semantic-success-400';
  return 'text-semantic-neutral-400';
});

// Watch for flip state changes to trigger animation
watch(
  () => isFlipped.value,
  (newFlipped) => {
    if (newFlipped) {
      shouldFlip.value = true;
      isFlipping.value = true;

      // Change the image mid-flip (at 50% of animation)
      setTimeout(() => {
        isFlipping.value = false;
      }, 300); // Half of the 600ms animation

      // Reset flip state after animation completes
      setTimeout(() => {
        shouldFlip.value = false;
      }, 600); // Match the CSS animation duration
    }
  },
  { immediate: false }
);

const hasFruit = computed(() => {
  return gridCell.value.hasFruit;
});

// Computed property for button classes
const buttonClasses = computed(() => {
  if (isFlipped.value) {
    return 'bg-semantic-neutral-800 cursor-default';
  }

  if (gameOver.value) {
    return 'bg-semantic-neutral-800 cursor-default';
  }

  // Show green background when selected
  if (isSelected.value) {
    return 'bg-semantic-success-600 hover:bg-semantic-success-700';
  }

  // Default state - can be selected
  if (props.store.canSelectMore) {
    return 'bg-semantic-neutral-800 hover:bg-semantic-neutral-700';
  }

  // Can't select more
  return 'bg-semantic-neutral-800 cursor-default';
});

function handleClick() {
  if (!isFlipped.value && !gameOver.value) {
    props.store.selectSquare(props.rowIndex, props.colIndex);
  }
}

defineOptions({
  name: 'KenoSquare',
});
</script>

<style scoped>
/* 3D flip animation */
.card-flip {
  perspective: 1000px;
  transform-style: preserve-3d;
  transition: transform 0.6s ease-in-out;
}

.card-flip.flipping {
  animation: flip 0.6s ease-in-out;
}

@keyframes flip {
  0% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(90deg);
  }
  100% {
    transform: rotateY(0deg);
  }
}

/* Popup animation */
.popup-enter-active {
  transition: all 0.3s ease-out;
  animation: popupFloat 1s ease-out;
}

.popup-leave-active {
  transition: all 0.3s ease-in;
}

.popup-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(0);
}

.popup-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

@keyframes popupFloat {
  0% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-10px);
  }
  100% {
    transform: translateX(-50%) translateY(-20px);
  }
}
</style>
