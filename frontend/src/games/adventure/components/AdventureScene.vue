<template>
  <div
    class="relative w-full overflow-hidden rounded-lg select-none"
    style="aspect-ratio: 16 / 9;"
    :style="backgroundStyle"
  >
    <!-- Game-specific background decoration provided by the shell -->
    <slot name="background" />

    <!-- Hotspots (pre-filtered by the store's visibleHotspots getter) -->
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
import type {
  HotspotDefinition,
  ActionType,
  InventoryItemDefinition,
} from '../types/adventureTypes'
import AdventureHotspot from './AdventureHotspot.vue'

const props = defineProps<{
  /** Already-filtered list from the store's visibleHotspots getter */
  visibleHotspots: HotspotDefinition[]
  activeAction: ActionType
  selectedItem: InventoryItemDefinition | null
  /** CSS background shorthand applied to the scene container */
  backgroundCss?: string
}>()

defineEmits<{
  'hotspot-click': [id: string]
}>()

const backgroundStyle = computed(() =>
  props.backgroundCss ? { background: props.backgroundCss } : {},
)
</script>
