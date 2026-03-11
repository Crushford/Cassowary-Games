<template>
  <div class="mb-4 border border-slate-600 rounded-lg bg-slate-700">
    <button
      class="w-full p-3 flex justify-between items-center transition-colors hover:bg-opacity-5 hover:bg-white"
      :aria-expanded="isOpen"
      @click="toggle"
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
    </button>

    <div v-if="isOpen" class="overflow-hidden transition-all duration-300 ease-in-out">
      <div class="p-4 pt-0">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

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
function toggle() {
  isOpen.value = !isOpen.value;
}

defineOptions({
  name: 'LevelBuilderAccordion',
});
</script>
