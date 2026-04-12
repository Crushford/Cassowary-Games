<template>
  <div
    class="h-svh w-full max-w-[980px] mx-auto bg-semantic-neutral-900 text-white p-4 overflow-auto"
  >
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-semantic-success-400">Pattern Card Designer</h1>
      <router-link
        to="/queens"
        class="px-3 py-1 rounded bg-semantic-neutral-700 hover:bg-semantic-neutral-600 text-sm"
      >
        Back
      </router-link>
    </div>

    <p class="text-sm text-semantic-neutral-300 mb-4">
      Build pattern cards by painting
      <span class="text-semantic-success-400 font-semibold">active (green)</span>,
      <span class="text-semantic-neutral-300 font-semibold">other (grey)</span>, and
      <span class="text-semantic-warning-300 font-semibold">flag outputs</span>. Default size is
      5x5.
    </p>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="bg-semantic-neutral-800 rounded-lg p-4 space-y-4">
        <SharedPatternDesigner
          v-model="draft"
          grid-label="Grid"
          id-placeholder="pc-custom"
          :show-id="true"
          :show-cost="true"
          :show-reset="true"
          :show-actions="false"
        />
      </div>

      <div class="bg-semantic-neutral-800 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-semantic-neutral-300">Generated Code</div>
          <button
            class="px-3 py-1 rounded bg-semantic-success-700 hover:bg-semantic-success-600 text-sm"
            @click="copyCode"
          >
            Copy
          </button>
        </div>
        <pre class="text-xs bg-semantic-neutral-900 p-3 rounded overflow-auto max-h-[70svh]">{{
          generatedCode
        }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import SharedPatternDesigner from '../components/queens/SharedPatternDesigner.vue';
import type { PatternEditorDraft } from '../components/queens/patternEditorTypes';

const draft = ref<PatternEditorDraft>({
  id: 'pc-custom',
  cost: 60,
  size: 5,
  cells: [],
  outputFlags: [],
});

const generatedCode = computed(() => {
  const cellLines = [...draft.value.cells]
    .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row))
    .map((pos) => `      { row: ${pos.row}, col: ${pos.col}, activeSquare: true },`)
    .join('\n');

  const flagLines = [...draft.value.outputFlags]
    .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row))
    .map((pos) => `      { row: ${pos.row}, col: ${pos.col} },`)
    .join('\n');

  return `  {\n    id: '${draft.value.id ?? ''}',\n    cost: ${draft.value.cost ?? 0},\n    size: ${draft.value.size},\n    cells: [\n${cellLines}\n    ],\n    outputFlags: [\n${flagLines}\n    ],\n  },`;
});

async function copyCode() {
  try {
    await navigator.clipboard.writeText(generatedCode.value);
  } catch {
    // no-op fallback for unsupported clipboard environments
  }
}

defineOptions({
  name: 'PatternCardDesigner',
});
</script>
