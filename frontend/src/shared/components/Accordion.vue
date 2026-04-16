<template>
  <div class="border border-semantic-neutral-600 rounded-lg overflow-hidden">
    <button
      class="w-full flex items-center justify-between p-3 bg-surface-muted hover:bg-surface-mutedAlt transition-colors text-left"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="text-sm font-semibold text-white">{{ title }}</span>
      <span
        class="text-semantic-neutral-400 text-lg transition-transform duration-200"
        :class="{ 'rotate-90': isOpen }"
      >
        ›
      </span>
    </button>
    <div v-if="isOpen" class="p-3 bg-surface-muted border-t border-semantic-neutral-600">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  title: string;
  defaultOpen?: boolean;
}>();

const isOpen = ref(props.defaultOpen ?? false);

function toggle(): void {
  isOpen.value = !isOpen.value;
}

defineExpose({
  toggle,
  isOpen,
});

defineOptions({
  name: 'SharedAccordion',
});
</script>
