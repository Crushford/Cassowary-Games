<template>
  <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-semantic-neutral-400">Scene Preview</h2>
      <span class="rounded-full bg-semantic-neutral-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-semantic-neutral-400">
        Click characters &amp; objects to interact
      </span>
    </div>

    <!-- Preview canvas -->
    <div
      class="relative w-full overflow-hidden rounded-2xl"
      style="aspect-ratio: 16/9"
    >
      <!-- Background layer -->
      <div
        class="absolute inset-0 transition-all duration-500"
        :style="{ background: store.selectedBackground?.previewGradient ?? 'linear-gradient(180deg, #111827 0%, #1f2937 100%)' }"
      />

      <!-- Ambient overlay for depth -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />

      <!-- Object hotspots (behind characters) -->
      <template v-if="store.layout">
        <button
          v-for="layer in objectLayers"
          :key="layer.entityId"
          type="button"
          class="absolute flex flex-col items-center justify-end transition-all duration-150"
          :style="layerStyle(layer)"
          :class="store.activeEntityId === layer.entityId ? 'scale-105' : 'hover:scale-102'"
          @click="store.toggleEntity(layer.entityId)"
        >
          <!-- Object placeholder: glowing dot at bottom of layer -->
          <div
            class="rounded-full border-2 transition-all duration-150 mb-1"
            :class="
              store.activeEntityId === layer.entityId
                ? 'h-5 w-5 border-semantic-warning-400 bg-semantic-warning-500/50 shadow-[0_0_12px_#f59e0b]'
                : 'h-4 w-4 border-semantic-warning-600 bg-semantic-warning-800/40 hover:border-semantic-warning-400'
            "
          />
          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all"
            :class="
              store.activeEntityId === layer.entityId
                ? 'bg-semantic-warning-500 text-black'
                : 'bg-black/60 text-semantic-neutral-300'
            "
          >
            {{ layer.label }}
          </span>
        </button>
      </template>

      <!-- Character layers -->
      <template v-if="store.layout">
        <button
          v-for="layer in characterLayers"
          :key="layer.entityId"
          type="button"
          class="absolute flex flex-col items-end justify-end transition-all duration-150"
          :style="layerStyle(layer)"
          :class="store.activeEntityId === layer.entityId ? 'scale-105 z-20' : 'hover:scale-102 z-10'"
          @click="store.toggleEntity(layer.entityId)"
        >
          <!-- Character silhouette using selected candidate gradient -->
          <div
            class="w-full rounded-t-[40%] rounded-b-none transition-all duration-300"
            style="height: 85%"
            :style="{
              background: store.selectedCharacterById[layer.entityId]?.previewGradient
                ?? 'linear-gradient(160deg, #1e3a5f 0%, #0f172a 100%)',
              opacity: store.activeEntityId === layer.entityId ? 1 : 0.88,
              boxShadow: store.activeEntityId === layer.entityId ? '0 0 24px rgba(99,179,237,0.4)' : 'none',
            }"
          />
          <!-- Name label -->
          <span
            class="mt-1 self-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all"
            :class="
              store.activeEntityId === layer.entityId
                ? 'bg-semantic-info-500 text-white'
                : 'bg-black/60 text-semantic-neutral-300'
            "
          >
            {{ layer.label }}
          </span>
        </button>
      </template>

      <!-- Empty state -->
      <div
        v-if="!store.layout"
        class="absolute inset-0 flex items-center justify-center text-semantic-neutral-500 text-sm"
      >
        No scene loaded
      </div>
    </div>

    <!-- Interaction / dialogue panel -->
    <div
      class="rounded-2xl border transition-all duration-200 overflow-hidden"
      :class="
        store.activeInteraction
          ? 'border-semantic-info-700 bg-semantic-info-900/20'
          : 'border-semantic-neutral-800 bg-surface-darkSoft'
      "
    >
      <div v-if="store.activeInteraction" class="p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-semantic-info-300">
              {{ store.activeInteraction.kind === 'character' ? 'Character' : 'Interactable' }}
            </p>
            <p class="mt-0.5 text-base font-semibold text-white">{{ store.activeInteraction.label }}</p>
          </div>
          <button
            type="button"
            class="mt-0.5 rounded-full p-1 text-semantic-neutral-400 hover:text-white hover:bg-semantic-neutral-700 transition-colors"
            @click="store.dismissInteraction()"
          >
            ✕
          </button>
        </div>

        <p class="mt-2 text-sm leading-relaxed text-semantic-neutral-300">
          {{ store.activeInteraction.bodyText }}
        </p>

        <!-- Dialogue lines for characters -->
        <div v-if="store.activeInteraction.lines.length" class="mt-3 space-y-2 border-t border-semantic-neutral-700 pt-3">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-semantic-neutral-500">Dialogue</p>
          <div
            v-for="line in store.activeInteraction.lines"
            :key="line.id"
            class="flex gap-2 text-sm text-semantic-neutral-200"
          >
            <span class="shrink-0 font-semibold text-semantic-info-300">{{ line.characterName }}:</span>
            <span class="italic">"{{ line.text }}"</span>
          </div>
        </div>
      </div>

      <div v-else class="flex items-center gap-3 px-4 py-3 text-sm text-semantic-neutral-500">
        <span class="text-base">👆</span>
        Click a character or object in the preview to see their interaction and dialogue.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LayerEntry } from '../types';
import { computed } from 'vue';
import { usePointAndClickAdminStore } from '../stores/pointAndClickAdminStore';

const store = usePointAndClickAdminStore();

const characterLayers = computed(() => store.layout?.layers.filter((l) => l.kind === 'character') ?? []);
const objectLayers = computed(() => store.layout?.layers.filter((l) => l.kind === 'object') ?? []);

function layerStyle(layer: LayerEntry): Record<string, string> {
  return {
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: `${layer.width}%`,
    height: `${layer.height}%`,
  };
}
</script>
