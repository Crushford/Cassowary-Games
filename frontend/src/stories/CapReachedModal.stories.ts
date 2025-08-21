import type { Meta, StoryObj } from '@storybook/vue3';
import CapReachedModal from '../components/casino/CapReachedModal.vue';
import { useGlobalStore } from '../stores/global';
import { useTableStore } from '../stores/table';
import { useRoundStore } from '../stores/round';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof CapReachedModal> = {
  title: 'Casino/CapReachedModal',
  component: CapReachedModal,
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof CapReachedModal>;

const createStoryWithPinia = (
  initialChips: number,
  tableId: string,
  maxPayout: number,
  totalProfit: number
) => ({
  components: { CapReachedModal },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const globalStore = useGlobalStore();
    const tableStore = useTableStore();
    const roundStore = useRoundStore();

    globalStore.player.totalChips = initialChips;
    globalStore.tablesProgress[tableId] = {
      totalProfit,
      roundsComplete: 0,
      currentPuzzleIdOrName: null,
      isUsingRegex: false,
      roundWinnings: 0,
    };
    tableStore.maxPayout = maxPayout;
    roundStore.tableId = tableId;

    return {};
  },
  template: '<CapReachedModal />',
});

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(1000, 'table1', 5000, 2500),
};

export const LowBalance: Story = {
  args: {},
  render: () => createStoryWithPinia(50, 'table1', 5000, 4800),
};

export const HighBalance: Story = {
  args: {},
  render: () => createStoryWithPinia(100000, 'table1', 5000, 1000),
};

export const NearCap: Story = {
  args: {},
  render: () => createStoryWithPinia(5000, 'table1', 5000, 4999),
};
