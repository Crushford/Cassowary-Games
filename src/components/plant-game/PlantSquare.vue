<template>
  <div
    class="h-full w-full border-2 border-black transition-colors duration-150 cursor-pointer m-0.5"
    :class="[
      cell.isEmpty ? 'bg-gray-800 hover:bg-gray-700' : 'bg-blue-600',
      store.selectedCard ? 'ring-2 ring-yellow-400 ring-opacity-50' : '',
    ]"
    :title="`Position: (${rowIndex}, ${colIndex})${cell.card ? ' - Card placed' : ''}`"
  >
    <!-- Cell content -->
    <div class="w-full h-full flex items-center justify-center">
      <div v-if="cell.isEmpty" class="text-xs text-gray-500 opacity-50">
        {{ rowIndex }},{{ colIndex }}
      </div>
      <div v-else class="text-white text-sm font-bold">
        {{ cell.card?.name || 'Card' }}
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

defineProps<Props>();

defineOptions({
  name: 'PlantSquare',
});
</script>
