<template>
  <button
    class="inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white border-none rounded-lg font-medium cursor-pointer transition-all hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0"
    :class="{
      'bg-slate-500 opacity-70 cursor-not-allowed hover:bg-slate-500 hover:translate-y-0': disabled,
    }"
    :disabled="disabled"
    :title="disabled && disabledTitle ? disabledTitle : ''"
  >
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  disabledTitle: {
    type: String,
    default: '',
  },
});
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background-color: var(--color-accent-primary);
  color: white;
  border: none;
  border-radius: var(--button-radius);
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
}

.base-button:hover:not(.disabled) {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.base-button:active:not(.disabled) {
  transform: translateY(0);
}

.base-button.disabled {
  background-color: #64748b;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
