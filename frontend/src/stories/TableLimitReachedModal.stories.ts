import type { Meta, StoryObj } from '@storybook/vue3';
import TableLimitReachedModal from '@/games/queens/components/casino/TableLimitReachedModal.vue';
import { useGlobalStore } from '@/games/queens/stores/global';
import { useTableStore } from '@/games/queens/stores/table';
import { useRoundStore } from '@/games/queens/stores/round';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof TableLimitReachedModal> = {
  title: 'Casino/TableLimitReachedModal',
  component: TableLimitReachedModal,
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof TableLimitReachedModal>;

const createStoryWithPinia = (initialChips: number, boardSize: string, maxPayout: number) => ({
  components: { TableLimitReachedModal },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const globalStore = useGlobalStore();
    const tableStore = useTableStore();
    const roundStore = useRoundStore();

    globalStore.player.totalChips = initialChips;
    tableStore.maxPayout = maxPayout;
    tableStore.showTableLimitReached = true;
    roundStore.boardSize = boardSize;

    return {};
  },
  template: '<TableLimitReachedModal />',
});

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(15000, '4x4', 10000),
};

export const HighBalance: Story = {
  args: {},
  render: () => createStoryWithPinia(50000, '4x4', 10000),
};

export const LowBalance: Story = {
  args: {},
  render: () => createStoryWithPinia(1000, '4x4', 10000),
};

export const LargePayout: Story = {
  args: {},
  render: () => createStoryWithPinia(100000, '4x4', 50000),
};
