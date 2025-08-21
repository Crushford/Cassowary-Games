import type { Meta, StoryObj } from '@storybook/vue3';
import CasinoHUD from '../components/casino/CasinoHUD.vue';
import { useGlobalStore } from '../stores/global';
import { useRoundStore } from '../stores/round';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof CasinoHUD> = {
  title: 'Casino/CasinoHUD',
  component: CasinoHUD,
  parameters: {
    layout: 'padded',
  },
};
export default meta;

type Story = StoryObj<typeof CasinoHUD>;

const createStoryWithPinia = (initialChips: number, tableId?: string) => ({
  components: { CasinoHUD },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const globalStore = useGlobalStore();
    const roundStore = useRoundStore();

    globalStore.player.totalChips = initialChips;
    if (tableId) {
      roundStore.tableId = tableId;
    }

    return {};
  },
  template: '<CasinoHUD />',
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
  render: () => createStoryWithPinia(50, 'table1'),
};
