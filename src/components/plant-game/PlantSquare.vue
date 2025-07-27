<template>
  <div
    class="h-full w-full border border-black transition-colors duration-150 cursor-pointer bg-gray-800 hover:bg-gray-700"
    @click="handleClick"
  >
    <!-- Cell content -->
    <div class="w-full h-full flex items-center justify-center">
      <div v-if="!gridCell.base" class="text-xs text-gray-500 opacity-50">
        {{ rowIndex }},{{ colIndex }}
      </div>
      <div v-else class="w-full h-full flex items-center justify-center">
        <!-- Card with Flip Animation -->
        <div
          v-if="gridCell.base"
          class="w-full h-full bg-cover bg-center card-flip"
          :class="{ flipping: shouldFlip }"
          :style="getCardBackgroundStyle()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { COLOR_BG_IMAGES } from '../../utils/colorPalette';

interface Props {
  cell: any;
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
  return props.store.grid[props.rowIndex]?.[props.colIndex] || props.cell;
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

// Get the background image style for a cell
const getColorBackgroundStyle = (gridCell: any, store: any) => {
  if (store.currentStep === 2 && gridCell.groupColor) {
    return COLOR_BG_IMAGES[gridCell.groupColor as keyof typeof COLOR_BG_IMAGES] || '';
  }

  if (gridCell.base === 'honey') {
    return "background-image: url('/assets/card-backs/honey.png');";
  }

  if (gridCell.base === 'ant') {
    // In step 2, ants become blank (no background image)
    if (store.currentStep === 2 && gridCell.groupColor === null) {
      return '';
    }
    return "background-image: url('/assets/card-backs/ant.png');";
  }

  if (gridCell.groupColor) {
    return "background-image: url('/assets/ant-nest-colors/" + gridCell.groupColor + ".png');";
  }

  return '';
};

// Get the appropriate background style for the card
const getCardBackgroundStyle = () => {
  // During the first half of flip animation, show original image
  if (isFlipping.value) {
    if (gridCell.value.base === 'honey') {
      return "background-image: url('/assets/card-backs/honey.png');";
    }
    if (gridCell.value.base === 'ant') {
      return "background-image: url('/assets/card-backs/ant.png');";
    }
  }

  return getColorBackgroundStyle(gridCell.value, props.store);
};

const handleClick = () => {
  if (props.store.selectedCard) {
    // Place the selected card
    props.store.placeCard(props.rowIndex, props.colIndex);
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
