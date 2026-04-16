<template>
  <Modal :is-visible="isVisible">
    <div>
      <slot />
      <button
        class="w-full mt-6 py-3 px-6 font-semibold rounded-lg transition-colors duration-200"
        :class="closeButtonClass"
        @click="emit('close')"
      >
        Got it!
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import Modal from '@/shared/components/Modal.vue';
import { trackRulesOpened } from '@/shared/utils/analyticsEvents';

interface Props {
  isVisible: boolean;
  analyticsParams: {
    game_name: string;
    game_mode?: string;
    [key: string]: string | number | boolean | undefined;
  };
  closeButtonClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  closeButtonClass:
    'bg-semantic-success-500 hover:bg-semantic-success-400 text-semantic-neutral-900',
});

const emit = defineEmits<{
  close: [];
}>();

watch(
  () => props.isVisible,
  (visible) => {
    if (visible) {
      trackRulesOpened(props.analyticsParams);
    }
  }
);

defineOptions({ name: 'RulesModalBase' });
</script>
