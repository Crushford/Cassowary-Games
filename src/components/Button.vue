<!-- src/components/Button.vue -->
<template>
  <button
    class="btn"
    :class="{
      'btn-primary': variant === 'primary',
      'btn-secondary': variant === 'secondary',
      'btn-danger': variant === 'danger',
      'btn-success': variant === 'success',
    }"
    :disabled="disabled"
    @click="onClick"
  >
    <slot></slot>
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Button',
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (value: string) => {
        return ['primary', 'secondary', 'danger', 'success'].includes(value);
      },
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
  setup(props, { emit }) {
    const onClick = () => {
      if (!props.disabled) {
        emit('click');
      }
    };

    return {
      onClick,
    };
  },
});
</script>

<style scoped>
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.1s;
  outline: none;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #000000;
  color: #ffffff;
}

.btn-secondary {
  background-color: #ffffff;
  color: #000000;
  border: 1px solid #000000;
}

.btn-danger {
  background-color: #ff0000;
  color: #ffffff;
}

.btn-success {
  background-color: #00ff00;
  color: #000000;
}
</style>
