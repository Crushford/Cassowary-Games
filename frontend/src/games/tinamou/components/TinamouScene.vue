<template>
  <div
    class="relative w-full overflow-hidden rounded-lg select-none"
    style="
      aspect-ratio: 16 / 9;
      background: linear-gradient(
        180deg,
        #d4c49a 0%,
        #c8b07a 30%,
        #b89060 48%,
        #a07848 62%,
        #7a5c38 74%,
        #3d2a18 100%
      );
    "
  >
    <!-- Ceiling trim -->
    <div
      class="absolute top-0 left-0 right-0 pointer-events-none"
      style="height: 9%; background: linear-gradient(180deg, #e8d8b0 0%, transparent 100%);"
    />

    <!-- Gallery title — unobtrusive stamp at top -->
    <div
      class="absolute top-[1.5%] left-1/2 -translate-x-1/2 pointer-events-none tracking-widest uppercase text-amber-200/35"
      style="font-size: clamp(5px, 0.85vw, 10px);"
    >
      Gallery IV — First Basin Civilisation
    </div>

    <!-- Wainscoting band -->
    <div
      class="absolute left-0 right-0 pointer-events-none"
      style="top: 64%; height: 1.5%; background: rgba(140, 90, 30, 0.3);"
    />

    <!-- Baseboard -->
    <div
      class="absolute left-0 right-0 pointer-events-none"
      style="top: 72%; height: 1.2%; background: rgba(100, 65, 20, 0.5);"
    />

    <!-- Stone floor -->
    <div
      class="absolute bottom-0 left-0 right-0 pointer-events-none"
      style="
        height: 28%;
        background: linear-gradient(180deg, #5a3d22 0%, #3a2510 100%);
        border-top: 1px solid rgba(160, 100, 30, 0.35);
      "
    />

    <!-- Left wall shadow -->
    <div
      class="absolute top-0 bottom-0 left-0 w-[3%] pointer-events-none"
      style="background: linear-gradient(90deg, rgba(0,0,0,0.25) 0%, transparent 100%);"
    />

    <!-- Right wall shadow -->
    <div
      class="absolute top-0 bottom-0 right-0 w-[3%] pointer-events-none"
      style="background: linear-gradient(270deg, rgba(0,0,0,0.25) 0%, transparent 100%);"
    />

    <!-- Gallery lighting strip (ceiling) -->
    <div
      class="absolute left-[20%] right-[20%] pointer-events-none"
      style="top: 0; height: 4%; background: radial-gradient(ellipse at 50% 0%, rgba(255,240,200,0.25) 0%, transparent 100%);"
    />

    <!-- Hotspots -->
    <TinamouHotspot
      v-for="hotspot in visibleHotspots"
      :key="hotspot.id"
      :hotspot="hotspot"
      :active-action="activeAction"
      :selected-inventory-item="selectedInventoryItem"
      @click="$emit('hotspot-click', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Scene, ActionType, InventoryItem } from '../types/types'
import TinamouHotspot from './TinamouHotspot.vue'

const props = defineProps<{
  scene: Scene
  collectedItemIds: string[]
  activeAction: ActionType
  selectedInventoryItem: InventoryItem | null
}>()

defineEmits<{
  'hotspot-click': [id: string]
}>()

const visibleHotspots = computed(() =>
  props.scene.hotspots.filter((h) => {
    if (h.take && props.collectedItemIds.includes(h.id)) return false
    return true
  }),
)
</script>
