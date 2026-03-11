<template>
  <div class="border border-gray-600 rounded-lg overflow-hidden">
    <button
      class="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-left"
      @click="toggle"
    >
      <span class="text-sm font-semibold text-white">{{ title }}</span>
      <span
        class="text-gray-400 text-lg transition-transform duration-200"
        :class="{ 'rotate-90': isOpen }"
      >
        ›
      </span>
    </button>
    <div v-if="isOpen" class="p-3 bg-gray-800/50 border-t border-gray-600">
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
