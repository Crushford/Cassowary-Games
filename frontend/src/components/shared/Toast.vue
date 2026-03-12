<template>
  <Transition name="toast">
    <div
      v-if="message"
      :id="id"
      :role="role"
      :aria-live="ariaLive"
      class="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 text-white px-6 py-4 rounded-lg shadow-lg max-w-md text-center w-[calc(100%-2rem)]"
      :class="[
        { shake: shouldShake },
        variant === 'error' ? 'bg-semantic-danger-600' : 'bg-semantic-info-600',
      ]"
    >
      <p class="font-semibold text-lg">{{ message }}</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message: string | null;
    shouldShake?: boolean;
    id?: string;
    role?: string;
    ariaLive?: 'polite' | 'assertive' | 'off';
    variant?: 'default' | 'error';
  }>(),
  {
    shouldShake: false,
    id: undefined,
    role: undefined,
    ariaLive: 'polite',
    variant: 'default',
  }
);
</script>

<style scoped>
/* Toast transitions */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* Shake animation */
.shake {
  animation: shake 0.5s;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(calc(-50% - 10px)) translateY(0);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(calc(-50% + 10px)) translateY(0);
  }
}
</style>
