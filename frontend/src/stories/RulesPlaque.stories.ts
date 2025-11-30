import type { Meta, StoryObj } from '@storybook/vue3';
import RulesPlaque from '@/components/casino/RulesPlaque.vue';
import { useGlobalStore } from '../stores/global';
import { useTableStore } from '../stores/table';
import { useRoundStore } from '../stores/round';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof RulesPlaque> = {
  title: 'Casino/RulesPlaque',
  component: RulesPlaque,
  parameters: {
    layout: 'padded',
  },
};
export default meta;

type Story = StoryObj<typeof RulesPlaque>;

const createStoryWithPinia = (boardSize?: string, maxPayout?: number) => ({
  components: { RulesPlaque },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const globalStore = useGlobalStore();
    const tableStore = useTableStore();
    const roundStore = useRoundStore();

    if (boardSize) {
      roundStore.boardSize = boardSize;
    }

    if (maxPayout !== undefined) {
      tableStore.maxPayout = maxPayout;
    }

    return {};
  },
  template: '<RulesPlaque />',
});

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(),
};

export const WithTableSelected: Story = {
  args: {},
  render: () => createStoryWithPinia('4x4', 10000),
};

export const WithProgress: Story = {
  args: {},
  render: () => createStoryWithPinia('4x4', 10000),
};

export const NearMaxPayout: Story = {
  args: {},
  render: () => createStoryWithPinia('4x4', 10000),
};

export const NegativeProgress: Story = {
  args: {},
  render: () => createStoryWithPinia('4x4', 10000),
};
