<template>
  <section class="space-y-6">
    <AdminPanel
      title="Puzzle Catalog Cleanup"
      description="Review puzzle groups by board size, orthogonal distance, queen count, and minimum region size. Filter the groups, sort by any column, and remove an exact ruleset bucket in one action."
    >
      <template #actions>
        <Button
          type="button"
          :label="loading ? 'Refreshing…' : 'Refresh'"
          outlined
          :disabled="loading"
          @click="refreshCatalog"
        />
      </template>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <label class="space-y-2 text-sm text-semantic-neutral-300">
          <span class="block">Search</span>
          <InputText v-model="searchText" class="w-full" placeholder="Search values" />
        </label>
        <label class="space-y-2 text-sm text-semantic-neutral-300">
          <span class="block">Board Size</span>
          <select
            v-model="selectedSize"
            class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
          >
            <option value="">All sizes</option>
            <option v-for="size in sizeOptions" :key="size" :value="String(size)">
              {{ size }} x {{ size }}
            </option>
          </select>
        </label>
        <label class="space-y-2 text-sm text-semantic-neutral-300">
          <span class="block">Min Distance</span>
          <select
            v-model="selectedDistance"
            class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
          >
            <option value="">All distances</option>
            <option v-for="distance in distanceOptions" :key="distance" :value="String(distance)">
              {{ formatDistanceOption(distance) }}
            </option>
          </select>
        </label>
        <label class="space-y-2 text-sm text-semantic-neutral-300">
          <span class="block">Queens</span>
          <select
            v-model="selectedQueenCount"
            class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
          >
            <option value="">All counts</option>
            <option
              v-for="queenCount in queenCountOptions"
              :key="queenCount"
              :value="String(queenCount)"
            >
              {{ queenCount }}
            </option>
          </select>
        </label>
        <label class="space-y-2 text-sm text-semantic-neutral-300">
          <span class="block">Min Group Size</span>
          <select
            v-model="selectedMinimumGroupSize"
            class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
          >
            <option value="">All group sizes</option>
            <option
              v-for="minimumGroupSize in minimumGroupSizeOptions"
              :key="minimumGroupSize"
              :value="String(minimumGroupSize)"
            >
              {{ minimumGroupSize }}
            </option>
          </select>
        </label>
        <label class="space-y-2 text-sm text-semantic-neutral-300">
          <span class="block">Ruleset Status</span>
          <select
            v-model="selectedRulesetStatus"
            class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
          >
            <option value="">All rulesets</option>
            <option value="active">Active frontier rulesets</option>
            <option value="blocked">Blocked redundant rulesets</option>
          </select>
        </label>
        <label class="space-y-2 text-sm text-semantic-neutral-300">
          <span class="block">Difficulty</span>
          <select
            v-model="selectedDifficulty"
            class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
          >
            <option value="">All difficulties</option>
            <option v-for="difficulty in difficultyOptions" :key="difficulty" :value="difficulty">
              {{ formatDifficulty(difficulty) }}
            </option>
          </select>
        </label>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <AdminStat label="Total Puzzles" :value="stats?.totalPuzzles ?? 0" />
        <AdminStat label="Ruleset Groups" :value="groups.length" />
        <AdminStat label="Filtered Groups" :value="filteredGroups.length" />
      </div>

      <AdminMessage v-if="errorMessage" severity="error" class="mt-5">
        {{ errorMessage }}
      </AdminMessage>

      <AdminMessage v-if="successMessage" severity="success" class="mt-5">
        {{ successMessage }}
      </AdminMessage>

      <div class="mt-5 overflow-hidden rounded-[24px] border border-semantic-neutral-800">
        <DataTable
          :value="filteredGroups"
          data-key="groupKey"
          paginator
          :rows="20"
          :rows-per-page-options="[10, 20, 50, 100]"
          removable-sort
          sort-field="count"
          :sort-order="-1"
          striped-rows
          table-style="min-width: 56rem"
          paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          current-page-report-template="{first} to {last} of {totalRecords}"
        >
          <template #empty>
            <div class="px-4 py-8 text-center text-sm text-semantic-neutral-400">
              {{
                loading ? 'Loading puzzle groups…' : 'No puzzle groups match the current filters.'
              }}
            </div>
          </template>

          <Column field="size" header="Board" sortable>
            <template #body="{ data }"> {{ data.size }} x {{ data.size }} </template>
          </Column>
          <Column field="orthogonalMinDistance" header="Min Distance" sortable>
            <template #body="{ data }">
              {{ formatDistanceValue(data.size, data.orthogonalMinDistance) }}
            </template>
          </Column>
          <Column field="targetQueenCount" header="Queens" sortable />
          <Column field="minimumGroupSize" header="Min Group Size" sortable />
          <Column field="difficultySortKey" header="Difficulty" sortable>
            <template #body="{ data }">
              {{ formatDifficulty(data.difficulty) }}
            </template>
          </Column>
          <Column field="count" header="Puzzle Count" sortable />
          <Column header="Actions" :exportable="false">
            <template #body="{ data }">
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  :disabled="openingGroupKey === data.groupKey"
                  class="inline-flex items-center justify-center rounded-md border border-semantic-info-700 bg-feedback-infoFaint px-3 py-2 text-sm font-medium text-semantic-info-100 transition hover:bg-feedback-infoSoft"
                  @click="openRandomCatalogPuzzle(data)"
                >
                  {{ openingGroupKey === data.groupKey ? 'Opening…' : 'Play Random' }}
                </button>
                <button
                  type="button"
                  :disabled="openingGroupKey === data.groupKey"
                  class="inline-flex items-center justify-center rounded-md border border-semantic-success-700 bg-feedback-successSubtle px-3 py-2 text-sm font-medium text-semantic-success-100 transition hover:bg-feedback-successSoft"
                  @click="openRandomCatalogPuzzleInSolver(data)"
                >
                  {{ openingGroupKey === data.groupKey ? 'Opening…' : 'Open In Solver' }}
                </button>
                <Button
                  size="small"
                  severity="danger"
                  outlined
                  :disabled="deletingGroupKey === data.groupKey"
                  @click="promptDelete(data)"
                >
                  {{ deletingGroupKey === data.groupKey ? 'Deleting…' : 'Delete Category' }}
                </Button>
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </AdminPanel>

    <Dialog
      v-model:visible="deleteDialogVisible"
      modal
      header="Delete Puzzle Category"
      :style="{ width: 'min(92vw, 34rem)' }"
    >
      <div v-if="groupPendingDelete" class="space-y-4 text-sm text-semantic-neutral-200">
        <p>This will permanently delete every puzzle with this exact ruleset:</p>
        <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
          <div>Board: {{ groupPendingDelete.size }} x {{ groupPendingDelete.size }}</div>
          <div>
            Min distance:
            {{
              formatDistanceValue(groupPendingDelete.size, groupPendingDelete.orthogonalMinDistance)
            }}
          </div>
          <div>Queens: {{ groupPendingDelete.targetQueenCount }}</div>
          <div>Min group size: {{ groupPendingDelete.minimumGroupSize }}</div>
          <div>Difficulty: {{ formatDifficulty(groupPendingDelete.difficulty) }}</div>
          <div class="mt-2 font-semibold text-white">
            {{ groupPendingDelete.count }} puzzle{{ groupPendingDelete.count === 1 ? '' : 's' }}
          </div>
        </div>
        <p class="text-semantic-warning-200">This action cannot be undone.</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <Button label="Cancel" text @click="deleteDialogVisible = false" />
          <Button
            label="Delete All"
            severity="danger"
            :loading="
              Boolean(groupPendingDelete && deletingGroupKey === groupPendingDelete.groupKey)
            "
            @click="confirmDelete"
          />
        </div>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import AdminMessage from './AdminMessage.vue';
