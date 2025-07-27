<template>
  <div
    class="h-full w-full border border-black transition-colors duration-150 cursor-pointer"
    :class="[
      cell.isEmpty ? 'bg-gray-800 hover:bg-gray-700' : 'bg-blue-600',
      store.selectedCard ? 'ring-2 ring-yellow-400 ring-opacity-50' : '',
    ]"
    :title="`Position: (${rowIndex}, ${colIndex})${cell.card ? ' - Card placed' : ''}`"
    @click="handleClick"
  >
    <!-- Cell content -->
    <div class="w-full h-full flex items-center justify-center">
      <div v-if="cell.isEmpty" class="text-xs text-gray-500 opacity-50">
        {{ rowIndex }},{{ colIndex }}
      </div>
      <div v-else class="w-full h-full flex items-center justify-center">
        <!-- Card Image -->
        <img
          v-if="cell.card?.imageUrl"
          :src="cell.card.imageUrl"
          :alt="`${cell.card.color} card`"
          class="w-full h-full object-cover"
        />
        <!-- Fallback text -->
        <div v-else class="text-white text-sm font-bold">
          {{ cell.card?.name || 'Card' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  cell: any;
  rowIndex: number;
  colIndex: number;
  store: any;
}

const props = defineProps<Props>();

const handleClick = () => {
  if (props.store.selectedCard) {
    // Place the selected card
    props.store.placeCard(props.rowIndex, props.colIndex);
  } else if (!props.cell.isEmpty) {
    // Remove the card if no card is selected
    props.store.clearCell(props.rowIndex, props.colIndex);
  }
};

defineOptions({
  name: 'PlantSquare',
});
</script>
