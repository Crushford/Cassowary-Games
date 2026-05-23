<template>
  <div class="min-h-screen flex flex-col bg-stone-950 text-amber-50">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-amber-900/30 bg-stone-950/90 shrink-0">
      <slot name="back-button">
        <router-link to="/" class="text-sm text-amber-600 hover:text-amber-400 transition-colors">
          ← Back
        </router-link>
      </slot>

      <div class="text-center">
        <span class="tracking-widest uppercase text-xs text-amber-400/70">
          {{ store.gameDefinition.title }}
        </span>
        <span class="mx-2 text-xs text-amber-400/30">·</span>
        <span class="text-xs text-amber-400/50">
          {{ store.currentScene?.name }}
        </span>
      </div>

      <button
        class="text-xs px-2 py-1 rounded border border-amber-800/20 transition-colors"
        :class="showDebug ? 'text-amber-400/70' : 'text-amber-400/40 hover:text-amber-400/70'"
        :aria-pressed="showDebug"
        @click="showDebug = !showDebug"
      >debug</button>
    </div>

    <!-- Main game area -->
    <div class="flex-1 flex flex-col items-center justify-start px-4 pt-4 pb-4 gap-3 overflow-auto">
      <div class="w-full max-w-4xl flex flex-col gap-3">

        <!-- Visual scene (shown in 'scene' or 'both' mode) -->
        <AdventureScene
          v-if="store.currentScene && showScene"
          :visible-hotspots="store.visibleHotspots"
          :active-action="store.activeAction"
          :selected-item="store.selectedItem"
          :background-css="currentBackgroundCss"
          @hotspot-click="store.interact($event)"
        >
          <template #background>
            <slot name="scene-background" :scene-id="store.currentSceneId" />
          </template>
        </AdventureScene>

        <!-- Text-mode available actions (shown in 'text' or 'both' mode, outside debug) -->
        <AdventureAvailableActions
          v-if="showTextActions"
          :actions="store.availableActions"
          @trigger="store.triggerAvailableAction($event)"
        />

        <!-- Interface panel -->
        <div class="rounded-lg border border-amber-900/25 bg-stone-950/70 p-3 flex flex-col gap-2.5">
          <AdventureDialoguePanel :text="store.currentNarration" />

          <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
            <AdventureActionBar
              :active-action="store.activeAction"
              @select-action="store.setActiveAction($event)"
            />

            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="text-xs uppercase tracking-wide shrink-0 text-amber-900/70">
                Inventory
              </span>
              <AdventureInventory
                :inventory="store.inventory"
                :selected-item-id="store.selectedInventoryItemId"
                @select-item="store.selectInventoryItem($event)"
              />
            </div>
          </div>

          <div v-if="store.selectedItem" class="text-xs text-amber-400/60">
            Using:
            <strong class="text-amber-400/90">{{ store.selectedItem.label }}</strong>
            — click a hotspot to use it, or click the item again to deselect.
          </div>

          <!-- Debug panel -->
          <template v-if="showDebug">
            <!-- Available actions inside debug (always shown here regardless of mode) -->
            <AdventureAvailableActions
              v-if="!showTextActions"
              :actions="store.availableActions"
              @trigger="store.triggerAvailableAction($event)"
            />

            <!-- State inspector -->
            <div class="text-xs rounded p-2 border font-mono text-green-400/70 border-green-800/20 bg-green-950/30">
              <div class="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div><span class="opacity-50">scene</span> {{ store.currentSceneId }}</div>
                <div>
                  <span class="opacity-50">action</span>
                  {{ store.activeAction }}{{ store.selectedInventoryItemId ? ` → ${store.selectedInventoryItemId}` : '' }}
                </div>
                <div class="col-span-2">
                  <span class="opacity-50">inventory</span>
                  {{ store.inventoryItemIds.join(', ') || '—' }}
                </div>
                <div class="col-span-2">
                  <span class="opacity-50">flags</span>
                  {{ Object.keys(store.flags).join(', ') || '—' }}
                </div>
                <div class="col-span-2">
                  <span class="opacity-50">quests</span>
                  {{ questSummary || '—' }}
                </div>
              </div>
              <button
                class="mt-1.5 underline text-red-400/60 hover:text-red-400/80 transition-colors"
                @click="store.resetGame()"
              >reset game</button>
            </div>
          </template>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AdventureStoreLike, InteractionMode } from '../stores/createAdventureStore'
import AdventureScene from './AdventureScene.vue'
import AdventureDialoguePanel from './AdventureDialoguePanel.vue'
import AdventureActionBar from './AdventureActionBar.vue'
import AdventureInventory from './AdventureInventory.vue'
import AdventureAvailableActions from './AdventureAvailableActions.vue'

const props = defineProps<{
  store: AdventureStoreLike
  /** Per-scene CSS background strings, keyed by scene id. */
  backgrounds?: Record<string, string>
  /**
   * Controls which interfaces are shown.
   * - 'scene': visual scene only; available actions visible in debug panel
   * - 'text':  no visual scene; available actions shown as primary interface
   * - 'both':  visual scene + available actions both visible (default)
   */
  interactionMode?: InteractionMode
}>()

const store = props.store
const showDebug = ref(false)

const mode = computed(() => props.interactionMode ?? 'both')
const showScene = computed(() => mode.value === 'scene' || mode.value === 'both')
const showTextActions = computed(() => mode.value === 'text' || mode.value === 'both')

const currentBackgroundCss = computed(
  () => props.backgrounds?.[store.currentSceneId] ?? '#1a1209',
)

const questSummary = computed(() => {
  const qs = store.questStates as Record<string, string>
  return Object.entries(qs)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ')
})

defineOptions({ name: 'AdventureGame' })
</script>
