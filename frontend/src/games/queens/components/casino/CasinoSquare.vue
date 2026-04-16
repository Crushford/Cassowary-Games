<template>
  <button class="h-full w-full" @click="handleClick">
    <img
      :src="cellImageSrc"
      class="absolute w-full h-full pointer-events-none"
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
    </div>

    <!-- Border overlay -->
    <div class="absolute inset-0 pointer-events-none z-20" :class="getWrapperBorderClasses()" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { COLOR_IMAGE_URLS } from '../../utils/colorPalette';
import { useCardFlipAnimation } from '../../composables/useCardFlipAnimation';

interface Props {
  rowIndex: number;
  colIndex: number;
  store: any;
}

const props = defineProps<Props>();

const { shouldFlip, isFlipping } = useCardFlipAnimation(
  () => props.store.grid[props.rowIndex][props.colIndex].playerMark
);

// Get the cell directly from the grid to ensure reactivity
const gridCell = computed(() => {
  return props.store.grid[props.rowIndex]?.[props.colIndex];
});

// Computed property for the cell background image
const cellImageSrc = computed(() => {
  if (gridCell.value.groupColor) {
    return (
      COLOR_IMAGE_URLS[gridCell.value.groupColor as keyof typeof COLOR_IMAGE_URLS] ||
      '/assets/ant-nest-colors/cell-background.png'
    );
  }
  return '/assets/ant-nest-colors/cell-background.png';
});

// Computed property for the card image source
const cardImageSrc = computed(() => {
  const playerMark = props.store.grid[props.rowIndex][props.colIndex].playerMark;
  const cell = gridCell.value;

  // During flip animation, show no image (background only)
  if (isFlipping.value) {
    return '';
  }

  // Handle player marks
  if (playerMark === 'queen') {
    return '/assets/card-backs/honey.png';
  }

  if (playerMark === 'invalid') {
    return '/assets/card-backs/ant.png';
  }

  return '';
});

function handleClick() {
  props.store.handleSquareClick(props.rowIndex, props.colIndex);
}

function shouldShowQueen(): boolean {
  return props.store.grid[props.rowIndex][props.colIndex].playerMark === 'queen';
}

function shouldShowFlag(): boolean {
  return props.store.grid[props.rowIndex][props.colIndex].playerMark === 'flag';
}

function shouldShowInvalid(): boolean {
  return props.store.grid[props.rowIndex][props.colIndex].playerMark === 'invalid';
}

function getEmojiSizeClass() {
  const size = props.store.gridSize;
  if (size <= 4) return 'text-3xl';
  if (size <= 6) return 'text-2xl';
  if (size <= 8) return 'text-xl';
  return 'text-lg';
}

function getWrapperBorderClasses() {
  const classes: string[] = [];
  const grid = props.store.grid;
  const maxRow = grid.length - 1;
  const maxCol = grid[0].length - 1;

  // Check right neighbor
  if (props.colIndex < maxCol) {
    if (grid[props.rowIndex][props.colIndex + 1].groupColor !== gridCell.value.groupColor) {
      classes.push('border-r-2 border-r-semantic-info-700');
    } else {
      classes.push('border-r-2 border-r-edge-successFaint');
    }
  } else {
    classes.push('border-r-2 border-r-semantic-neutral-500');
  }

  // Check left neighbor
  if (props.colIndex > 0) {
    if (grid[props.rowIndex][props.colIndex - 1].groupColor !== gridCell.value.groupColor) {
      classes.push('border-l-2 border-l-semantic-info-700');
    } else {
      classes.push('border-l-2 border-l-edge-successFaint');
    }
  } else {
    classes.push('border-l-2 border-l-semantic-neutral-500');
  }

  // Check bottom neighbor
  if (props.rowIndex < maxRow) {
    if (grid[props.rowIndex + 1][props.colIndex].groupColor !== gridCell.value.groupColor) {
      classes.push('border-b-2 border-b-semantic-info-700');
    } else {
      classes.push('border-b-2 border-b-edge-successFaint');
    }
  } else {
    classes.push('border-b-2 border-b-semantic-neutral-500');
  }

  // Check top neighbor
  if (props.rowIndex > 0) {
    if (grid[props.rowIndex - 1][props.colIndex].groupColor !== gridCell.value.groupColor) {
      classes.push('border-t-2 border-t-semantic-info-700');
    } else {
      classes.push('border-t-2 border-t-edge-successFaint');
    }
  } else {
    classes.push('border-t-2 border-t-semantic-neutral-500');
  }

  return classes;
}

defineOptions({
  name: 'CasinoSquare',
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
</style>
