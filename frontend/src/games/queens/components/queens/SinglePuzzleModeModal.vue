<template>
  <Modal :is-visible="isVisible" @close="handlePrimaryClose">
    <template v-if="isRotate">
      <h2 class="text-2xl font-bold text-semantic-success-400">Rotate Mode</h2>
      <p class="mt-3 text-white">
        Pick a board size. The board rotates 90° clockwise after each move.
      </p>
      <p class="mt-2 text-sm text-semantic-neutral-400">
        Swipe to place multiple flags, and the rotation waits until you lift your finger.
      </p>

      <div class="mt-5 space-y-3">
        <button
          v-for="size in availableSizes"
          :key="size"
          type="button"
          class="w-full rounded-xl border px-4 py-4 text-left font-semibold transition-colors"
          :class="rotateSizeButtonClass(size)"
          @click="handleRotateSizeClick(size)"
        >
          <div class="text-lg font-bold text-white">{{ size }}</div>
          <div class="mt-1 text-sm text-semantic-neutral-200">Start rotating puzzle</div>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="space-y-5">
        <div>
          <h2 class="text-2xl font-bold text-semantic-info-400">Select Puzzle</h2>
          <p class="mt-2 text-sm leading-6 text-semantic-neutral-200">
            Choose a board size, the minimum row or column spacing between queens, and a difficulty,
            then load a random puzzle.
          </p>
        </div>

        <section class="space-y-2">
          <div class="text-sm font-semibold text-white">Puzzle Size</div>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="size in availableSizes"
              :key="size"
              type="button"
              class="rounded-xl border px-3 py-3 text-sm font-semibold transition-colors"
              :class="selectionButtonClass(selectedSize === size)"
              @click="selectedSize = size"
            >
              {{ size }}
            </button>
          </div>
        </section>

        <section v-if="availableDistances.length" class="space-y-2">
          <div class="text-sm font-semibold text-white">Minimum Queen Distance</div>
          <p class="text-xs leading-5 text-semantic-neutral-400">
            Orthogonal distance means queens in the same row or column must be at least this many
            squares apart.
          </p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="distance in availableDistances"
              :key="`${selectedSize}-${distance}`"
              type="button"
              class="rounded-xl border px-3 py-3 text-sm font-semibold transition-colors"
              :class="selectionButtonClass(selectedDistance === distance)"
              @click="selectedDistance = distance"
            >
              {{ distance }}
            </button>
          </div>
        </section>

        <section v-if="showDifficultySection" class="space-y-2">
          <div class="text-sm font-semibold text-white">Difficulty</div>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="difficulty in availableDifficulties"
              :key="`${selectedSize}-${selectedDistance}-${difficulty}`"
              type="button"
              class="rounded-xl border px-3 py-3 text-sm font-semibold capitalize transition-colors"
              :class="selectionButtonClass(selectedDifficulty === difficulty)"
              @click="selectedDifficulty = difficulty"
            >
              <div>{{ difficulty }}</div>
              <div class="mt-1 text-[11px] font-normal text-semantic-neutral-300">
                {{ difficultyCountLabel(difficulty) }}
              </div>
            </button>
          </div>
        </section>

        <button
          type="button"
          class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-600 px-4 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-semantic-info-500"
          :disabled="!canPlayRandom"
          @click="handlePlayRandomPuzzle"
        >
          Play Random Puzzle
        </button>
      </div>
    </template>
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

const availableSizes = computed(() => queensStore.getAvailableSizes());
const selectedSize = ref<string>('');
const selectedDistance = ref<number | null>(null);
const selectedDifficulty = ref<'easy' | 'medium' | 'hard' | null>(null);

const availableDistances = computed(() => {
  if (!selectedSize.value) return [];
  return queensStore.getAvailableOrthogonalDistancesForSize(selectedSize.value);
});

const availableDifficulties = computed(() => {
  if (!selectedSize.value || selectedDistance.value == null) return [];
  return queensStore.getAvailableDifficultiesForSelection(
    selectedSize.value,
    selectedDistance.value
  );
});

const selectionPuzzles = computed(() => {
  if (!selectedSize.value || selectedDistance.value == null) return [];
  return queensStore.getPuzzlesForSelection(selectedSize.value, selectedDistance.value);
});

