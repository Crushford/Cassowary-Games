<template>
  <Modal :is-visible="isVisible" @close="handleClose">
    <div class="space-y-5">
      <div>
        <h2 class="text-2xl font-bold text-semantic-warning-300">Honey Pot Ant Farming</h2>
        <p class="mt-2 text-sm leading-6 text-semantic-neutral-200">
          Level {{ levelIndex }} introduces a {{ sizeKey }} {{ difficultyLabel }} farm.
        </p>
      </div>

      <div class="rounded-2xl border border-semantic-neutral-700 bg-surface-darkSoft p-4">
        <p class="text-sm font-semibold text-white">Base rules</p>
        <ul class="mt-3 space-y-2 text-sm text-semantic-neutral-200">
          <li>One queen per row.</li>
          <li>One queen per column.</li>
          <li>One queen per colour group.</li>
          <li>Queens do not touch diagonally.</li>
        </ul>
      </div>

      <p class="text-xs leading-5 text-semantic-neutral-400">
        Need help during the level? Use Hint to learn the next solver step on the live board.
      </p>

      <button
        type="button"
        class="w-full rounded-xl border border-semantic-warning-400 bg-semantic-warning-500 px-4 py-3 text-sm font-semibold text-semantic-neutral-950 transition-colors hover:bg-semantic-warning-400"
        @click="handleClose"
      >
        Start Level
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Modal from '@/shared/components/Modal.vue';

const props = defineProps<{
  isVisible: boolean;
  levelIndex: number;
  sizeKey: string;
  difficulty: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const difficultyLabel = computed(() =>
  props.difficulty
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
);

function handleClose() {
  emit('close');
}
</script>
