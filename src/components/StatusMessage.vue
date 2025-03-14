<!-- src/components/StatusMessage.vue -->
<template>
  <div class="status-message" :class="{ error: isError }" v-show="message">
    {{ message }}
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';
import { StateManager } from '../state/StateManager';

export default defineComponent({
  name: 'StatusMessage',
  setup() {
    const stateManager = StateManager.getInstance();
    const message = ref<string>('');
    const isError = ref<boolean>(false);

    // Subscribe to status message events
    stateManager.events.on('status-message', (msg: string, error: boolean) => {
      message.value = msg;
      isError.value = error;
    });

    return {
      message,
      isError,
    };
  },
});
</script>

<style scoped>
.status-message {
  padding: 12px 16px;
  margin: 8px 0;
  border-radius: 4px;
  background-color: #f5f5f5;
  border-left: 4px solid #000000;
  font-size: 1rem;
  transition: all 0.3s ease;
  animation: fadeIn 0.3s ease-in-out;
}

.status-message.error {
  background-color: #fff0f0;
  border-left-color: #ff0000;
  color: #ff0000;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
