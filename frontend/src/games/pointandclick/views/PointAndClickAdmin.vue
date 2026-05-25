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
                :severity="store.generationMode === 'openai' ? 'success' : 'contrast'"
                :value="store.generationMode === 'openai' ? 'Mode: OpenAI' : 'Mode: Mock'"
                rounded
              />
              <Button
                label="Export Scene"
                severity="secondary"
                outlined
                icon="pi pi-download"
                :disabled="!store.layout || store.isAnyGenerating"
                @click="handleExport"
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

        <!-- ── Asset Pipeline ─────────────────────────────────────────────────── -->
        <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
          <div class="mb-4 flex items-center justify-between">
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400">
              Asset Pipeline
            </p>
            <div class="flex gap-2">
              <Button
                label="Build All Prompts"
                size="small"
                severity="secondary"
                outlined
                icon="pi pi-file-edit"
                :disabled="store.isAnyGenerating || store.loading"
                @click="store.buildPrompts()"
              />
              <Button
                label="Generate All"
                size="small"
                severity="info"
                outlined
                icon="pi pi-sparkles"
                :disabled="!store.hasPrompts || store.isAnyGenerating"
                @click="store.generateAll()"
              />
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div
              v-for="type in pipelineTypes"
              :key="type"
              class="flex flex-col gap-3 rounded-2xl border border-semantic-neutral-700 bg-surface-darkSoft p-4"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold capitalize text-semantic-neutral-200">
                  {{ type }}
                </span>
                <Tag
                  :severity="statusSeverity(store.typeStatus[type])"
                  :value="store.typeStatus[type]"
                  rounded
                />
              </div>

              <p
                v-if="store.typeMessage[type]"
                class="text-[11px] leading-snug text-semantic-neutral-400"
              >
                {{ store.typeMessage[type] }}
              </p>
              <p v-else class="text-[11px] text-semantic-neutral-600 italic">
                No prompts built yet.
              </p>

              <div class="mt-auto flex gap-2">
                <Button
                  label="Build"
                  size="small"
                  severity="secondary"
                  outlined
                  class="flex-1"
                  :loading="store.typeStatus[type] === 'pending' && !store.typeMessage[type]?.includes('image')"
                  :disabled="store.typeStatus[type] === 'pending' || store.typeStatus[type] === 'running'"
                  @click="store.buildPrompts(type)"
                />
                <Button
                  label="Generate"
                  size="small"
                  severity="info"
                  class="flex-1"
                  :loading="store.typeStatus[type] === 'running'"
                  :disabled="store.typeStatus[type] === 'pending' || store.typeStatus[type] === 'running'"
                  @click="store.generateType(type)"
                />
              </div>
            </div>
          </div>
        </section>
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

        <!-- Right: Asset Candidates + Layers/Dialogue/Prompts tabs -->
        <div class="flex flex-col gap-5">
          <AssetCandidateGrid kind="background" title="Background Candidates" />
          <AssetCandidateGrid kind="character" title="Character Candidates" />

          <!-- Layers / Dialogue / Prompts tab panel -->
          <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
            <Tabs v-model:value="rightTab">
              <TabList class="gap-2 mb-4">
                <Tab value="layers" class="rounded-full px-3 py-1.5 text-xs font-semibold">
                  Scene Layers
                </Tab>
                <Tab value="dialogue" class="rounded-full px-3 py-1.5 text-xs font-semibold">
                  Dialogue Script
                </Tab>
                <Tab value="prompts" class="rounded-full px-3 py-1.5 text-xs font-semibold">
                  Prompts
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel value="layers">
                  <SceneLayerList />
                </TabPanel>
                <TabPanel value="dialogue">
                  <DialogueScriptPanel />
                </TabPanel>
                <TabPanel value="prompts">
                  <PromptPreviewPanel />
                </TabPanel>
              </TabPanels>
            </Tabs>
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
import PromptPreviewPanel from '../components/PromptPreviewPanel.vue';
import { usePointAndClickAdminStore } from '../stores/pointAndClickAdminStore';
import type { GenerationStatus } from '../stores/pointAndClickAdminStore';
import type { PromptType } from '../admin/api';

const store = usePointAndClickAdminStore();
const rightTab = ref<string>('layers');

const pipelineTypes: PromptType[] = ['backgrounds', 'characters', 'objects'];

function statusSeverity(status: GenerationStatus): 'success' | 'danger' | 'info' | 'secondary' {
  if (status === 'complete') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending' || status === 'running') return 'info';
  return 'secondary';
}

async function handleExport() {
  const result = await store.exportScene();
  if (result) {
    console.log('Scene exported:', result.sceneId);
  }
}
</script>
