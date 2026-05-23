<template>
  <div class="rounded border border-green-800/20 bg-green-950/30 p-2">
    <div class="text-xs uppercase tracking-wide mb-1.5 text-green-400/60">
      What can I do?
    </div>

    <div v-if="actions.length === 0" class="text-xs italic text-green-400/30">
      Nothing available.
    </div>

    <div class="flex flex-wrap gap-1">
      <button
        v-for="action in actions"
        :key="action.key"
        class="text-xs px-2 py-1 rounded border border-green-800/25 bg-green-950/60 text-green-300/80 hover:bg-green-900/80 hover:text-green-200 transition-colors"
        @click="$emit('trigger', action)"
      >
        {{ action.displayText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AvailableAction } from '../stores/createAdventureStore'

defineProps<{
  actions: AvailableAction[]
}>()

defineEmits<{
  trigger: [action: AvailableAction]
}>()
</script>