import AdminPanel from './AdminPanel.vue';
import AdminStat from './AdminStat.vue';
import { queensAdminApi } from '../../admin/api';
import { isRedundantPrecomputedDistance } from '../../admin/maxQueenCounts';
import type {
  QueensAdminPuzzleDifficulty,
  QueensAdminPuzzleCatalogGroup,
  QueensAdminPuzzleCatalogStats,
} from '../../admin/types';
import { buildQueensSelectionRoute } from '../../utils/puzzleSelectionRoute';

type PuzzleCatalogRow = QueensAdminPuzzleCatalogGroup & {
  groupKey: string;
  difficultySortKey: number;
  rulesetBlocked: boolean;
  searchText: string;
};

const stats = ref<QueensAdminPuzzleCatalogStats | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const searchText = ref('');
const selectedSize = ref('');
const selectedDistance = ref('');
const selectedQueenCount = ref('');
const selectedMinimumGroupSize = ref('');
const selectedRulesetStatus = ref('');
const selectedDifficulty = ref('');
const deleteDialogVisible = ref(false);
const groupPendingDelete = ref<PuzzleCatalogRow | null>(null);
const deletingGroupKey = ref<string | null>(null);
const openingGroupKey = ref<string | null>(null);
const router = useRouter();

const groups = computed<PuzzleCatalogRow[]>(() =>
  (stats.value?.groups ?? []).map((group) => {
    const rulesetBlocked = isRedundantPrecomputedDistance(group.size, group.orthogonalMinDistance);
    return {
      ...group,
      groupKey: [
        group.size,
        group.orthogonalMinDistance,
        group.targetQueenCount,
        group.minimumGroupSize,
        group.difficulty ?? 'unknown',
      ].join(':'),
      difficultySortKey: difficultySortKey(group.difficulty),
      rulesetBlocked,
      searchText: [
        `${group.size}x${group.size}`,
        group.orthogonalMinDistance,
        group.targetQueenCount,
        group.minimumGroupSize,
        formatDifficulty(group.difficulty),
        rulesetBlocked ? 'blocked redundant' : 'active frontier',
        group.count,
      ]
        .join(' ')
        .toLowerCase(),
    };
  })
);

