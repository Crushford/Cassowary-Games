import type { Meta, StoryObj } from '@storybook/vue3';
import CasinoGame from '../components/casino/CasinoGame.vue';
import { useGlobalStore } from '../stores/global';
import { useTableStore } from '../stores/table';
import { useRoundStore } from '../stores/round';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof CasinoGame> = {
  title: 'Casino/CasinoGame',
  component: CasinoGame,
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof CasinoGame>;

const createStoryWithPinia = (initialChips: number, tableId?: string) => ({
  components: { CasinoGame },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const globalStore = useGlobalStore();
    const tableStore = useTableStore();
    const roundStore = useRoundStore();

    globalStore.player.totalChips = initialChips;
    if (tableId) {
      roundStore.tableId = tableId;
    }

    return {};
  },
  template: '<CasinoGame />',
});

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(1000),
};

export const WithTableSelected: Story = {
  args: {},
  render: () => createStoryWithPinia(1000, 'table1'),
};

export const HighRoller: Story = {
  args: {},
  render: () => createStoryWithPinia(100000, 'table1'),
};

export const LowBalance: Story = {
  args: {},
  render: () => createStoryWithPinia(50),
};
