<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4"
  >
    <div
      class="bg-gray-800 p-8 rounded-lg shadow-xl transform transition-all duration-500 scale-100 max-w-md w-full mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isVisible: boolean;
}>();
</script>

<script lang="ts">
export default {
  name: 'Modal',
};
</script>
