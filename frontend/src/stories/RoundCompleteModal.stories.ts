import type { Meta, StoryObj } from '@storybook/vue3';
import RoundCompleteModal from '../components/casino/RoundCompleteModal.vue';
import { useGlobalStore } from '../stores/global';
import { useTableStore } from '../stores/table';
import { useRoundStore } from '../stores/round';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof RoundCompleteModal> = {
  title: 'Casino/RoundCompleteModal',
  component: RoundCompleteModal,
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof RoundCompleteModal>;

const createStoryWithPinia = (
  status: 'playing' | 'won' | 'busted' | 'capped',
  initialChips: number,
  tableId: string,
  totalProfit: number,
  roundWinnings: number
) => ({
  components: { RoundCompleteModal },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const globalStore = useGlobalStore();
    const tableStore = useTableStore();
    const roundStore = useRoundStore();

    globalStore.player.totalChips = initialChips;
    globalStore.tablesProgress[tableId] = {
      totalProfit,
      roundWinnings,
      roundsComplete: 0,
      currentPuzzleIdOrName: null,
      isUsingRegex: false,
    };
    globalStore.totalRoundsComplete = 5;
    tableStore.status = status;
    tableStore.showRoundComplete = true;
    tableStore.maxPayout = 10000;
    roundStore.tableId = tableId;

    return {};
  },
  template: '<RoundCompleteModal />',
});

export const Won: Story = {
  args: {},
  render: () => createStoryWithPinia('won', 5000, 'table1', 3000, 500),
};

export const Busted: Story = {
  args: {},
  render: () => createStoryWithPinia('busted', 0, 'table1', -2000, -500),
};

export const HighWinnings: Story = {
  args: {},
  render: () => createStoryWithPinia('won', 15000, 'table1', 8000, 2000),
};

export const NearCap: Story = {
  args: {},
  render: () => createStoryWithPinia('won', 10000, 'table1', 9500, 500),
};
