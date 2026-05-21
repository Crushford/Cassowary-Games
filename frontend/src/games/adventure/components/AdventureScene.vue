<template>
  <div
    class="relative w-full overflow-hidden rounded-lg select-none"
    style="aspect-ratio: 16 / 9;"
    :style="backgroundStyle"
  >
    <!-- Scene layer: slot for game-specific background decoration -->
    <slot name="background" />

    <!-- Hotspots -->
    <AdventureHotspot
      v-for="hotspot in visibleHotspots"
      :key="hotspot.id"
      :hotspot="hotspot"
      :active-action="activeAction"
      :selected-item="selectedItem"
      @click="$emit('hotspot-click', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SceneDefinition, ActionType, InventoryItemDefinition } from '../types/adventureTypes'
import AdventureHotspot from './AdventureHotspot.vue'

const props = defineProps<{
  scene: SceneDefinition
  collectedItemIds: string[]
  activeAction: ActionType
  selectedItem: InventoryItemDefinition | null
  /** CSS background shorthand applied to the scene container */
  backgroundCss?: string
}>()

defineEmits<{
  'hotspot-click': [id: string]
}>()

const visibleHotspots = computed(() =>
  props.scene.hotspots.filter(
    (h) => !h.collectibleItemId || !props.collectedItemIds.includes(h.collectibleItemId),
  ),
)

const backgroundStyle = computed(() =>
  props.backgroundCss ? { background: props.backgroundCss } : {},
)
</script>
