<template>
  <div class="flex items-center justify-between p-4 bg-slate-900 border-t border-slate-700">
    <div class="flex items-center gap-4">
      <!-- Left side tools can go here -->
    </div>

    <div class="flex items-center gap-2">
      <!-- Board size dropdown -->
      <BoardSizeDropdown :store="plantStore" />
    </div>
  </div>
</template>

<script setup lang="ts">
import BoardSizeDropdown from '../shared/BoardSizeDropdown.vue';

interface Props {
  plantStore: any;
}

defineProps<Props>();
</script>
