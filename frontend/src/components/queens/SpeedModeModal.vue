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
            @click="selectedTimer = 120"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px flex-1"
            :label="'2 Minutes'"
            :class="
              selectedTimer === 120
                ? 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-warning'
                : 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-subtle'
            "
          />
          <Button
            @click="selectedTimer = 300"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px flex-1"
            :label="'5 Minutes'"
            :class="
              selectedTimer === 300
                ? 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-warning'
                : 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-subtle'
            "
          />
        </div>
      </div>

      <!-- Size Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">Puzzle Mode</h3>
        <div class="grid grid-cols-3 gap-2">
          <!-- Sequential Button -->
          <Button
            @click="selectedSize = null"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px col-span-3"
            :label="`Sequential (${sequentialText})`"
            :class="
              selectedSize === null
                ? 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-warning'
                : 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-subtle'
            "
          />

          <!-- Size Buttons -->
          <Button
            v-for="size in availableSizes"
            :key="size"
            @click="selectedSize = size"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px"
            :label="size"
            :class="
              selectedSize === size
                ? 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-warning'
                : 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-subtle'
            "
          />
        </div>
      </div>

      <!-- Start Button -->
      <Button
        @click="handleStart"
        class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-teal-700 bg-teal-700 text-cyan-50 enabled:hover:bg-teal-600 enabled:hover:border-teal-600 w-full"
        label="Start Speed Mode"
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
