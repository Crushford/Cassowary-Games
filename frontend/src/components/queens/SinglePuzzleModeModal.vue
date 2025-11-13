<template>
  <Modal :is-visible="isVisible" @close="$emit('close')">
    <div>
      <h2 class="text-2xl font-bold text-blue-400 mb-4">Single Puzzle Mode</h2>
      <p class="text-white mb-6">Choose a puzzle size to play</p>

      <!-- Size Selection -->
      <div class="space-y-3">
        <button
          v-for="size in availableSizes"
          :key="size"
          @click="handleSizeClick(size)"
          class="w-full py-4 px-6 rounded-lg transition-colors font-semibold text-left border-2"
          :class="
            hasProgress(size)
              ? 'bg-green-600 hover:bg-green-500 text-white border-green-400'
              : 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
          "
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="text-lg font-bold">{{ size }}</div>
              <div class="text-sm opacity-90">
                {{ hasProgress(size) ? 'Continue with current puzzle' : 'Next puzzle' }}
              </div>
            </div>
            <div v-if="hasProgress(size)" class="text-2xl">▶</div>
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

const queensStore = useQueensStore();
const router = useRouter();

defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const availableSizes = computed(() => {
  return queensStore.getAvailableSizes();
});

function hasProgress(sizeKey: string): boolean {
  return getPuzzleInProgress(sizeKey) !== null;
}

function getPuzzleInProgress(sizeKey: string): any | null {
  if (!queensStore.puzzleDatabase || !queensStore.puzzleDatabase[sizeKey]) {
    return null;
  }

  const puzzlesForSize = queensStore.puzzleDatabase[sizeKey] || [];

  // Find the first puzzle with progress (checking localStorage directly)
  for (const puzzle of puzzlesForSize) {
    const puzzleId = puzzle.id || puzzle.name;
    if (!puzzleId) continue;

    // Check if puzzle is completed - if so, skip it
    if (queensStore.isPuzzleCompleted(puzzleId)) {
      continue;
    }

    // Check for saved progress
    const progress = queensStore.getPuzzleProgress(puzzleId);
    if (progress && progress.length > 0) {
      // Check if progress has any marks (not all null)
      const hasMarks = progress.some((row) => row && row.some((mark) => mark !== null));
      if (hasMarks) {
        return puzzle;
      }
    }
  }

  return null;
}

async function handleSizeClick(sizeKey: string) {
  // Check if there's a puzzle in progress
  const puzzleInProgress = getPuzzleInProgress(sizeKey);

  if (puzzleInProgress) {
    // Load the puzzle in progress
    const puzzleId = puzzleInProgress.id || puzzleInProgress.name;
    router.push(`/queens/${puzzleId}`);
  } else {
    // Load next uncompleted puzzle
    const puzzle = queensStore.getNextUncompletedPuzzleForSize(sizeKey);
    if (puzzle) {
      router.push(`/queens/${puzzle.id}`);
    } else {
      // All puzzles completed - could show a message
      alert(`All ${sizeKey} puzzles are completed!`);
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
