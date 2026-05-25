<template>
  <section
    v-if="scene"
    class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5 space-y-5"
  >
    <div>
      <h2 class="text-xl font-semibold text-white">{{ scene.title }}</h2>
      <p class="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-semantic-warning-300">
        {{ scene.location }}
      </p>
      <p class="mt-1 text-xs italic text-semantic-neutral-400">{{ scene.mood }}</p>
    </div>

    <div>
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400">Background</h3>
      <p class="text-sm leading-relaxed text-semantic-neutral-300">{{ scene.backgroundDescription }}</p>
    </div>

    <div>
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400">
        Characters ({{ scene.characters.length }})
      </h3>
      <ul class="space-y-3">
        <li
          v-for="char in scene.characters"
          :key="char.id"
          class="rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft p-3"
        >
          <p class="text-sm font-semibold text-white">{{ char.name }}</p>
          <p class="text-xs text-semantic-info-300">{{ char.role }}</p>
          <p class="mt-1 text-xs leading-relaxed text-semantic-neutral-400">{{ char.description }}</p>
        </li>
      </ul>
    </div>

    <div>
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400">
        Interactables ({{ scene.interactables.length }})
      </h3>
      <ul class="space-y-2">
        <li
          v-for="obj in scene.interactables"
          :key="obj.id"
          class="rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft p-3"
        >
          <p class="text-sm font-semibold text-white">{{ obj.name }}</p>
          <p class="mt-1 text-xs leading-relaxed text-semantic-neutral-400">{{ obj.description }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { usePointAndClickAdminStore } from '../stores/pointAndClickAdminStore';
import { computed } from 'vue';

const store = usePointAndClickAdminStore();
const scene = computed(() => store.selectedScene);
</script>
