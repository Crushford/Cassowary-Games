<template>
  <button
    class="w-full h-full aspect-square border border-black transition-colors duration-150 cursor-pointer flex items-center justify-center relative"
    :class="buttonClasses"
    @click="handleClick"
    :disabled="isFlipped || gameOver"
  >
    <!-- Number display (before flip) -->
    <div v-if="!isFlipped" class="w-full h-full flex items-center justify-center relative">
      <span class="text-2xl font-bold text-white">{{ squareNumber }}</span>
    </div>

    <!-- Card flip animation and image (after flip) -->
    <div v-else class="w-full h-full relative card-flip" :class="{ flipping: shouldFlip }">
      <img
        v-if="cardImageSrc"
        :src="cardImageSrc"
        class="absolute inset-0 w-full h-full object-cover"
        alt=""
      />
      <!-- Coin emoji overlay for honeypots that earned coins -->
      <div
        v-if="earnedCoin && isHoneypot"
        class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
      >
        <span class="text-4xl">🪙</span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface Props {
  rowIndex: number;
  colIndex: number;
  store: any;
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

const isSelected = computed(() => {
  return props.store.isSelected(props.rowIndex, props.colIndex);
});

const isHoneypot = computed(() => {
  return gridCell.value.isSolutionQueen;
});

const earnedCoin = computed(() => {
  return props.store.earnedCoin(props.rowIndex, props.colIndex);
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

// Computed property for the card image source
const cardImageSrc = computed(() => {
  // During flip animation, show no image
  if (isFlipping.value) {
    return '';
  }

  // Show honeypot if this is a solution queen
  if (gridCell.value.isSolutionQueen) {
    return '/assets/card-backs/honey.png';
  }

  // Otherwise show ant
  return '/assets/card-backs/ant.png';
});

// Computed property for button classes
const buttonClasses = computed(() => {
  if (isFlipped.value) {
    return 'bg-gray-800 cursor-default';
  }

  if (gameOver.value) {
    return 'bg-gray-800 cursor-default';
  }

  // Show green background when selected
  if (isSelected.value) {
    return 'bg-green-600 hover:bg-green-700';
  }

  // Default state - can be selected
  if (props.store.canSelectMore) {
    return 'bg-gray-800 hover:bg-gray-700';
  }

  // Can't select more
  return 'bg-gray-800 cursor-default';
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
</style>
