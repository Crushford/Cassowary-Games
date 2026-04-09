<template>
  <Message :severity="severity" :variant="variant" :closable="closable">
    <slot>{{ text }}</slot>
  </Message>
</template>

<script setup lang="ts">
import Message from 'primevue/message';

withDefaults(
  defineProps<{
    text?: string;
    severity?: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';
    variant?: 'outlined' | 'simple';
    closable?: boolean;
  }>(),
  {
    text: '',
    severity: 'info',
    variant: 'outlined',
    closable: false,
  }
);
</script>
