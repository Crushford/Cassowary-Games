<template>
  <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
    <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-semantic-warning-300">Scenes</h2>
    <ul class="mt-4 space-y-2">
      <li v-for="scene in store.scenes" :key="scene.id">
        <button
          type="button"
          class="w-full rounded-2xl border px-4 py-3 text-left transition-all"
          :class="
            store.selectedSceneId === scene.id
              ? 'border-semantic-warning-500 bg-semantic-warning-900/30 text-white'
              : 'border-semantic-neutral-700 bg-surface-darkSoft text-semantic-neutral-300 hover:border-semantic-neutral-600 hover:text-white'
          "
          @click="store.selectScene(scene.id)"
        >
          <p class="text-sm font-semibold leading-snug">{{ scene.title }}</p>
          <p class="mt-0.5 text-xs text-semantic-neutral-400">{{ scene.location }}</p>
        </button>
      </li>
    </ul>

    <p v-if="store.selectedScene?.sourceMarkdownPath" class="mt-4 text-[11px] leading-relaxed text-semantic-neutral-500">
      Source:
      <span class="font-mono text-semantic-neutral-400">{{ store.selectedScene.sourceMarkdownPath }}</span>
    </p>
  </section>
</template>

<script setup lang="ts">
import { usePointAndClickAdminStore } from '../stores/pointAndClickAdminStore';

const store = usePointAndClickAdminStore();
</script>
