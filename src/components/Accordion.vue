<template>
  <div
    class="mb-4 border border-slate-600 rounded-lg bg-slate-700 overflow-hidden"
    :class="{ open: isOpen }"
  >
    <div
      class="p-3 cursor-pointer select-none flex justify-between items-center transition-colors hover:bg-opacity-5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      @click="toggle"
      @keydown.enter="toggle"
      @keydown.space="toggle"
      tabindex="0"
      role="button"
      :aria-expanded="isOpen"
    >
      <slot name="header">
        <div class="flex justify-between items-center w-full">
          <h3 class="m-0 text-base font-semibold text-white">{{ title }}</h3>
          <span
            class="text-slate-400 transition-transform duration-300"
            :class="{ 'rotate-180': isOpen }"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </div>
      </slot>
    </div>

    <div
      class="overflow-hidden transition-all duration-300 ease-in-out"
      :style="{ maxHeight: isOpen ? contentHeight : 0 }"
    >
      <div ref="contentRef" class="p-4 pt-0">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: 'Accordion Section',
  },
  defaultOpen: {
    type: Boolean,
    default: false,
  },
});

const isOpen = ref(props.defaultOpen);
const contentRef = ref<HTMLElement | null>(null);
const contentHeight = ref('0px');

function toggle() {
  isOpen.value = !isOpen.value;
}

function updateHeight() {
  if (contentRef.value) {
    contentHeight.value = `${contentRef.value.scrollHeight}px`;
  }
}

onMounted(() => {
  updateHeight();
  window.addEventListener('resize', updateHeight);
});

// Update height whenever content changes
watch(
  () => isOpen.value,
  () => {
    if (isOpen.value) {
      updateHeight();
    }
  }
);
</script>