const sizeOptions = computed(() => uniqueNumbers(groups.value.map((group) => group.size)));
const distanceOptions = computed(() =>
  uniqueNumbers(groups.value.map((group) => group.orthogonalMinDistance))
);
const queenCountOptions = computed(() =>
  uniqueNumbers(groups.value.map((group) => group.targetQueenCount))
);
const minimumGroupSizeOptions = computed(() =>
  uniqueNumbers(groups.value.map((group) => group.minimumGroupSize))
);
const difficultyOptions = computed(() => {
  const values = [
    ...new Set(groups.value.map((group) => group.difficulty).filter(Boolean)),
  ] as QueensAdminPuzzleDifficulty[];
  return values.sort((left, right) => difficultySortKey(left) - difficultySortKey(right));
});

const filteredGroups = computed(() => {
  const query = searchText.value.trim().toLowerCase();

  return groups.value.filter((group) => {
    if (selectedSize.value && group.size !== Number(selectedSize.value)) return false;
    if (selectedDistance.value && group.orthogonalMinDistance !== Number(selectedDistance.value)) {
      return false;
    }
    if (selectedQueenCount.value && group.targetQueenCount !== Number(selectedQueenCount.value)) {
      return false;
    }
    if (
      selectedMinimumGroupSize.value &&
      group.minimumGroupSize !== Number(selectedMinimumGroupSize.value)
    ) {
      return false;
    }
    if (selectedRulesetStatus.value === 'blocked' && !group.rulesetBlocked) return false;
    if (selectedRulesetStatus.value === 'active' && group.rulesetBlocked) return false;
    if (selectedDifficulty.value && group.difficulty !== selectedDifficulty.value) {
      return false;
    }
    if (query && !group.searchText.includes(query)) return false;
    return true;
  });
});

function difficultySortKey(difficulty?: QueensAdminPuzzleDifficulty): number {
  switch (difficulty) {
    case 'tutorial':
      return 0;
    case 'extra-easy':
      return 1;
    case 'easy':
      return 2;
    case 'medium':
      return 3;
    case 'hard':
      return 4;
    case 'extra-hard':
      return 5;
    case 'unsolvable':
      return 6;
    default:
      return 7;
  }
}

