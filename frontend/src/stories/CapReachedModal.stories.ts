import type { Meta, StoryObj } from '@storybook/vue3';
import CapReachedModal from '@/games/queens/components/casino/CapReachedModal.vue';
import { useGlobalStore } from '@/games/queens/stores/global';
import { useTableStore } from '@/games/queens/stores/table';
import { useRoundStore } from '@/games/queens/stores/round';
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
  boardSize: string,
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
    tableStore.maxPayout = maxPayout;
    roundStore.boardSize = boardSize;

    return {};
  },
  template: '<CapReachedModal />',
});

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(1000, '4x4', 5000, 2500),
};

export const LowBalance: Story = {
  args: {},
  render: () => createStoryWithPinia(50, '4x4', 5000, 4800),
};

export const HighBalance: Story = {
  args: {},
  render: () => createStoryWithPinia(100000, '4x4', 5000, 1000),
};

export const NearCap: Story = {
  args: {},
  render: () => createStoryWithPinia(5000, '4x4', 5000, 4999),
};
