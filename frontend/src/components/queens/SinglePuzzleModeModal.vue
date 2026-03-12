<template>
  <Modal :is-visible="isVisible" @close="$emit('close')">
    <div>
      <h2 class="text-2xl font-bold mb-4" :class="titleColorClass">{{ title }}</h2>
      <p class="text-white mb-2">{{ description }}</p>
      <p v-if="mode === 'rotate'" class="text-semantic-neutral-400 text-sm mb-4">
        Place queens and flags as normal — the whole board spins clockwise after each move. Swipe to
        place multiple flags, and the rotation waits until you lift your finger.
      </p>

      <!-- Size Selection -->
      <div class="space-y-3" :class="mode === 'standard' ? '' : 'mt-2'">
        <button
          v-for="size in availableSizes"
          :key="size"
          class="w-full py-4 px-6 rounded-lg transition-colors font-semibold text-left border-2"
          :class="sizeButtonClass(size)"
          @click="handleSizeClick(size)"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="text-lg font-bold">{{ size }}</div>
              <div class="text-sm opacity-90">{{ sizeSubtext(size) }}</div>
            </div>
            <div v-if="mode === 'standard' && hasProgress(size)" class="text-2xl">▶</div>
          </div>
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQueensStore } from '../../stores/queensStore';
import Modal from '../shared/Modal.vue';

const props = defineProps<{
  isVisible: boolean;
  mode?: 'standard' | 'rotate';
}>();

const emit = defineEmits<{
  close: [];
}>();

const queensStore = useQueensStore();
const router = useRouter();

const isRotate = computed(() => props.mode === 'rotate');

const title = computed(() => (isRotate.value ? 'Rotate Mode 🔄' : 'Single Puzzle Mode'));
const titleColorClass = computed(() =>
  isRotate.value ? 'text-semantic-success-400' : 'text-semantic-info-400'
);
const description = computed(() =>
  isRotate.value ? 'The board rotates 90° after every placement!' : 'Choose a puzzle size to play'
);

const availableSizes = computed(() => queensStore.getAvailableSizes());

interface PuzzleInProgress {
  id?: string | number;
  name?: string;
}

function hasProgress(sizeKey: string): boolean {
  return getPuzzleInProgress(sizeKey) !== null;
}

function getPuzzleInProgress(sizeKey: string): PuzzleInProgress | null {
  if (!queensStore.puzzleDatabase || !queensStore.puzzleDatabase[sizeKey]) return null;
  for (const puzzle of queensStore.puzzleDatabase[sizeKey]) {
    const puzzleId = puzzle.id || puzzle.name;
    if (!puzzleId || queensStore.isPuzzleCompleted(puzzleId)) continue;
    const progress = queensStore.getPuzzleProgress(puzzleId);
    if (progress?.some((row) => row?.some((mark) => mark !== null))) return puzzle;
  }
  return null;
}

function sizeButtonClass(size: string): string {
  if (isRotate.value)
    return 'bg-semantic-neutral-700 hover:bg-semantic-neutral-600 text-white border-semantic-neutral-600';
  return hasProgress(size)
    ? 'bg-semantic-success-600 hover:bg-semantic-success-500 text-white border-semantic-success-400'
    : 'bg-semantic-neutral-700 hover:bg-semantic-neutral-600 text-white border-semantic-neutral-600';
}

function sizeSubtext(size: string): string {
  if (isRotate.value) return 'Start rotating puzzle';
  return hasProgress(size) ? 'Continue with current puzzle' : 'Next puzzle';
}

async function handleSizeClick(sizeKey: string) {
  if (isRotate.value) {
    await queensStore.startRotateModePuzzle(sizeKey);
  } else {
    const puzzleInProgress = getPuzzleInProgress(sizeKey);
    if (puzzleInProgress) {
      router.push(`/queens/${puzzleInProgress.id || puzzleInProgress.name}`);
    } else {
      const puzzle = queensStore.getNextUncompletedPuzzleForSize(sizeKey);
      if (puzzle) {
        router.push(`/queens/${puzzle.id}`);
      } else {
        alert(`All ${sizeKey} puzzles are completed!`);
      }
    }
  }
  emit('close');
}
</script>

<script lang="ts">
export default {
  name: 'SinglePuzzleModeModal',
};
</script>
