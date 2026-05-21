<template>
  <div class="min-h-screen flex flex-col" style="background: #1a1209; color: #f5e6c8;">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b shrink-0"
      style="background: rgba(10,6,2,0.85); border-color: rgba(140,80,20,0.3);"
    >
      <slot name="back-button">
        <router-link
          to="/"
          class="text-sm transition-colors"
          style="color: #c49040;"
          onmouseover="this.style.color='#e8b860'"
          onmouseout="this.style.color='#c49040'"
        >← Back</router-link>
      </slot>

      <div class="text-center">
        <span class="tracking-widest uppercase text-xs" style="color: rgba(196,160,80,0.7);">
          {{ store.gameDefinition.title }}
        </span>
        <span class="mx-2 text-xs" style="color: rgba(196,160,80,0.3);">·</span>
        <span class="text-xs" style="color: rgba(196,160,80,0.5);">
          {{ store.currentScene?.name }}
        </span>
      </div>

      <button
        class="text-xs transition-colors px-2 py-1 rounded"
        style="color: rgba(196,160,80,0.4); border: 1px solid rgba(140,80,20,0.2);"
        onmouseover="this.style.color='rgba(196,160,80,0.7)'"
        onmouseout="this.style.color='rgba(196,160,80,0.4)'"
        :aria-pressed="showDebug"
        @click="showDebug = !showDebug"
      >debug</button>
    </div>

    <!-- Main game area -->
    <div class="flex-1 flex flex-col items-center justify-start px-4 pt-4 pb-4 gap-3 overflow-auto">
      <div class="w-full max-w-4xl flex flex-col gap-3">

        <!-- Scene -->
        <AdventureScene
          v-if="store.currentScene"
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

        <!-- Interface panel -->
        <div
          class="rounded-lg border p-3 flex flex-col gap-2.5"
          style="background: rgba(20,12,4,0.7); border-color: rgba(140,80,20,0.25);"
        >
          <AdventureDialoguePanel :text="store.currentNarration" />

          <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
            <AdventureActionBar
              :active-action="store.activeAction"
              @select-action="store.setActiveAction($event)"
            />

            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span
                class="text-xs uppercase tracking-wide shrink-0"
                style="color: rgba(140,80,20,0.7);"
              >Inventory</span>
              <AdventureInventory
                :inventory="store.inventory"
                :selected-item-id="store.selectedInventoryItemId"
                @select-item="store.selectInventoryItem($event)"
              />
            </div>
          </div>

          <div
            v-if="store.selectedItem"
            class="text-xs"
            style="color: rgba(196,160,80,0.6);"
          >
            Using: <strong style="color: rgba(196,160,80,0.9);">{{ store.selectedItem.label }}</strong>
            — click a hotspot to use it, or click the item again to deselect.
          </div>

          <!-- Debug panel -->
          <template v-if="showDebug">
            <!-- Available actions — text-only play helper -->
            <AdventureAvailableActions
              :actions="store.availableActions"
              @trigger="store.triggerAvailableAction($event)"
            />

            <!-- State inspector -->
            <div
              class="text-xs rounded p-2 border font-mono"
              style="color: rgba(150,200,150,0.7); border-color: rgba(80,140,80,0.2); background: rgba(0,20,0,0.3);"
            >
              <div class="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div><span class="opacity-50">scene</span> {{ store.currentSceneId }}</div>
                <div><span class="opacity-50">action</span> {{ store.activeAction }}{{ store.selectedInventoryItemId ? ` → ${store.selectedInventoryItemId}` : '' }}</div>
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
                class="mt-1.5 underline"
                style="color: rgba(200,100,100,0.6);"
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
import AdventureScene from './AdventureScene.vue'
import AdventureDialoguePanel from './AdventureDialoguePanel.vue'
import AdventureActionBar from './AdventureActionBar.vue'
import AdventureInventory from './AdventureInventory.vue'
import AdventureAvailableActions from './AdventureAvailableActions.vue'

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any
  /**
   * Per-scene CSS background strings, keyed by scene id.
   * Falls back to a default dark background when a scene has no entry.
   */
  backgrounds?: Record<string, string>
}>()

const store = props.store
const showDebug = ref(false)

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
