<template>
  <button
    class="h-full w-full border border-black transition-colors duration-150 cursor-pointer bg-gray-800 hover:bg-gray-700"
    @click="handleClick"
  >
    <!-- Cell content -->
    <div class="w-full h-full flex items-center justify-center">
      <div v-if="!gridCell.base" class="text-xs text-gray-500 opacity-50">
        {{ rowIndex }},{{ colIndex }}
      </div>
      <!-- Card with Flip Animation -->
      <div class="w-full h-full relative card-flip" :class="{ flipping: shouldFlip }">
        <img
          v-if="cardImageSrc"
          :src="cardImageSrc"
          class="absolute inset-0 w-full h-full object-cover"
          alt=""
        />
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { COLOR_IMAGE_URLS } from '../../utils/colorPalette';

interface Props {
  rowIndex: number;
  colIndex: number;
  store: any;
}

const props = defineProps<Props>();

// Track if this card should flip
const shouldFlip = ref(false);
const isFlipping = ref(false);

// Get the cell directly from the grid to ensure reactivity
const gridCell = computed(() => {
  return props.store.grid[props.rowIndex]?.[props.colIndex];
});

// Watch for step changes to trigger flip animation
watch(
  () => props.store.currentStep,
  (newStep, oldStep) => {
    // If we're moving from step 1 to step 2 and this cell has a honey pot or ant
    if (
      oldStep === 1 &&
      newStep === 2 &&
      (gridCell.value.base === 'honey' || gridCell.value.base === 'ant')
    ) {
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
  }
);

// Computed property for the card image source
const cardImageSrc = computed(() => {
  const cell = gridCell.value;

  // During flip animation, show the old image
  if (isFlipping.value) {
    if (cell.base === 'honey') return '/assets/card-backs/honey.png';
    if (cell.base === 'ant') return '/assets/card-backs/ant.png';
  }

  // Handle group colors (both step 2 and regular)
  if (cell.groupColor) {
    return COLOR_IMAGE_URLS[cell.groupColor as keyof typeof COLOR_IMAGE_URLS] || '';
  }

  // Handle base types
  if (cell.base === 'honey') {
    return '/assets/card-backs/honey.png';
  }

  if (cell.base === 'ant') {
    // In step 2, ants without group color become blank
    if (props.store.currentStep === 2 && cell.groupColor === null) {
      return '';
    }
    return '/assets/card-backs/ant.png';
  }

  return '';
});

const handleClick = () => {
  if (props.store.currentStep === 1) {
    // Step 1: Place honey pot if cell is empty
    if (!gridCell.value.base) {
      props.store.placeHoneyPot(props.rowIndex, props.colIndex);
    }
  } else if (props.store.currentStep === 2) {
    // Step 2: Assign color if cell doesn't have a color group
    if (!gridCell.value.groupColor) {
      props.store.assignColorToSquare(props.rowIndex, props.colIndex);
    }
  }
};

defineOptions({
  name: 'PlantSquare',
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
    transform: rotateY(180deg);
  }
}
</style>
