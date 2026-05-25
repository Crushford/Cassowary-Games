<template>
  <div
    class="min-h-screen select-text bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(5,150,105,0.10),_transparent_28%),linear-gradient(180deg,_#111827_0%,_#0f172a_100%)] px-6 py-8 text-white"
  >
    <div class="mx-auto flex max-w-[1800px] flex-col gap-6">

      <!-- ── Header ──────────────────────────────────────────────────────────── -->
      <header class="space-y-5">
        <Toolbar class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm px-5 py-5">
          <template #start>
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.28em] text-semantic-warning-300">
                Point &amp; Click Admin
              </p>
              <h1 class="mt-2 text-4xl font-bold tracking-tight">Scene Workshop</h1>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-semantic-neutral-300">
                Build point-and-click scenes from Cassowary World lore. Select a background, assign
                character poses, compose the layout, and preview interactions.
              </p>
            </div>
          </template>
          <template #end>
            <div class="flex flex-wrap items-center justify-end gap-3">
              <Tag severity="warn" value="Prototype" rounded />
              <Tag
                :severity="store.generationStatus === 'complete' ? 'success' : store.generationStatus === 'failed' ? 'danger' : 'contrast'"
                :value="store.generationStatus === 'idle' ? 'Images: Mocked' : store.generationMessage"
                rounded
              />
              <Button
                v-if="store.isGenerating"
                label="Generating…"
                severity="info"
                outlined
                disabled
              />
              <Button
                v-else
                label="Generate Assets"
                severity="info"
                outlined
                icon="pi pi-sparkles"
                @click="store.generateAssets()"
              />
              <Button
                v-if="store.selectedScene"
                label="Play Scene"
                severity="success"
                icon="pi pi-play"
                :as="RouterLink"
                :to="`/pointandclick/play/${store.selectedScene.id}`"
              />
            </div>
          </template>
        </Toolbar>

        <!-- Stats row -->
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStat
            label="Scene"
            :value="store.selectedScene?.title ?? '—'"
            :detail="store.selectedScene?.location"
          />
          <AdminStat
            label="Characters"
            :value="store.selectedScene?.characters.length ?? 0"
            detail="in scene"
          />
          <AdminStat
            label="Interactables"
            :value="store.selectedScene?.interactables.length ?? 0"
            detail="hotspots"
          />
          <AdminStat
            label="Dialogue Lines"
            :value="store.selectedScene?.dialogue.length ?? 0"
            detail="scripted"
          />
        </div>
      </header>

      <!-- ── Main 3-column layout ────────────────────────────────────────────── -->
      <div class="grid gap-5 xl:grid-cols-[280px_1fr_320px]">

        <!-- Left: Scene Explorer + Scene Detail -->
        <div class="flex flex-col gap-5">
          <SceneExplorer />
          <SceneDetailPanel />
        </div>

        <!-- Center: Preview -->
        <ScenePreview />

        <!-- Right: Asset Candidates + Layers/Dialogue tabs -->
        <div class="flex flex-col gap-5">
          <AssetCandidateGrid kind="background" title="Background Candidates" />
          <AssetCandidateGrid kind="character" title="Character Candidates" />

          <!-- Layers / Dialogue tab panel -->
          <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
            <Tabs v-model:value="rightTab">
              <TabList class="gap-2 mb-4">
                <Tab value="layers" class="rounded-full px-3 py-1.5 text-xs font-semibold">
                  Scene Layers
                </Tab>
                <Tab value="dialogue" class="rounded-full px-3 py-1.5 text-xs font-semibold">
                  Dialogue Script
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel value="layers">
                  <SceneLayerList />
                </TabPanel>
                <TabPanel value="dialogue">
                  <DialogueScriptPanel />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </section>

          <!-- Future pipeline note -->
          <section class="rounded-[30px] border border-semantic-neutral-700 bg-surface-darkSoft px-5 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-500 mb-2">
              Future Pipeline
            </p>
            <ol class="space-y-1 text-xs text-semantic-neutral-500 list-decimal list-inside">
              <li>Parse scene manifest from <code class="text-semantic-neutral-400">cassowary-world-lore/scenes/</code></li>
              <li>Generate asset candidates via OpenAI image API</li>
              <li>Select background, characters, items</li>
              <li>Compose scene layout (drag-and-drop)</li>
              <li>Export as playable point-and-click scene</li>
              <li>Write selected assets back to lore repo via GitHub API</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import Toolbar from 'primevue/toolbar';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import AdminStat from '@/games/queens/components/admin/AdminStat.vue';
import SceneExplorer from '../components/SceneExplorer.vue';
import SceneDetailPanel from '../components/SceneDetailPanel.vue';
import AssetCandidateGrid from '../components/AssetCandidateGrid.vue';
import SceneLayerList from '../components/SceneLayerList.vue';
import DialogueScriptPanel from '../components/DialogueScriptPanel.vue';
import ScenePreview from '../components/ScenePreview.vue';
import { usePointAndClickAdminStore } from '../stores/pointAndClickAdminStore';

const store = usePointAndClickAdminStore();
const rightTab = ref<string>('layers');
</script>
