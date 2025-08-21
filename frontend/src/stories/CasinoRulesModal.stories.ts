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

const createStoryWithPinia = (showRules: boolean, tableId?: string) => ({
  components: { CasinoRulesModal },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const globalStore = useGlobalStore();
    const roundStore = useRoundStore();
    const tableStore = useTableStore();

    globalStore.ui.showRules = showRules;
    if (tableId) {
      roundStore.tableId = tableId;
    }

    return {};
  },
  template: '<CasinoRulesModal />',
});

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(true, 'table1'),
};

export const Hidden: Story = {
  args: {},
  render: () => createStoryWithPinia(false, 'table1'),
};

export const NoTableSelected: Story = {
  args: {},
  render: () => createStoryWithPinia(true),
};
