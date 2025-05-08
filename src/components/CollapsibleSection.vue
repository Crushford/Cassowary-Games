<template>
  <section
    class="bg-gray-800 border border-gray-700 shadow-sm p-4 rounded-lg"
    :class="sectionClass"
  >
    <!-- Section Header -->
    <button
      @click="toggleExpanded"
      class="flex items-center justify-between w-full text-left font-semibold"
      :class="headerClass"
    >
      <span>{{ title }}</span>
      <span class="text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 transition-transform duration-200"
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

    <!-- Always Visible Content -->
    <div v-if="$slots.alwaysVisible" class="mt-4 mb-2">
      <slot name="alwaysVisible"></slot>
    </div>

    <!-- Collapsible Content -->
    <div
      v-show="isExpanded"
      class="transition-all duration-300 overflow-hidden"
      :class="contentClass"
    >
      <slot></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

interface Props {
  title: string;
  defaultExpanded?: boolean;
  sectionClass?: string;
  headerClass?: string;
  contentClass?: string;
  modelValue?: boolean; // For v-model support
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpanded: false,
  sectionClass: '',
  headerClass: '',
  contentClass: 'mt-4 space-y-3',
  modelValue: undefined,
});

const emits = defineEmits(['update:modelValue', 'toggle']);

// Local state for expansion
const localExpanded = ref(props.defaultExpanded);

// Computed property to handle both v-model and local state
const isExpanded = computed({
  get: () => (props.modelValue !== undefined ? props.modelValue : localExpanded.value),
  set: (value) => {
    if (props.modelValue !== undefined) {
      emits('update:modelValue', value);
    } else {
      localExpanded.value = value;
    }
    emits('toggle', value);
  },
});

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== undefined) {
      localExpanded.value = newValue;
    }
  }
);

// Toggle expanded state
function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}
</script>
