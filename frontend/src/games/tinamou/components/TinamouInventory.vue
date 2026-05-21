<template>
  <div class="flex gap-1.5 flex-wrap items-center">
    <button
      v-for="item in inventory"
      :key="item.id"
      :class="[
        'flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-all border',
        selectedItemId === item.id
          ? 'bg-amber-500 text-white border-amber-400 ring-1 ring-amber-300'
          : 'bg-stone-700/60 text-amber-200 border-stone-600/40 hover:bg-stone-600/60',
      ]"
      :title="item.description"
      @click="$emit('select-item', item.id)"
    >
      <span aria-hidden="true">{{ item.icon }}</span>
      <span>{{ item.label }}</span>
    </button>

    <span v-if="inventory.length === 0" class="text-stone-500 text-sm italic">
      Empty
    </span>
  </div>
</template>

<script setup lang="ts">
import type { InventoryItem } from '../types/types'

defineProps<{
  inventory: InventoryItem[]
  selectedItemId: string | null
}>()

defineEmits<{
  'select-item': [id: string]
}>()
</script>