const showDifficultySection = computed(() =>
  selectionPuzzles.value.some((puzzle) => puzzle.difficulty != null)
);

const canPlayRandom = computed(
  () =>
    !!selectedSize.value &&
    selectedDistance.value != null &&
    (showDifficultySection.value
      ? selectedDifficulty.value != null &&
        availableDifficulties.value.includes(selectedDifficulty.value)
      : selectionPuzzles.value.length > 0)
);

function initializeSelectionState() {
  const sizes = availableSizes.value;
  if (sizes.length === 0) {
    selectedSize.value = '';
    selectedDistance.value = null;
    selectedDifficulty.value = null;
    return;
  }

  const preferredSize = sizes.includes('7x7') ? '7x7' : sizes[0];
  selectedSize.value = preferredSize;
}

function selectionButtonClass(selected: boolean): string {
  return selected
    ? 'border-semantic-info-400 bg-semantic-info-700 text-white'
    : 'border-semantic-neutral-700 bg-surface-darkSoft text-semantic-neutral-200 hover:border-semantic-neutral-500 hover:bg-semantic-neutral-800';
}

function rotateSizeButtonClass(_size: string): string {
  return 'border-semantic-success-500 bg-semantic-success-700 text-white hover:bg-semantic-success-600';
}

function difficultyCountLabel(difficulty: 'easy' | 'medium' | 'hard'): string {
  if (!selectedSize.value || selectedDistance.value == null) return '';
  const count = queensStore.countPuzzlesForSelection(
    selectedSize.value,
    selectedDistance.value,
    difficulty
  );
  return `${count} puzzle${count === 1 ? '' : 's'}`;
}

async function handleRotateSizeClick(sizeKey: string) {
  await queensStore.startRotateModePuzzle(sizeKey);
  emit('close');
}

async function handlePlayRandomPuzzle() {
  if (!canPlayRandom.value || selectedDistance.value == null) {
    return;
  }

  const puzzle = queensStore.getRandomPuzzleForSelection(
    selectedSize.value,
    selectedDistance.value,
    showDifficultySection.value ? (selectedDifficulty.value ?? undefined) : undefined
  );

  if (!puzzle) {
    alert('No puzzle is available for that combination yet.');
    return;
  }

  emit('close');
  router.push(`/queens/${puzzle.id}`);
}

function handlePrimaryClose() {
  emit('close');
}

watch(
  () => props.isVisible,
  (isVisible) => {
    if (isVisible && !isRotate.value) {
      initializeSelectionState();
    }
  },
  { immediate: true }
);

watch(
  availableSizes,
  (sizes) => {
    if (!props.isVisible || isRotate.value || sizes.length === 0) return;
    if (!selectedSize.value || !sizes.includes(selectedSize.value)) {
      initializeSelectionState();
    }
  },
  { immediate: true }
);

watch(
  availableDistances,
  (distances) => {
    if (isRotate.value) return;
    if (distances.length === 0) {
      selectedDistance.value = null;
      selectedDifficulty.value = null;
      return;
    }

    const preferredDistance = distances.includes(parseInt(selectedSize.value, 10))
      ? parseInt(selectedSize.value, 10)
      : distances[0];

    if (selectedDistance.value == null || !distances.includes(selectedDistance.value)) {
      selectedDistance.value = preferredDistance;
    }
    if (!showDifficultySection.value) {
      selectedDifficulty.value = null;
    }
  },
  { immediate: true }
);

watch(
  availableDifficulties,
  (difficulties) => {
    if (isRotate.value) return;
    if (!showDifficultySection.value) {
      selectedDifficulty.value = null;
      return;
    }
    if (difficulties.length === 0) {
      selectedDifficulty.value = null;
      return;
    }

    const preferredDifficulty = difficulties.includes('easy') ? 'easy' : difficulties[0];

    if (selectedDifficulty.value == null || !difficulties.includes(selectedDifficulty.value)) {
      selectedDifficulty.value = preferredDifficulty;
    }
  },
  { immediate: true }
);
</script>

<script lang="ts">
export default {
  name: 'SinglePuzzleModeModal',
};
</script>
