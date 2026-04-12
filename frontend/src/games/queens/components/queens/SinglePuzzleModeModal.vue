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
              <div>{{ formatDifficultyLabel(difficulty) }}</div>
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
import { useRoute, useRouter } from 'vue-router';
import { useQueensStore } from '../../stores/queensStore';
import {
  buildQueensSelectionRoute,
  isQueensSelectionDifficulty,
  type QueensSelectionDifficulty,
} from '../../utils/puzzleSelectionRoute';
import Modal from '@/shared/components/Modal.vue';

const props = defineProps<{
  isVisible: boolean;
  mode?: 'standard' | 'rotate';
}>();

const emit = defineEmits<{
  close: [];
}>();

const queensStore = useQueensStore();
const route = useRoute();
const router = useRouter();

const currentMode = computed<'standard' | 'rotate'>(() => props.mode ?? 'standard');
const isRotate = computed(() => currentMode.value === 'rotate');

const availableSizes = computed(() => queensStore.getAvailableSizes());
const selectedSize = ref<string>('');
const selectedDistance = ref<number | null>(null);
const selectedDifficulty = ref<QueensSelectionDifficulty | null>(null);

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

function logSinglePuzzleSelection(event: string, detail?: Record<string, unknown>): void {
  console.info('[SinglePuzzleModeModal]', event, {
    fullPath: route.fullPath,
    query: route.query,
    isVisible: props.isVisible,
    isRotate: isRotate.value,
    selectedSize: selectedSize.value,
    selectedDistance: selectedDistance.value,
    selectedDifficulty: selectedDifficulty.value,
    availableSizes: availableSizes.value,
    availableDistances: availableDistances.value,
    availableDifficulties: availableDifficulties.value,
    selectionCount: selectionPuzzles.value.length,
    showDifficultySection: showDifficultySection.value,
    ...detail,
  });
}

function getQuerySize(): string | null {
  const value = route.query.size;
  return typeof value === 'string' ? value : null;
}

