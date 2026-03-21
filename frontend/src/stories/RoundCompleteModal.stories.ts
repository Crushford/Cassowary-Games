import type { Meta, StoryObj } from '@storybook/vue3';
import RoundCompleteModal from '@/games/queens/components/casino/RoundCompleteModal.vue';
import { useGlobalStore } from '@/games/queens/stores/global';
import { useTableStore } from '@/games/queens/stores/table';
import { useRoundStore } from '@/games/queens/stores/round';
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
  boardSize: string
) => ({
  components: { RoundCompleteModal },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const globalStore = useGlobalStore();
    const tableStore = useTableStore();
    const roundStore = useRoundStore();

    globalStore.player.totalChips = initialChips;
    globalStore.totalRoundsComplete = 5;
    tableStore.status = status;
    tableStore.showRoundComplete = true;
    roundStore.boardSize = boardSize;

    return {};
  },
  template: '<RoundCompleteModal />',
});

export const Won: Story = {
  args: {},
  render: () => createStoryWithPinia('won', 5000, '4x4'),
};

export const Busted: Story = {
  args: {},
  render: () => createStoryWithPinia('busted', 0, '4x4'),
};

export const HighWinnings: Story = {
  args: {},
  render: () => createStoryWithPinia('won', 15000, '4x4'),
};

export const NearCap: Story = {
  args: {},
  render: () => createStoryWithPinia('won', 10000, '4x4'),
};
