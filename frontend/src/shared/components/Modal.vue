<template>
  <div
    v-if="isVisible"
    class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[60] p-4"
    @click="handleBackdropClick"
  >
    <div
      ref="dialogRef"
      class="bg-semantic-neutral-800 p-8 rounded-lg shadow-xl transform transition-all duration-500 scale-100 max-w-md w-full mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
      :role="role"
      aria-modal="true"
      :aria-labelledby="ariaLabelledby"
      :aria-describedby="ariaDescribedby"
      :aria-label="ariaLabel"
      tabindex="-1"
      @click.stop
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    isVisible: boolean;
    role?: 'dialog' | 'alertdialog';
    ariaLabelledby?: string;
    ariaDescribedby?: string;
    ariaLabel?: string;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
  }>(),
  {
    role: 'dialog',
    ariaLabelledby: undefined,
    ariaDescribedby: undefined,
    ariaLabel: undefined,
    closeOnBackdrop: true,
    closeOnEscape: true,
  }
);

const emit = defineEmits<{
  close: [];
}>();

const dialogRef = ref<HTMLElement | null>(null);
let previousActiveElement: HTMLElement | null = null;

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isVisible && props.closeOnEscape) {
    emit('close');
  }
};

function handleBackdropClick() {
  if (!props.closeOnBackdrop) {
    return;
  }

  emit('close');
}

watch(
  () => props.isVisible,
  async (isVisible) => {
    if (isVisible) {
      previousActiveElement = document.activeElement as HTMLElement | null;
      await nextTick();
      dialogRef.value?.focus();
      return;
    }

    previousActiveElement?.focus?.();
    previousActiveElement = null;
  }
);

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<script lang="ts">
export default {
  name: 'Modal',
};
</script>
