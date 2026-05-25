<template>
  <div v-if="layout" class="space-y-2">
    <div
      v-for="layer in sortedLayers"
      :key="layer.entityId"
      class="flex items-center gap-3 rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft px-3 py-2"
    >
      <!-- Kind icon -->
      <span class="text-base">{{ kindIcon[layer.kind] }}</span>

      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-white">{{ layer.label }}</p>
        <p class="text-[10px] text-semantic-neutral-500">
          x{{ layer.x }}% y{{ layer.y }}% · {{ layer.width }}×{{ layer.height }}% · z{{ layer.zIndex }}
        </p>
      </div>

      <span
        class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        :class="kindBadge[layer.kind]"
      >
        {{ layer.kind }}
      </span>
    </div>

    <p class="text-[11px] text-semantic-neutral-600 pt-1">
      Drag-to-reposition coming in a future iteration.
    </p>
  </div>
  <p v-else class="text-sm text-semantic-neutral-500">No layout loaded.</p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LayerKind } from '../types';
import { usePointAndClickAdminStore } from '../stores/pointAndClickAdminStore';

const store = usePointAndClickAdminStore();

const layout = computed(() => store.layout);

const sortedLayers = computed(() => {
  if (!layout.value) return [];
  return [...layout.value.layers].sort((a, b) => b.zIndex - a.zIndex);
});

const kindIcon: Record<LayerKind, string> = {
  background: '🌄',
  character: '🦤',
  object: '📦',
};

const kindBadge: Record<LayerKind, string> = {
  background: 'bg-semantic-success-900 text-semantic-success-300',
  character: 'bg-semantic-info-900 text-semantic-info-300',
  object: 'bg-semantic-warning-900 text-semantic-warning-300',
};
</script>
