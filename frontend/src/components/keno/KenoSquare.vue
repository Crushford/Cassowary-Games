<template>
  <button
    class="w-full h-full aspect-square border border-black bg-gray-800 hover:bg-gray-700 transition-colors duration-150 cursor-pointer flex items-center justify-center relative"
    :class="buttonClasses"
    @click="handleClick"
    :disabled="isFlipped || canFlip === false"
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

const canFlip = computed(() => {
  return !props.store.gameOver && props.store.turnsRemaining > 0;
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
  // Disable hover when flipped or game over
  if (isFlipped.value || !canFlip.value) {
    return 'bg-gray-800 cursor-default';
  }
  return 'bg-gray-800 hover:bg-gray-700';
});

function handleClick() {
  if (!isFlipped.value && canFlip.value) {
    props.store.flipSquare(props.rowIndex, props.colIndex);
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
