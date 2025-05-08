<template>
  <section
    :class="[
      'flex flex-col gap-2 rounded-lg',
      'border shadow-sm p-3',
      `bg-${colorScheme}-800/20`,
      `border-${colorScheme}-700/50`,
    ]"
    :style="{ width: size === 'full' ? '100%' : size }"
  >
    <!-- Collapsible section header -->
    <button
      @click="isExpanded = !isExpanded"
      class="flex items-center justify-between w-full text-left focus:outline-none"
      type="button"
      aria-label="Toggle section"
    >
      <h3 :class="['font-semibold text-gray-100', titleSize || 'text-sm']">{{ title }}</h3>
      <span class="text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3.5 w-3.5 transition-transform duration-200"
          :class="isExpanded ? 'rotate-180' : ''"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
    </button>

    <!-- Always visible buttons (optional) -->
    <div v-if="visibleButtons && visibleButtons.length" class="space-y-2 mt-1">
      <div v-for="(btn, index) in visibleButtons" :key="`visible-${index}`" class="flex flex-col">
        <button
          @click="btn.handler"
          :class="[
            'px-3 py-1.5 rounded text-gray-100 text-xs',
            `bg-${colorScheme}-600 hover:bg-${colorScheme}-500`,
            btn.buttonClass || '',
          ]"
          :disabled="btn.disabled"
        >
          {{ btn.label }}
        </button>
        <span
          v-if="showDescriptions && btn.description"
          class="text-xs text-gray-400 mt-0.5 text-[10px] leading-tight"
          >{{ btn.description }}</span
        >
      </div>
    </div>

    <!-- Collapsible content -->
    <div v-show="isExpanded" class="space-y-2 transition-all duration-300 overflow-hidden mt-1">
      <div v-for="(btn, index) in buttons" :key="`collapsible-${index}`" class="flex flex-col">
        <button
          @click="btn.handler"
          :class="[
            'px-2.5 py-1 rounded text-gray-100 w-full text-left',
            buttonSize || 'text-xs',
            btn.disabled
              ? 'bg-gray-600 cursor-not-allowed'
              : `bg-${colorScheme}-600 hover:bg-${colorScheme}-500`,
            btn.buttonClass || '',
          ]"
          :disabled="btn.disabled"
        >
          {{ btn.label }}
        </button>
        <span
          v-if="showDescriptions && btn.description"
          class="text-xs text-gray-400 mt-0.5 text-[10px] leading-tight"
          >{{ btn.description }}</span
        >
      </div>
      <slot></slot>
      <!-- Allow for additional custom content -->
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';

// Props definition
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  buttons: {
    type: Array,
    default: () => [],
    // Each button should have: { label, handler, description?, buttonClass?, disabled? }
  },
  visibleButtons: {
    type: Array,
    default: () => [],
    // Same structure as buttons, but always visible
  },
  colorScheme: {
    type: String,
    default: 'gray',
    // Supports: gray, blue, green, red, yellow, purple, pink
  },
  size: {
    type: String,
    default: 'full', // 'full' or specific width like '300px'
  },
  defaultExpanded: {
    type: Boolean,
    default: false,
  },
  buttonSize: {
    type: String,
    default: '',
    // CSS classes for button sizes (e.g., 'text-xs')
  },
  titleSize: {
    type: String,
    default: '',
    // CSS classes for title sizes (e.g., 'text-sm')
  },
  showDescriptions: {
    type: Boolean,
    default: true,
    // Whether to show descriptions under buttons
  },
});

// State
const isExpanded = ref(props.defaultExpanded);
</script>
