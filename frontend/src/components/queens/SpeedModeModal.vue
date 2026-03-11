<template>
  <Dialog
    :visible="isVisible"
    modal
    class="w-[min(94vw,34rem)]"
    header="Speed Mode ⚡"
    @update:visible="!$event && $emit('close')"
  >
    <div>
      <p class="text-white mb-6">Race against the clock to complete as many puzzles as possible!</p>

      <!-- Timer Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">Timer Duration</h3>
        <div class="flex gap-3">
          <Button
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px flex-1"
            :label="'2 Minutes'"
            :class="
              selectedTimer === 120
                ? 'border-amber-700 bg-amber-800 text-amber-100 enabled:hover:bg-amber-700 enabled:hover:border-amber-600'
                : 'border-slate-700 bg-slate-800 text-slate-200 enabled:hover:bg-slate-700 enabled:hover:border-slate-600'
            "
            @click="selectedTimer = 120"
          />
          <Button
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px flex-1"
            :label="'5 Minutes'"
            :class="
              selectedTimer === 300
                ? 'border-amber-700 bg-amber-800 text-amber-100 enabled:hover:bg-amber-700 enabled:hover:border-amber-600'
                : 'border-slate-700 bg-slate-800 text-slate-200 enabled:hover:bg-slate-700 enabled:hover:border-slate-600'
            "
            @click="selectedTimer = 300"
          />
        </div>
      </div>

      <!-- Size Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">Puzzle Mode</h3>
        <div class="grid grid-cols-3 gap-2">
          <!-- Sequential Button -->
          <Button
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px col-span-3"
            :label="`Sequential (${sequentialText})`"
            :class="
              selectedSize === null
                ? 'border-amber-700 bg-amber-800 text-amber-100 enabled:hover:bg-amber-700 enabled:hover:border-amber-600'
                : 'border-slate-700 bg-slate-800 text-slate-200 enabled:hover:bg-slate-700 enabled:hover:border-slate-600'
            "
            @click="selectedSize = null"
          />

          <!-- Size Buttons -->
          <Button
            v-for="size in availableSizes"
            :key="size"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px"
            :label="size"
            :class="
              selectedSize === size
                ? 'border-amber-700 bg-amber-800 text-amber-100 enabled:hover:bg-amber-700 enabled:hover:border-amber-600'
                : 'border-slate-700 bg-slate-800 text-slate-200 enabled:hover:bg-slate-700 enabled:hover:border-slate-600'
            "
            @click="selectedSize = size"
          />
        </div>
      </div>

      <!-- Start Button -->
      <Button
        class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-teal-700 bg-teal-700 text-cyan-50 enabled:hover:bg-teal-600 enabled:hover:border-teal-600 w-full"
        label="Start Speed Mode"
        @click="handleStart"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useQueensStore } from '../../stores/queensStore';
import { useSpeedModeStore } from '../../stores/speedModeStore';

const queensStore = useQueensStore();
const speedModeStore = useSpeedModeStore();

defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const selectedTimer = ref<number>(120);
const selectedSize = ref<string | null>(null);

const availableSizes = computed(() => {
  return queensStore.getAvailableSizes();
});

const sequentialText = computed(() => {
  return availableSizes.value.join(' → ');
});

async function handleStart() {
  speedModeStore.start(selectedTimer.value, selectedSize.value);
  await speedModeStore.startNextPuzzle();
  emit('close');
}
</script>

<script lang="ts">
export default {
  name: 'SpeedModeModal',
};
</script>
