<template>
  <Modal :is-visible="isVisible" @close="handlePrimaryClose">
    <div :key="modalViewKey">
      <template v-if="showDifficultyStep">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold text-semantic-info-400">Choose Difficulty</h2>
            <p class="mt-2 text-white">
              Pick a {{ selectedSizeForDifficultyStep }} puzzle difficulty to play.
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-semantic-neutral-600 px-3 py-2 text-xs font-semibold text-semantic-neutral-200 transition-colors hover:border-semantic-neutral-500 hover:bg-semantic-neutral-800"
            @click="goBackToSizes"
          >
            Back
          </button>
        </div>

        <div class="mt-5 grid gap-3">
          <button
            v-for="difficulty in difficultiesForSize(selectedSizeForDifficultyStep)"
            :key="`${selectedSizeForDifficultyStep}-${difficulty}`"
            type="button"
            class="rounded-xl border px-4 py-4 text-left transition-colors"
            :class="difficultyButtonClass(selectedSizeForDifficultyStep, difficulty)"
            @click="handleDifficultyClick(selectedSizeForDifficultyStep, difficulty)"
          >
            <div class="text-base font-semibold text-white">
              {{ difficultyLabel(difficulty) }}
            </div>
            <div class="mt-1 text-sm text-semantic-neutral-300">
              {{ difficultySubtext(selectedSizeForDifficultyStep, difficulty) }}
            </div>
          </button>
        </div>
      </template>

      <template v-else>
        <h2 class="text-2xl font-bold mb-4" :class="titleColorClass">{{ title }}</h2>
        <p class="text-white mb-2">{{ description }}</p>
        <p v-if="mode === 'rotate'" class="text-semantic-neutral-400 text-sm mb-4">
          Place queens and flags as normal — the whole board spins clockwise after each move. Swipe
          to place multiple flags, and the rotation waits until you lift your finger.
        </p>

        <div class="space-y-3 mt-2">
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
          </div>
        </div>
      </template>
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

const currentMode = computed<'standard' | 'rotate'>(() => props.mode ?? 'standard');
const isRotate = computed(() => currentMode.value === 'rotate');
const selectedSize = ref<string | null>(null);
const modalStep = ref<'size' | 'difficulty'>('size');

const title = computed(() => (isRotate.value ? 'Rotate Mode 🔄' : 'Single Puzzle Mode'));
const titleColorClass = computed(() =>
  isRotate.value ? 'text-semantic-success-400' : 'text-semantic-info-400'
);
const description = computed(() =>
  isRotate.value ? 'The board rotates 90° after every placement!' : 'Choose a puzzle size to play'
);
const showDifficultyStep = computed(
  () => currentMode.value === 'standard' && modalStep.value === 'difficulty' && !!selectedSize.value
);
const selectedSizeForDifficultyStep = computed(() => selectedSize.value ?? '');
const modalViewKey = computed(() => `${modalStep.value}:${selectedSize.value ?? 'none'}`);

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
  return `${difficulties.length} difficulty level${difficulties.length === 1 ? '' : 's'} available`;
}

async function handleSizeClick(sizeKey: string) {
  if (isRotate.value) {
    await queensStore.startRotateModePuzzle(sizeKey);
    emit('close');
    return;
  }

  const difficulties = difficultiesForSize(sizeKey);
  if (difficulties.length === 1) {
    await handleDifficultyClick(sizeKey, difficulties[0]);
    return;
  }

  selectedSize.value = sizeKey;
  modalStep.value = 'difficulty';
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
    resetModalState();
    router.push(`/queens/${puzzleInProgress.id || puzzleInProgress.name}`);
    emit('close');
    return;
  }

  const puzzle = queensStore.getNextUncompletedPuzzleForSizeAndDifficulty(sizeKey, difficulty);
  if (puzzle) {
    resetModalState();
    router.push(`/queens/${puzzle.id}`);
    emit('close');
    return;
  }

  const fallback = queensStore.getFirstPuzzleForSizeAndDifficulty(sizeKey, difficulty);
  if (fallback) {
    resetModalState();
    router.push(`/queens/${fallback.id}`);
    emit('close');
    return;
  }

  alert(`No ${difficulty} ${sizeKey} puzzles are currently available.`);
}

function handlePrimaryClose() {
  resetModalState();
  emit('close');
}

function goBackToSizes() {
  modalStep.value = 'size';
  selectedSize.value = null;
}

function resetModalState() {
  modalStep.value = 'size';
  selectedSize.value = null;
}

watch(
  () => props.isVisible,
  (isVisible) => {
    if (!isVisible) {
      resetModalState();
    }
  }
);
</script>

<script lang="ts">
export default {
  name: 'SinglePuzzleModeModal',
};
</script>
