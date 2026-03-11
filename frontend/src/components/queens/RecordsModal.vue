<template>
  <Dialog
    :visible="isVisible"
    modal
    class="w-[min(94vw,34rem)]"
    header="Records 🏆"
    @update:visible="!$event && $emit('close')"
  >
    <div>
      <!-- 2-Minute Records -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">2-Minute</h3>
        <div class="space-y-2">
          <!-- Sequential Record -->
          <div v-if="speedMode2MinSequential > 0" class="p-3 bg-gray-700 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="text-white font-semibold">Sequential</span>
              <span class="text-yellow-400 font-bold">{{ speedMode2MinSequential }} puzzles</span>
            </div>
          </div>
          <!-- Per-Size Records -->
          <div
            v-for="[size, count] in speedMode2MinSizeEntries"
            :key="`2min-${size}`"
            class="p-2 bg-gray-700 rounded-lg"
          >
            <div class="flex justify-between items-center">
              <span class="text-white font-semibold">{{ size }}</span>
              <span class="text-yellow-400 font-bold">{{ count }} puzzles</span>
            </div>
          </div>
          <div
            v-if="speedMode2MinSequential === 0 && speedMode2MinSizeEntries.length === 0"
            class="text-gray-400 text-sm p-2"
          >
            No records yet
          </div>
        </div>
      </div>

      <!-- 5-Minute Records -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">5-Minute</h3>
        <div class="space-y-2">
          <!-- Sequential Record -->
          <div v-if="speedMode5MinSequential > 0" class="p-3 bg-gray-700 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="text-white font-semibold">Sequential</span>
              <span class="text-yellow-400 font-bold">{{ speedMode5MinSequential }} puzzles</span>
            </div>
          </div>
          <!-- Per-Size Records -->
          <div
            v-for="[size, count] in speedMode5MinSizeEntries"
            :key="`5min-${size}`"
            class="p-2 bg-gray-700 rounded-lg"
          >
            <div class="flex justify-between items-center">
              <span class="text-white font-semibold">{{ size }}</span>
              <span class="text-yellow-400 font-bold">{{ count }} puzzles</span>
            </div>
          </div>
          <div
            v-if="speedMode5MinSequential === 0 && speedMode5MinSizeEntries.length === 0"
            class="text-gray-400 text-sm p-2"
          >
            No records yet
          </div>
        </div>
      </div>

      <!-- Best Times Per Size (Individual Puzzle Completion) -->
      <div v-if="bestTimesEntries.length > 0" class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">
          Best Times by Size (Individual Puzzles)
        </h3>
        <div class="space-y-2">
          <div
            v-for="[size, time] in bestTimesEntries"
            :key="size"
            class="flex justify-between items-center p-2 bg-gray-700 rounded-lg"
          >
            <span class="text-white font-semibold">{{ size }}</span>
            <span class="text-yellow-400 font-bold">{{ queensStore.formatTime(time) }}</span>
          </div>
        </div>
      </div>

      <div class="flex gap-3 justify-between">
        <Button
          class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-red-800 bg-red-900 text-red-100 enabled:hover:bg-red-800 enabled:hover:border-red-700"
          label="Reset Records"
          @click="handleResetRecords"
        />
        <Button
          class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-amber-700 bg-amber-800 text-amber-100 enabled:hover:bg-amber-700 enabled:hover:border-amber-600"
          label="Close"
          @click="$emit('close')"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useQueensStore } from '../../stores/queensStore';

defineProps<{
  isVisible: boolean;
}>();

defineEmits<{
  close: [];
}>();

const queensStore = useQueensStore();

// Include recordsRefreshTrigger to make computed properties reactive to localStorage changes
const speedMode2MinSequential = computed(() => {
  const refreshTrigger = queensStore.recordsRefreshTrigger;
  if (refreshTrigger < 0) return 0;
  return queensStore.getSpeedModeRecord(120, true);
});
const speedMode5MinSequential = computed(() => {
  const refreshTrigger = queensStore.recordsRefreshTrigger;
  if (refreshTrigger < 0) return 0;
  return queensStore.getSpeedModeRecord(300, true);
});

const speedMode2MinSizeRecords = computed(() => {
  const refreshTrigger = queensStore.recordsRefreshTrigger;
  if (refreshTrigger < 0) return {};
  return queensStore.getAllSpeedModeSizeRecords(120);
});
const speedMode5MinSizeRecords = computed(() => {
  const refreshTrigger = queensStore.recordsRefreshTrigger;
  if (refreshTrigger < 0) return {};
  return queensStore.getAllSpeedModeSizeRecords(300);
});

const speedMode2MinSizeEntries = computed(() => {
  return Object.entries(speedMode2MinSizeRecords.value).sort((a, b) => {
    const aSize = parseInt(a[0].split('x')[0], 10);
    const bSize = parseInt(b[0].split('x')[0], 10);
    return aSize - bSize;
  });
});

const speedMode5MinSizeEntries = computed(() => {
  return Object.entries(speedMode5MinSizeRecords.value).sort((a, b) => {
    const aSize = parseInt(a[0].split('x')[0], 10);
    const bSize = parseInt(b[0].split('x')[0], 10);
    return aSize - bSize;
  });
});

const bestTimesPerSize = computed(() => {
  const refreshTrigger = queensStore.recordsRefreshTrigger;
  if (refreshTrigger < 0) return {};
  return queensStore.getBestTimesPerSize();
});

const bestTimesEntries = computed(() => {
  return Object.entries(bestTimesPerSize.value).sort((a, b) => {
    const aSize = parseInt(a[0].split('x')[0], 10);
    const bSize = parseInt(b[0].split('x')[0], 10);
    return aSize - bSize;
  });
});

function handleResetRecords() {
  if (confirm('Are you sure you want to reset all records? This cannot be undone.')) {
    queensStore.resetAllRecords();
  }
}
</script>

<script lang="ts">
export default {
  name: 'RecordsModal',
};
</script>
