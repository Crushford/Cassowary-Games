<template>
  <div class="flex gap-1.5 flex-wrap" role="toolbar" aria-label="Action verbs">
    <button
      v-for="action in actions"
      :key="action.id"
      :class="[
        'px-3 py-1.5 rounded text-sm font-medium transition-all border',
        activeAction === action.id
          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30'
          : 'bg-stone-700/60 text-amber-300 border-stone-600/40 hover:bg-stone-600/60 hover:text-amber-200',
      ]"
      :aria-pressed="activeAction === action.id"
      @click="$emit('select-action', action.id)"
    >
      {{ action.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ActionType } from '../types/adventureTypes'

defineProps<{
  activeAction: ActionType
}>()

defineEmits<{
  'select-action': [action: ActionType]
}>()

const actions: Array<{ id: ActionType; label: string }> = [
  { id: 'look', label: 'Look At' },
  { id: 'take', label: 'Pick Up' },
  { id: 'talk', label: 'Talk To' },
  { id: 'use', label: 'Use' },
]
</script>
