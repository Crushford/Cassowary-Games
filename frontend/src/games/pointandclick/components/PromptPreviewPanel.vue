<template>
  <div class="space-y-4">
    <p v-if="!store.hasPrompts" class="text-xs italic text-semantic-neutral-500">
      No prompts built yet. Use "Build All Prompts" or the per-type Build buttons in the pipeline
      above to generate prompt text for review before spending API credits.
    </p>

    <template v-else>
      <div v-for="group in groupedCandidates" :key="group.kind" class="space-y-2">
        <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-neutral-500">
          {{ group.label }}
          <span class="ml-1 text-semantic-neutral-600">({{ group.candidates.length }})</span>
        </p>

        <div
          v-for="c in group.candidates"
          :key="c.id"
          class="flex gap-3 rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft p-3"
        >
          <div
            class="h-10 w-10 shrink-0 rounded-lg"
            :style="{ background: c.previewGradient }"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-semibold text-semantic-neutral-200">{{ c.title }}</p>
            <p class="mt-1 line-clamp-3 text-[10px] leading-snug text-semantic-neutral-400">
              {{ c.prompt }}
            </p>
            <div v-if="c.imageUrl || c.imageData" class="mt-1 flex items-center gap-1">
              <span class="h-1.5 w-1.5 rounded-full bg-semantic-success-400" />
              <span class="text-[9px] font-semibold uppercase tracking-wide text-semantic-success-400">
                Image ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePointAndClickAdminStore } from '../stores/pointAndClickAdminStore';

const store = usePointAndClickAdminStore();

const groupedCandidates = computed(() => {
  const withPrompts = store.candidates.filter((c) => c.prompt);
  return [
    { kind: 'background', label: 'Backgrounds', candidates: withPrompts.filter((c) => c.kind === 'background') },
    { kind: 'character', label: 'Characters', candidates: withPrompts.filter((c) => c.kind === 'character') },
    { kind: 'item', label: 'Objects', candidates: withPrompts.filter((c) => c.kind === 'item') },
  ].filter((g) => g.candidates.length > 0);
});
</script>
