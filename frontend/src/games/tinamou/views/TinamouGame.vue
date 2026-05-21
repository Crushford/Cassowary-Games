<template>
  <div class="min-h-screen flex flex-col" style="background: #1a1209; color: #f5e6c8;">
    <!-- Header bar -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b shrink-0"
      style="background: rgba(10, 6, 2, 0.85); border-color: rgba(140, 80, 20, 0.3);"
    >
      <router-link
        to="/"
        class="text-sm transition-colors"
        style="color: #c49040;"
        onmouseover="this.style.color='#e8b860'"
        onmouseout="this.style.color='#c49040'"
      >
        ← Back
      </router-link>
      <div class="text-center">
        <span class="tracking-widest uppercase text-xs" style="color: rgba(196, 160, 80, 0.7);">
          Tinamou Mystery
        </span>
        <span class="mx-2 text-xs" style="color: rgba(196, 160, 80, 0.3);">·</span>
        <span class="text-xs" style="color: rgba(196, 160, 80, 0.5);">
          {{ store.currentScene?.name }}
        </span>
      </div>
      <button
        class="text-xs transition-colors px-2 py-1 rounded"
        style="color: rgba(196, 160, 80, 0.4); border: 1px solid rgba(140, 80, 20, 0.2);"
        onmouseover="this.style.color='rgba(196,160,80,0.7)'"
        onmouseout="this.style.color='rgba(196,160,80,0.4)'"
        @click="showDebug = !showDebug"
        title="Toggle debug info"
      >
        debug
      </button>
    </div>

    <!-- Main game area -->
    <div class="flex-1 flex flex-col items-center justify-start px-4 pt-4 pb-4 gap-3 overflow-auto">
      <div class="w-full max-w-4xl flex flex-col gap-3">

        <!-- Scene -->
        <TinamouScene
          v-if="store.currentScene"
          :scene="store.currentScene"
          :collected-item-ids="store.collectedItemIds"
          :active-action="store.activeAction"
          :selected-inventory-item="store.selectedInventoryItem"
          @hotspot-click="store.interact($event)"
        />

        <!-- Interface panel -->
        <div
          class="rounded-lg border p-3 flex flex-col gap-2.5"
          style="background: rgba(20, 12, 4, 0.7); border-color: rgba(140, 80, 20, 0.25);"
        >
          <!-- Dialogue box -->
          <TinamouDialoguePanel :text="store.currentDialogue" />

          <!-- Action bar + inventory row -->
          <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
            <TinamouActionBar
              :active-action="store.activeAction"
              @select-action="store.setActiveAction($event)"
            />

            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span
                class="text-xs uppercase tracking-wide shrink-0"
                style="color: rgba(140, 80, 20, 0.7);"
              >
                Inventory
              </span>
              <TinamouInventory
                :inventory="store.inventory"
                :selected-item-id="store.selectedInventoryItemId"
                @select-item="store.selectInventoryItem($event)"
              />
            </div>
          </div>

          <!-- Selected item indicator -->
          <div
            v-if="store.selectedInventoryItem"
            class="text-xs"
            style="color: rgba(196, 160, 80, 0.6);"
          >
            Using: <strong style="color: rgba(196, 160, 80, 0.9);">{{ store.selectedInventoryItem.label }}</strong>
            — click a hotspot to use it, or click the item again to deselect.
          </div>

          <!-- Debug panel -->
          <div
            v-if="showDebug"
            class="text-xs rounded p-2 border"
            style="color: rgba(150, 200, 150, 0.7); border-color: rgba(80, 140, 80, 0.2); background: rgba(0, 20, 0, 0.3);"
          >
            <div><strong>Flags:</strong> {{ Object.keys(store.flags).join(', ') || 'none' }}</div>
            <div><strong>Collected:</strong> {{ store.collectedItemIds.join(', ') || 'none' }}</div>
            <div><strong>Action:</strong> {{ store.activeAction }}</div>
            <div v-if="store.selectedInventoryItemId"><strong>Using:</strong> {{ store.selectedInventoryItemId }}</div>
            <button
              class="mt-1 underline"
              style="color: rgba(200, 100, 100, 0.6);"
              @click="store.resetGame()"
            >
              Reset game
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTinamouStore } from '../stores/tinamouStore'
import TinamouScene from '../components/TinamouScene.vue'
import TinamouDialoguePanel from '../components/TinamouDialoguePanel.vue'
import TinamouActionBar from '../components/TinamouActionBar.vue'
import TinamouInventory from '../components/TinamouInventory.vue'

const store = useTinamouStore()
const showDebug = ref(false)

defineOptions({ name: 'TinamouGame' })
</script>