function getQueryDistance(): number | null {
  const value = route.query.distance;
  if (typeof value !== 'string') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getQueryDifficulty(): QueensSelectionDifficulty | null {
  const value = route.query.difficulty;
  return typeof value === 'string' && isQueensSelectionDifficulty(value) ? value : null;
}

function initializeSelectionState() {
  const sizes = availableSizes.value;
  if (sizes.length === 0) {
    selectedSize.value = '';
    selectedDistance.value = null;
    selectedDifficulty.value = null;
    return;
  }

  const querySize = getQuerySize();
  const preferredSize =
    querySize && sizes.includes(querySize) ? querySize : sizes.includes('7x7') ? '7x7' : sizes[0];
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

function difficultyCountLabel(difficulty: QueensSelectionDifficulty): string {
  if (!selectedSize.value || selectedDistance.value == null) return '';
  const count = queensStore.countPuzzlesForSelection(
    selectedSize.value,
    selectedDistance.value,
    difficulty
  );
  return `${count} puzzle${count === 1 ? '' : 's'}`;
}

function formatDifficultyLabel(difficulty: QueensSelectionDifficulty): string {
  return difficulty
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function handleRotateSizeClick(sizeKey: string) {
  logSinglePuzzleSelection('rotate:navigate', { sizeKey });
  await queensStore.startRotateModePuzzle(sizeKey);
}

async function handlePlayRandomPuzzle() {
  if (!canPlayRandom.value || selectedDistance.value == null) {
    logSinglePuzzleSelection('play-random:blocked', {
      canPlayRandom: canPlayRandom.value,
    });
    return;
  }

  const puzzle = queensStore.getRandomPuzzleForSelection(
    selectedSize.value,
    selectedDistance.value,
    showDifficultySection.value ? (selectedDifficulty.value ?? undefined) : undefined
  );

  if (!puzzle) {
    logSinglePuzzleSelection('play-random:no-puzzle');
    alert('No puzzle is available for that combination yet.');
    return;
  }

  const targetRoute = buildQueensSelectionRoute({
    sizeKey: selectedSize.value,
    orthogonalMinDistance: selectedDistance.value,
    difficulty: showDifficultySection.value ? selectedDifficulty.value : undefined,
    puzzleId: puzzle.id,
  });
  logSinglePuzzleSelection('play-random:navigate', {
    puzzleId: puzzle.id,
    targetRoute,
  });
  router.push(targetRoute);
}

function handlePrimaryClose() {
  emit('close');
}

function updateSelectionQuery() {
  if (!props.isVisible || isRotate.value) return;

  const nextQuery: Record<string, string> = {
    mode: 'single',
  };

  if (selectedSize.value) {
    nextQuery.size = selectedSize.value;
  }
  if (selectedDistance.value != null) {
    nextQuery.distance = String(selectedDistance.value);
  }
  if (showDifficultySection.value && selectedDifficulty.value != null) {
    nextQuery.difficulty = selectedDifficulty.value;
  }

  const currentSize = typeof route.query.size === 'string' ? route.query.size : undefined;
  const currentDistance =
    typeof route.query.distance === 'string' ? route.query.distance : undefined;
  const currentDifficulty =
    typeof route.query.difficulty === 'string' ? route.query.difficulty : undefined;
  const currentMode = typeof route.query.mode === 'string' ? route.query.mode : undefined;

  if (
    currentMode === nextQuery.mode &&
    currentSize === nextQuery.size &&
    currentDistance === nextQuery.distance &&
    currentDifficulty === nextQuery.difficulty
  ) {
    return;
  }

  logSinglePuzzleSelection('update-selection-query:replace', {
    nextQuery,
    currentMode,
    currentSize,
    currentDistance,
    currentDifficulty,
  });
  router.replace({
    path: '/queens',
    query: nextQuery,
  });
}

watch(
  () => props.isVisible,
  (isVisible) => {
    if (isVisible && !isRotate.value) {
      logSinglePuzzleSelection('watch:isVisible:initialize');
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
      logSinglePuzzleSelection('watch:availableSizes:initialize', { sizes });
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
      logSinglePuzzleSelection('watch:availableDistances:empty');
      selectedDistance.value = null;
      selectedDifficulty.value = null;
      return;
    }

    const queryDistance = getQueryDistance();
    const boardDistance = Number.parseInt(selectedSize.value, 10);
    const preferredDistance =
      queryDistance != null && distances.includes(queryDistance)
        ? queryDistance
        : distances.includes(boardDistance)
          ? boardDistance
          : distances[0];

    if (selectedDistance.value == null || !distances.includes(selectedDistance.value)) {
      logSinglePuzzleSelection('watch:availableDistances:set-distance', {
        queryDistance,
        boardDistance,
        preferredDistance,
      });
      selectedDistance.value = preferredDistance;
    }
    if (!showDifficultySection.value) {
      logSinglePuzzleSelection('watch:availableDistances:disable-difficulty');
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
      logSinglePuzzleSelection('watch:availableDifficulties:hidden');
      selectedDifficulty.value = null;
      return;
    }
    if (difficulties.length === 0) {
      logSinglePuzzleSelection('watch:availableDifficulties:empty');
      selectedDifficulty.value = null;
      return;
    }

    const queryDifficulty = getQueryDifficulty();
    const preferredDifficulty =
      queryDifficulty && difficulties.includes(queryDifficulty)
        ? queryDifficulty
        : difficulties.includes('easy')
          ? 'easy'
          : difficulties[0];

    if (selectedDifficulty.value == null || !difficulties.includes(selectedDifficulty.value)) {
      logSinglePuzzleSelection('watch:availableDifficulties:set-difficulty', {
        queryDifficulty,
        preferredDifficulty,
      });
      selectedDifficulty.value = preferredDifficulty;
    }
  },
  { immediate: true }
);

watch(
  [
    selectedSize,
    selectedDistance,
    selectedDifficulty,
    showDifficultySection,
    () => props.isVisible,
  ],
  () => {
    logSinglePuzzleSelection('watch:selection-state-changed');
    updateSelectionQuery();
  },
  { immediate: true }
);
</script>

<script lang="ts">
export default {
  name: 'SinglePuzzleModeModal',
};
</script>
