import type { Meta, StoryObj } from '@storybook/vue3';
import CasinoRulesModal from '../components/casino/CasinoRulesModal.vue';
import { useGlobalStore } from '../stores/global';
import { useRoundStore } from '../stores/round';
import { useTableStore } from '../stores/table';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof CasinoRulesModal> = {
  title: 'Casino/CasinoRulesModal',
  component: CasinoRulesModal,
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof CasinoRulesModal>;

const createStoryWithPinia = (showRules: boolean, boardSize?: string) => ({
  components: { CasinoRulesModal },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const globalStore = useGlobalStore();
    const roundStore = useRoundStore();
    const tableStore = useTableStore();

    globalStore.ui.showRules = showRules;
    if (boardSize) {
      roundStore.boardSize = boardSize;
    }

    return {};
  },
  template: '<CasinoRulesModal />',
});

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(true, '4x4'),
};

export const Hidden: Story = {
  args: {},
  render: () => createStoryWithPinia(false, '4x4'),
};

export const NoTableSelected: Story = {
  args: {},
  render: () => createStoryWithPinia(true),
};
