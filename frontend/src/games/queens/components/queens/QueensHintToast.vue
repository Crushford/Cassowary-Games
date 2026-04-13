<template>
  <Transition name="toast">
    <div
      v-if="message"
      :id="id"
      :role="role"
      :aria-live="ariaLive"
      data-hint-toast="true"
      class="absolute left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-edge-infoMuted bg-surface-infoDeep px-4 py-4 text-white shadow-2xl backdrop-blur-sm"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
    >
      <div class="flex items-start gap-4">
        <div
          v-if="step?.patternPreview"
          class="shrink-0 rounded-2xl border border-semantic-neutral-700 bg-surface-darkStrong p-2"
        >
          <SharedPatternPreview
            :size="step.patternPreview.size"
            :cells="step.patternPreview.cells"
            :output-flags="step.patternPreview.outputFlags"
            cell-size-class="h-10 w-10"
          />
        </div>

        <div class="min-w-0 flex-1 text-left">
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-semantic-info-200">
            Hint
          </div>
          <div class="mt-2 space-y-1 text-sm leading-5 text-semantic-neutral-100">
            <p v-for="line in messageLines" :key="line">{{ line }}</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { QueensSolverStep } from '../../solver/stagedSolver';
import SharedPatternPreview from './SharedPatternPreview.vue';

const props = withDefaults(
  defineProps<{
    message: string | null;
    step?: QueensSolverStep | null;
    id?: string;
    role?: string;
    ariaLive?: 'polite' | 'assertive' | 'off';
  }>(),
  {
    step: null,
    id: undefined,
    role: 'status',
    ariaLive: 'polite',
  }
);

const emit = defineEmits<{
  (e: 'dismiss'): void;
}>();

const touchStart = ref<{ x: number; y: number } | null>(null);

const messageLines = computed(() =>
  (props.message ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
);

function handleTouchStart(event: TouchEvent): void {
  const touch = event.touches[0];
  if (!touch) return;
  touchStart.value = { x: touch.clientX, y: touch.clientY };
}

function handleTouchEnd(event: TouchEvent): void {
  if (!touchStart.value) return;

  const touch = event.changedTouches[0];
  const start = touchStart.value;
  touchStart.value = null;
  if (!touch) return;

  const deltaX = touch.clientX - start.x;
  const deltaY = touch.clientY - start.y;
  if (Math.hypot(deltaX, deltaY) < 44) return;

  emit('dismiss');
}
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