function formatDifficulty(difficulty?: QueensAdminPuzzleDifficulty): string {
  if (!difficulty) return 'Unknown';
  return difficulty
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDistanceValue(size: number, orthogonalMinDistance: number): string {
  return orthogonalMinDistance === size
    ? `${orthogonalMinDistance} (Max)`
    : String(orthogonalMinDistance);
}

function formatDistanceOption(orthogonalMinDistance: number): string {
  const hasMaxSizedGroup = groups.value.some(
    (group) =>
      group.orthogonalMinDistance === orthogonalMinDistance && group.size === orthogonalMinDistance
  );
  return hasMaxSizedGroup
    ? `${orthogonalMinDistance} (Max for some sizes)`
    : String(orthogonalMinDistance);
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

async function refreshCatalog(): Promise<void> {
  loading.value = true;
  errorMessage.value = null;

  try {
    stats.value = await queensAdminApi.getPuzzleCatalogStats();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to load puzzle catalog groups';
  } finally {
    loading.value = false;
  }
}

function promptDelete(group: PuzzleCatalogRow): void {
  groupPendingDelete.value = group;
  deleteDialogVisible.value = true;
}

async function openRandomCatalogPuzzle(group: PuzzleCatalogRow): Promise<void> {
  openingGroupKey.value = group.groupKey;
  errorMessage.value = null;

  const popup = window.open('about:blank', '_blank');

  try {
    const selection = await queensAdminApi.getRandomCatalogPuzzle({
      size: group.size,
      orthogonalMinDistance: group.orthogonalMinDistance,
      targetQueenCount: group.targetQueenCount,
      minimumGroupSize: group.minimumGroupSize,
      difficulty: group.difficulty,
    });

    if (!selection) {
      if (popup) {
        popup.close();
      }
      errorMessage.value = 'No puzzle matched that catalog category.';
      return;
    }

    const href = router.resolve({
      ...(selection.difficulty && selection.difficulty !== 'unsolvable'
        ? buildQueensSelectionRoute({
            sizeKey: `${selection.size}x${selection.size}`,
            orthogonalMinDistance: selection.orthogonalMinDistance,
            difficulty: selection.difficulty,
            puzzleId: selection.puzzleId,
            targetQueenCount: selection.targetQueenCount,
            minimumGroupSize: selection.minimumGroupSize,
          })
        : {
            name: 'queens-puzzle' as const,
            params: { puzzleId: selection.puzzleId },
          }),
    }).href;

    if (popup) {
      popup.location.href = href;
      return;
    }

    window.open(href, '_blank', 'noopener,noreferrer');
  } catch (error) {
    if (popup) {
      popup.close();
    }
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to open a random catalog puzzle';
  } finally {
    openingGroupKey.value = null;
  }
}

async function openRandomCatalogPuzzleInSolver(group: PuzzleCatalogRow): Promise<void> {
  openingGroupKey.value = group.groupKey;
  errorMessage.value = null;

  const popup = window.open('about:blank', '_blank');

  try {
    const selection = await queensAdminApi.getRandomCatalogPuzzle({
      size: group.size,
      orthogonalMinDistance: group.orthogonalMinDistance,
      targetQueenCount: group.targetQueenCount,
      minimumGroupSize: group.minimumGroupSize,
      difficulty: group.difficulty,
    });

    if (!selection) {
      if (popup) {
        popup.close();
      }
      errorMessage.value = 'No puzzle matched that catalog category.';
      return;
    }

    const href = router.resolve({
      name: 'queens-admin-solver',
      query: { puzzleId: selection.puzzleId },
    }).href;

    if (popup) {
      popup.location.href = href;
      return;
    }

    window.open(href, '_blank', 'noopener,noreferrer');
  } catch (error) {
    if (popup) {
      popup.close();
    }
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to open a random catalog puzzle in solver';
  } finally {
    openingGroupKey.value = null;
  }
}

async function confirmDelete(): Promise<void> {
  if (!groupPendingDelete.value) return;

  const group = groupPendingDelete.value;
  deletingGroupKey.value = group.groupKey;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    const deletedCount = await queensAdminApi.deletePuzzleCatalogGroup({
      size: group.size,
      orthogonalMinDistance: group.orthogonalMinDistance,
      targetQueenCount: group.targetQueenCount,
      minimumGroupSize: group.minimumGroupSize,
      difficulty: group.difficulty,
    });

    successMessage.value =
      deletedCount === 0
        ? 'No puzzles matched that category at delete time.'
        : `Deleted ${deletedCount} puzzle${deletedCount === 1 ? '' : 's'} from the selected category.`;
    deleteDialogVisible.value = false;
    groupPendingDelete.value = null;
    await refreshCatalog();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to delete puzzle catalog group';
  } finally {
    deletingGroupKey.value = null;
  }
}

onMounted(() => {
  void refreshCatalog();
});
</script>
