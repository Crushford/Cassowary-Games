<template>
  <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
    <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-semantic-neutral-400">
      {{ title }}
    </h2>

    <!-- Character grouping: show one row per character -->
    <template v-if="kind === 'character'">
      <div v-for="{ char, candidates: charCandidates } in groupedByCharacter" :key="char.id" class="mt-4">
        <p class="mb-2 text-xs font-medium text-semantic-neutral-300">
          {{ char.name }}
          <span class="text-semantic-neutral-500">— {{ char.role }}</span>
        </p>
        <div class="grid grid-cols-2 gap-2">
          <CandidateCard
            v-for="c in charCandidates"
            :key="c.id"
            :candidate="c"
            @select="store.selectCandidate(c.id)"
          />
        </div>
      </div>
      <p v-if="!groupedByCharacter.length" class="mt-4 text-sm text-semantic-neutral-500">No characters in this scene.</p>
    </template>

    <!-- Background: flat grid -->
    <template v-else>
      <div class="mt-4 grid grid-cols-3 gap-2">
        <CandidateCard
          v-for="c in candidates"
          :key="c.id"
          :candidate="c"
          @select="store.selectCandidate(c.id)"
        />
      </div>
      <p v-if="!candidates.length" class="mt-4 text-sm text-semantic-neutral-500">No candidates.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AssetKind } from '../types';
import { usePointAndClickAdminStore } from '../stores/pointAndClickAdminStore';
import CandidateCard from './CandidateCard.vue';

const props = defineProps<{ kind: AssetKind; title: string }>();

const store = usePointAndClickAdminStore();

const candidates = computed(() => store.candidates.filter((c) => c.kind === props.kind));

const groupedByCharacter = computed(() => {
  if (!store.selectedScene) return [];
  return store.selectedScene.characters.map((char) => ({
    char,
    candidates: candidates.value.filter((c) => c.entityId === char.id),
  }));
});
</script>
