<template>
  <section class="space-y-6">
    <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold text-white">Puzzle Catalog Cleanup</h2>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-semantic-neutral-300">
            Review puzzle groups by board size, orthogonal distance, queen count, and minimum region
            size. Filter the groups, sort by any column, and remove an exact ruleset bucket in one
            action.
          </p>
        </div>
        <button
          type="button"
          class="rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft px-3 py-2 text-sm font-semibold text-semantic-neutral-200 transition hover:border-semantic-neutral-500 hover:text-white"
          :disabled="loading"
          @click="refreshCatalog"
        >
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>

      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              {{ distance }}
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
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
          <div class="text-sm text-semantic-neutral-400">Total Puzzles</div>
          <div class="mt-1 text-2xl font-semibold text-white">{{ stats?.totalPuzzles ?? 0 }}</div>
        </div>
        <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
          <div class="text-sm text-semantic-neutral-400">Ruleset Groups</div>
          <div class="mt-1 text-2xl font-semibold text-white">{{ groups.length }}</div>
        </div>
        <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
          <div class="text-sm text-semantic-neutral-400">Filtered Groups</div>
          <div class="mt-1 text-2xl font-semibold text-white">{{ filteredGroups.length }}</div>
        </div>
      </div>

      <div
        v-if="errorMessage"
        class="mt-5 rounded-2xl border border-edge-dangerSoft bg-feedback-dangerSubtle p-4 text-sm text-semantic-danger-200"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="successMessage"
        class="mt-5 rounded-2xl border border-incremental-successBorderFaint bg-feedback-successSubtle p-4 text-sm text-semantic-success-200"
      >
        {{ successMessage }}
      </div>

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
          <Column field="orthogonalMinDistance" header="Min Distance" sortable />
          <Column field="targetQueenCount" header="Queens" sortable />
          <Column field="minimumGroupSize" header="Min Group Size" sortable />
          <Column field="count" header="Puzzle Count" sortable />
          <Column header="Actions" :exportable="false">
            <template #body="{ data }">
              <div class="flex flex-wrap gap-2">
                <Button size="small" @click="playRandomPuzzleFromGroup(data)"> Play Random </Button>
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
    </section>

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
          <div>Min distance: {{ groupPendingDelete.orthogonalMinDistance }}</div>
          <div>Queens: {{ groupPendingDelete.targetQueenCount }}</div>
          <div>Min group size: {{ groupPendingDelete.minimumGroupSize }}</div>
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
import { queensAdminApi } from '../../admin/api';
import type {
  QueensAdminPuzzleCatalogGroup,
  QueensAdminPuzzleCatalogStats,
} from '../../admin/types';
import { buildQueensSelectionRoute } from '../../utils/puzzleSelectionRoute';

type PuzzleCatalogRow = QueensAdminPuzzleCatalogGroup & {
  groupKey: string;
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
const deleteDialogVisible = ref(false);
const groupPendingDelete = ref<PuzzleCatalogRow | null>(null);
const deletingGroupKey = ref<string | null>(null);
const router = useRouter();

const groups = computed<PuzzleCatalogRow[]>(() =>
  (stats.value?.groups ?? []).map((group) => ({
    ...group,
    groupKey: [
      group.size,
      group.orthogonalMinDistance,
      group.targetQueenCount,
      group.minimumGroupSize,
    ].join(':'),
    searchText: [
      `${group.size}x${group.size}`,
      group.orthogonalMinDistance,
      group.targetQueenCount,
      group.minimumGroupSize,
      group.count,
    ]
      .join(' ')
      .toLowerCase(),
  }))
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
    if (query && !group.searchText.includes(query)) return false;
    return true;
  });
});

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

function playRandomPuzzleFromGroup(group: PuzzleCatalogRow): void {
  void router.push(
    buildQueensSelectionRoute({
      sizeKey: `${group.size}x${group.size}`,
      orthogonalMinDistance: group.orthogonalMinDistance,
      targetQueenCount: group.targetQueenCount,
      minimumGroupSize: group.minimumGroupSize,
    })
  );
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
