<template>
  <div
    class="absolute cursor-pointer group select-none"
    :style="positionStyle"
    tabindex="0"
    :aria-label="`${verbLabel} ${hotspot.label}`"
    @click="$emit('click', hotspot.id)"
    @keydown.enter.prevent="$emit('click', hotspot.id)"
    @keydown.space.prevent="$emit('click', hotspot.id)"
  >
    <!-- Visual shape per visualType -->
    <div class="relative w-full h-full">

      <!-- Plaque -->
      <div
        v-if="hotspot.visualType === 'plaque'"
        class="w-full h-full rounded border-2 border-amber-600/80 bg-amber-50/75 flex flex-col items-center justify-center px-2 py-1.5 shadow-md"
      >
        <div v-if="vc.title" class="font-bold text-amber-900 leading-none mb-0.5 text-center" style="font-size: clamp(6px, 1.1vw, 13px);">{{ vc.title }}</div>
        <div v-if="vc.subtitle" class="text-amber-800 leading-none mb-0.5 text-center" style="font-size: clamp(5px, 0.9vw, 11px);">{{ vc.subtitle }}</div>
        <div v-if="vc.title || vc.subtitle" class="border-t border-amber-600/40 w-3/4 my-0.5" />
        <div v-if="vc.badge" class="text-amber-700 italic leading-none text-center" style="font-size: clamp(4px, 0.75vw, 9px);">{{ vc.badge }}</div>
      </div>

      <!-- Door -->
      <div
        v-else-if="hotspot.visualType === 'door'"
        class="w-full h-full rounded-t-sm border border-amber-800/30 bg-amber-200/40 relative"
        style="box-shadow: inset 0 0 0 1px rgba(180,120,40,0.15);"
      >
        <div class="absolute inset-x-[15%] top-[8%] bottom-[55%] border border-amber-800/20 rounded-sm" />
        <div class="absolute inset-x-[15%] top-[48%] bottom-[8%] border border-amber-800/20 rounded-sm" />
        <div class="absolute right-[12%] top-1/2 -translate-y-1/2 w-[8%] aspect-square rounded-full bg-amber-700/60 shadow" />
        <!-- Signage badge (e.g. humidity gauge label) -->
        <div
          v-if="vc.badge"
          class="absolute -right-[55%] top-[22%] rounded border border-amber-600/50 bg-amber-50/80 flex flex-col items-center px-0.5 py-0.5"
          style="width: 45%; font-size: clamp(4px, 0.6vw, 7px);"
        >
          <span v-for="(line, i) in vc.badge.split('\n')" :key="i" :class="i === 0 ? 'font-bold text-amber-900' : 'text-red-700'" class="leading-none">{{ line }}</span>
        </div>
      </div>

      <!-- Display Case -->
      <div
        v-else-if="hotspot.visualType === 'case'"
        class="w-full h-full rounded-t-sm border border-sky-300/50 bg-sky-50/10 flex flex-col items-center justify-center gap-1 relative"
        style="backdrop-filter: blur(1px); box-shadow: inset 0 0 12px rgba(200,220,255,0.1);"
      >
        <div class="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-sm pointer-events-none" />
        <div v-if="vc.symbol" class="pointer-events-none" style="font-size: clamp(18px, 3.5vw, 48px);">{{ vc.symbol }}</div>
        <div v-if="vc.title" class="bg-red-600/80 text-white rounded px-0.5 leading-none pointer-events-none text-center" style="font-size: clamp(4px, 0.65vw, 8px);">{{ vc.title }}</div>
        <div v-if="vc.subtitle" class="text-stone-400/70 leading-none pointer-events-none text-center" style="font-size: clamp(3px, 0.55vw, 7px);">{{ vc.subtitle }}</div>
      </div>

      <!-- Fragment (small floor item) -->
      <div
        v-else-if="hotspot.visualType === 'fragment'"
        class="w-full h-full flex items-center justify-center"
      >
        <div class="rotate-12 drop-shadow" style="font-size: clamp(10px, 2.5vw, 28px);">{{ vc.symbol ?? '◆' }}</div>
      </div>

      <!-- Character -->
      <div
        v-else-if="hotspot.visualType === 'character'"
        class="w-full h-full flex flex-col items-center justify-end pb-[5%]"
      >
        <div class="drop-shadow-lg" style="font-size: clamp(24px, 5vw, 64px);">{{ vc.symbol ?? '🙂' }}</div>
        <div
          v-if="vc.badge"
          class="bg-orange-600/90 text-white rounded px-1 leading-none mt-0.5"
          style="font-size: clamp(5px, 0.75vw, 9px);"
        >{{ vc.badge }}</div>
      </div>

      <!-- Exit -->
      <div
        v-else-if="hotspot.visualType === 'exit'"
        class="w-full h-full border-2 border-dashed border-amber-600/40 rounded flex items-center justify-center"
      >
        <span class="text-amber-500/60" style="font-size: clamp(8px, 1.2vw, 14px);">{{ vc.title ?? 'Exit' }} →</span>
      </div>

      <!-- Default: invisible click region -->
      <div v-else class="w-full h-full" />
    </div>

    <!-- Hover tooltip -->
    <div
      class="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/85 text-white rounded px-2 py-0.5 whitespace-nowrap pointer-events-none z-30 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-100"
      style="font-size: clamp(9px, 1vw, 12px);"
    >
      {{ verbLabel }} {{ hotspot.label }}
    </div>

    <!-- Focus / hover highlight ring -->
    <div class="absolute inset-0 rounded pointer-events-none ring-0 group-hover:ring-2 group-focus:ring-2 ring-yellow-400/80 transition-all duration-100" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HotspotDefinition, ActionType, InventoryItemDefinition } from '../types/adventureTypes'

const props = defineProps<{
  hotspot: HotspotDefinition
  activeAction: ActionType
  selectedItem: InventoryItemDefinition | null
}>()

defineEmits<{
  click: [id: string]
}>()

const vc = computed(() => props.hotspot.visualContent ?? {})

const positionStyle = computed(() => ({
  left: `${props.hotspot.position.x}%`,
  top: `${props.hotspot.position.y}%`,
  width: `${props.hotspot.position.width}%`,
  height: `${props.hotspot.position.height}%`,
}))

const verbLabel = computed(() => {
  if (props.activeAction === 'use' && props.selectedItem) {
    return `Use ${props.selectedItem.label} on`
  }
  const labels: Record<ActionType, string> = {
    look: 'Look at',
    take: 'Pick up',
    talk: 'Talk to',
    use: 'Use',
  }
  return labels[props.activeAction]
})
</script>
