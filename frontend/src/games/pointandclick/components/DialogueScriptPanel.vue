<template>
  <div v-if="scene" class="space-y-2">
    <div
      v-for="line in scene.dialogue"
      :key="line.id"
      class="rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft px-3 py-2.5"
      :class="{ 'border-semantic-info-700 bg-semantic-info-900/20': activeCharacterId === line.characterId }"
    >
      <p class="text-xs font-semibold text-semantic-info-300">{{ line.characterName }}</p>
      <p class="mt-1 text-sm leading-relaxed text-semantic-neutral-200">"{{ line.text }}"</p>
    </div>
    <p v-if="!scene.dialogue.length" class="text-sm text-semantic-neutral-500">No dialogue in this scene.</p>
  </div>
  <p v-else class="text-sm text-semantic-neutral-500">No scene selected.</p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePointAndClickAdminStore } from '../stores/pointAndClickAdminStore';

const store = usePointAndClickAdminStore();
const scene = computed(() => store.selectedScene);
const activeCharacterId = computed(() =>
  store.activeInteraction?.kind === 'character' ? store.activeInteraction.entityId : null,
);
</script>
