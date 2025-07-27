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
        <!-- Card Image -->
        <div
          v-if="gridCell.base"
          class="w-full h-full bg-cover bg-center"
          :style="getColorBackgroundStyle(gridCell, store)"
        />

        <!-- Fallback text -->
        <div v-else class="text-white text-sm font-bold">
          {{ gridCell.base || 'Empty' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { COLOR_BG_IMAGES } from '../../utils/colorPalette';

interface Props {
  cell: any;
  rowIndex: number;
  colIndex: number;
  store: any;
}

const props = defineProps<Props>();

// Get the cell directly from the grid to ensure reactivity
const gridCell = computed(() => {
  return props.store.grid[props.rowIndex]?.[props.colIndex] || props.cell;
});

// Get the background image style for a cell
const getColorBackgroundStyle = (gridCell: any, store: any) => {
  if (store.currentStep === 2 && gridCell.groupColor) {
    return COLOR_BG_IMAGES[gridCell.groupColor as keyof typeof COLOR_BG_IMAGES] || '';
  }

  if (gridCell.base === 'honey') {
    return "background-image: url('/assets/card-backs/honey.png');";
  }

  if (gridCell.base === 'ant') {
    return "background-image: url('/assets/card-backs/ant.png');";
  }

  if (gridCell.groupColor) {
    return "background-image: url('/assets/ant-nest-colors/" + gridCell.groupColor + ".png');";
  }

  return '';
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
