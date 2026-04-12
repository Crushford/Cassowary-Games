<template>
  <SharedPatternDesigner
    v-model="draft"
    title="Create Pattern Card"
    grid-label="Pattern Grid"
    save-label="Save Card"
    cancel-label="Cancel"
    id-placeholder="pc-custom-1"
    :show-id="true"
    :id-optional="true"
    :show-actions="true"
    :show-cancel="true"
    @save="handleSave"
    @cancel="$emit('cancel')"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SharedPatternDesigner from './SharedPatternDesigner.vue';
import type { PatternEditorDraft } from './patternEditorTypes';

const emit = defineEmits<{
  save: [
    {
      id?: string;
      size: number;
      cells: Array<{ row: number; col: number; activeSquare?: boolean }>;
      outputFlags: Array<{ row: number; col: number }>;
    },
  ];
  cancel: [];
}>();

const draft = ref<PatternEditorDraft>({
  id: '',
  size: 5,
  cells: [],
  outputFlags: [],
});

function handleSave(nextDraft: PatternEditorDraft) {
  emit('save', {
    id: nextDraft.id?.trim() || undefined,
    size: nextDraft.size,
    cells: nextDraft.cells,
    outputFlags: nextDraft.outputFlags,
  });
}

defineOptions({
  name: 'MobilePatternCardDesigner',
});
</script>
