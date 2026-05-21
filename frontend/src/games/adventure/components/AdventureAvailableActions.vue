<template>
  <div
    class="rounded border p-2"
    style="background: rgba(0,10,0,0.35); border-color: rgba(80,160,80,0.2);"
  >
    <div
      class="text-xs uppercase tracking-wide mb-1.5"
      style="color: rgba(120,200,120,0.6);"
    >What can I do?</div>

    <div v-if="actions.length === 0" class="text-xs italic" style="color: rgba(100,150,100,0.5);">
      Nothing available.
    </div>

    <div class="flex flex-wrap gap-1">
      <button
        v-for="action in actions"
        :key="action.key"
        class="text-xs px-2 py-1 rounded transition-colors border"
        style="background: rgba(10,30,10,0.6); border-color: rgba(80,160,80,0.25); color: rgba(160,220,160,0.8);"
        onmouseover="this.style.background='rgba(20,50,20,0.8)'; this.style.color='rgba(200,255,200,0.9)'"
        onmouseout="this.style.background='rgba(10,30,10,0.6)'; this.style.color='rgba(160,220,160,0.8)'"
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
