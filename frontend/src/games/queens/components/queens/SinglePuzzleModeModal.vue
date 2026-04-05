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
        <div v-for="size in availableSizes" :key="size" class="space-y-2">
          <button
            class="w-full px-6 py-4 text-left font-semibold transition-colors rounded-lg border-2"
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

          <div
            v-if="mode === 'standard' && selectedSize === size"
            class="rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft p-3"
          >
            <div
              class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400"
            >
              Choose difficulty
            </div>
            <div class="grid gap-2 md:grid-cols-3">
              <button
                v-for="difficulty in difficultiesForSize(size)"
                :key="`${size}-${difficulty}`"
                type="button"
                class="rounded-lg border px-3 py-3 text-left transition-colors"
                :class="difficultyButtonClass(size, difficulty)"
                @click="handleDifficultyClick(size, difficulty)"
              >
                <div class="text-sm font-semibold text-white">
                  {{ difficultyLabel(difficulty) }}
                </div>
                <div class="mt-1 text-xs text-semantic-neutral-300">
                  {{ difficultySubtext(size, difficulty) }}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQueensStore } from '../../stores/queensStore';
import Modal from '@/shared/components/Modal.vue';

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
const selectedSize = ref<string | null>(null);

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
  const difficulties = difficultiesForSize(size);
  return `${difficulties.length} difficulty${difficulties.length === 1 ? 'y' : 'ies'} available`;
}

async function handleSizeClick(sizeKey: string) {
  if (isRotate.value) {
    await queensStore.startRotateModePuzzle(sizeKey);
    emit('close');
    return;
  }

  selectedSize.value = selectedSize.value === sizeKey ? null : sizeKey;
}

function difficultiesForSize(sizeKey: string): Array<'easy' | 'medium' | 'hard'> {
  return queensStore.getAvailableDifficultiesForSize(sizeKey);
}

function difficultyLabel(difficulty: 'easy' | 'medium' | 'hard'): string {
  return `${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`;
}

function getPuzzleInProgressForDifficulty(
  sizeKey: string,
  difficulty: 'easy' | 'medium' | 'hard'
): PuzzleInProgress | null {
  if (!queensStore.puzzleDatabase || !queensStore.puzzleDatabase[sizeKey]) return null;
  for (const puzzle of queensStore.puzzleDatabase[sizeKey]) {
    if ((puzzle.difficulty ?? 'easy') !== difficulty) continue;
    const puzzleId = puzzle.id || puzzle.name;
    if (!puzzleId || queensStore.isPuzzleCompleted(puzzleId)) continue;
    const progress = queensStore.getPuzzleProgress(puzzleId);
    if (progress?.some((row) => row?.some((mark) => mark !== null))) return puzzle;
  }
  return null;
}

function difficultySubtext(sizeKey: string, difficulty: 'easy' | 'medium' | 'hard'): string {
  const count = queensStore.countPuzzlesForSizeAndDifficulty(sizeKey, difficulty);
  const inProgress = getPuzzleInProgressForDifficulty(sizeKey, difficulty);
  if (inProgress) {
    return `Continue in-progress puzzle • ${count} total`;
  }
  return `${count} puzzle${count === 1 ? '' : 's'}`;
}

function difficultyButtonClass(sizeKey: string, difficulty: 'easy' | 'medium' | 'hard'): string {
  if (getPuzzleInProgressForDifficulty(sizeKey, difficulty)) {
    return 'border-semantic-success-400 bg-feedback-successSoft hover:bg-feedback-successSubtle';
  }
  return 'border-semantic-neutral-700 bg-surface-darkSoft hover:border-semantic-neutral-500 hover:bg-semantic-neutral-800';
}

async function handleDifficultyClick(sizeKey: string, difficulty: 'easy' | 'medium' | 'hard') {
  const puzzleInProgress = getPuzzleInProgressForDifficulty(sizeKey, difficulty);
  if (puzzleInProgress) {
    router.push(`/queens/${puzzleInProgress.id || puzzleInProgress.name}`);
    emit('close');
    return;
  }

  const puzzle = queensStore.getNextUncompletedPuzzleForSizeAndDifficulty(sizeKey, difficulty);
  if (puzzle) {
    router.push(`/queens/${puzzle.id}`);
    emit('close');
    return;
  }

  const fallback = queensStore.getFirstPuzzleForSizeAndDifficulty(sizeKey, difficulty);
  if (fallback) {
    router.push(`/queens/${fallback.id}`);
    emit('close');
    return;
  }

  alert(`No ${difficulty} ${sizeKey} puzzles are currently available.`);
}

watch(
  () => props.isVisible,
  (isVisible) => {
    if (!isVisible) {
      selectedSize.value = null;
    }
  }
);
</script>

<script lang="ts">
export default {
  name: 'SinglePuzzleModeModal',
};
</script>
