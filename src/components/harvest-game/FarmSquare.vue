<template>
  <button class="h-full w-full" @click="handleClick">
    <img
      :src="getCellImage()"
      class="absolute inset-0 w-full h-full object-cover pointer-events-none"
      alt="cell background"
    />

    <!-- Content overlay -->
    <div class="relative z-10 flex items-center justify-center w-full h-full">
      <span v-if="shouldShowFlag()" :class="getEmojiSizeClass()">🚧</span>
      <div
        v-else-if="shouldShowQueen() || shouldShowInvalid()"
        class="w-full h-full relative card-flip"
        :class="{ flipping: shouldFlip }"
      >
        <img
          v-if="cardImageSrc"
          :src="cardImageSrc"
          class="absolute inset-0 w-full h-full object-cover"
          alt=""
        />
      </div>
      <span v-else class="invisible">.</span>
    </div>

    <!-- Border overlay -->
    <div class="absolute inset-0 pointer-events-none z-20" :class="getWrapperBorderClasses()" />
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useHarvestStore } from '../../stores/harvestStore';
import type { ColorName } from '../../types/types';

interface Props {
  rowIndex: number;
  colIndex: number;
  store: any;
}

const props = defineProps<Props>();
const harvestStore = useHarvestStore();

// Track if this card should flip
const shouldFlip = ref(false);
const isFlipping = ref(false);

const gridCell = computed(() => {
  return props.store.grid[props.rowIndex]?.[props.colIndex];
});

// Computed property for the card image source
const cardImageSrc = computed(() => {
  // During flip animation, show no image (background only)
  if (isFlipping.value) {
    return '';
  }

  // Handle queen (honey pot)
  if (shouldShowQueen()) {
    return '/assets/card-backs/honey.png';
  }

  // Handle invalid (ant)
  if (shouldShowInvalid()) {
    return '/assets/card-backs/ant.png';
  }

  return '';
});

// Watch for changes in player marks to trigger flip animation
watch(
  () => harvestStore.playerMarks[props.rowIndex][props.colIndex],
  (newMark, oldMark) => {
    // Trigger flip when transitioning to queen or invalid (regardless of previous state)
    if (newMark === 'queen' || newMark === 'invalid') {
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

function handleClick() {
  harvestStore.handleSquareClick(props.rowIndex, props.colIndex);
}

function getCellImage() {
  if (gridCell.value.groupColor) {
    return `/assets/ant-nest-colors/${gridCell.value.groupColor}.png`;
  }
  return '/assets/ant-nest-colors/cell-background.png';
}

function shouldShowQueen(): boolean {
  return harvestStore.playerMarks[props.rowIndex][props.colIndex] === 'queen';
}

function shouldShowFlag(): boolean {
  return harvestStore.playerMarks[props.rowIndex][props.colIndex] === 'flag';
}

function shouldShowInvalid(): boolean {
  return harvestStore.playerMarks[props.rowIndex][props.colIndex] === 'invalid';
}

function getWrapperBorderClasses() {
  const classes: string[] = [];
  const grid = harvestStore.grid;
  const maxRow = grid.length - 1;
  const maxCol = grid[0].length - 1;

  // Check right neighbor
  if (props.colIndex < maxCol) {
    if (grid[props.rowIndex][props.colIndex + 1].groupColor !== gridCell.value.groupColor) {
      classes.push('border-r-2 border-r-blue-700');
    } else {
      classes.push('border-r-2 border-r-green-500/10');
    }
  } else {
    classes.push('border-r-2 border-r-gray-500');
  }

  // Check left neighbor
  if (props.colIndex > 0) {
    if (grid[props.rowIndex][props.colIndex - 1].groupColor !== gridCell.value.groupColor) {
      classes.push('border-l-2 border-l-blue-700');
    } else {
      classes.push('border-l-2 border-l-green-500/10');
    }
  } else {
    classes.push('border-l-2 border-l-gray-500');
  }

  // Check bottom neighbor
  if (props.rowIndex < maxRow) {
    if (grid[props.rowIndex + 1][props.colIndex].groupColor !== gridCell.value.groupColor) {
      classes.push('border-b-2 border-b-blue-700');
    } else {
      classes.push('border-b-2 border-b-green-500/10');
    }
  } else {
    classes.push('border-b-2 border-b-gray-500');
  }

  // Check top neighbor
  if (props.rowIndex > 0) {
    if (grid[props.rowIndex - 1][props.colIndex].groupColor !== gridCell.value.groupColor) {
      classes.push('border-t-2 border-t-blue-700');
    } else {
      classes.push('border-t-2 border-t-green-500/10');
    }
  } else {
    classes.push('border-t-2 border-t-gray-500');
  }

  return classes;
}

function getEmojiSizeClass() {
  const size = harvestStore.gridSize;
  if (size <= 4) return 'text-3xl';
  if (size <= 6) return 'text-2xl';
  if (size <= 8) return 'text-xl';
  return 'text-lg';
}
</script>

<script lang="ts">
export default {
  name: 'FarmSquare',
};
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
</style>
