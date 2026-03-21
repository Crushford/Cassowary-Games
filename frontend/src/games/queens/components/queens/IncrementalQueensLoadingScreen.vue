<template>
  <div
    class="w-full max-w-[480px] mx-auto h-dvh bg-incremental-shellBg text-incremental-shellText flex flex-col items-center justify-center gap-4 px-6"
    role="status"
    aria-live="polite"
    aria-label="Loading Incremental Queens"
  >
    <div
      class="h-10 w-10 rounded-full border-4 border-incremental-border border-t-incremental-title animate-spin"
    ></div>
    <p class="text-sm text-incremental-mutedText">Loading Incremental Queens...</p>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'IncrementalQueensLoadingScreen',
});
</script>
