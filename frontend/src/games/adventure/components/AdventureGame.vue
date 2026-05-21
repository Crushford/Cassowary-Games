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
          :scene="store.currentScene"
          :collected-item-ids="store.collectedItemIds"
          :active-action="store.activeAction"
          :selected-item="store.selectedItem"
          :background-css="backgroundCss"
          @hotspot-click="store.interact($event)"
        >
          <template #background>
            <slot name="scene-background" />
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
            Using:
            <strong style="color: rgba(196,160,80,0.9);">{{ store.selectedItem.label }}</strong>
            — click a hotspot to use it, or click the item again to deselect.
          </div>

          <!-- Debug panel -->
          <div
            v-if="showDebug"
            class="text-xs rounded p-2 border mt-1"
            style="color: rgba(150,200,150,0.7); border-color: rgba(80,140,80,0.2); background: rgba(0,20,0,0.3);"
          >
            <div><strong>Scene:</strong> {{ store.currentSceneId }}</div>
            <div><strong>Flags:</strong> {{ Object.keys(store.flags).join(', ') || 'none' }}</div>
            <div><strong>Collected:</strong> {{ store.collectedItemIds.join(', ') || 'none' }}</div>
            <div><strong>Quests:</strong> {{ JSON.stringify(store.questStates) }}</div>
            <div><strong>Action:</strong> {{ store.activeAction }}</div>
            <button
              class="mt-1 underline"
              style="color: rgba(200,100,100,0.6);"
              @click="store.resetGame()"
            >Reset game</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AdventureScene from './AdventureScene.vue'
import AdventureDialoguePanel from './AdventureDialoguePanel.vue'
import AdventureActionBar from './AdventureActionBar.vue'
import AdventureInventory from './AdventureInventory.vue'

// The store instance is provided by the shell (e.g. TinamouGame.vue).
// Using a typed prop keeps AdventureGame.vue engine-agnostic.
const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any
  /** Optional CSS background shorthand for the scene canvas */
  backgroundCss?: string
}>()

const store = props.store
const showDebug = ref(false)

defineOptions({ name: 'AdventureGame' })
</script>
