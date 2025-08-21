import type { Meta, StoryObj } from '@storybook/vue3';
import GoldDisplay from '../components/casino/GoldDisplay.vue';
import { useGlobalStore } from '../stores/global';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof GoldDisplay> = {
  title: 'Casino/GoldDisplay',
  component: GoldDisplay,
};
export default meta;

type Story = StoryObj<typeof GoldDisplay>;

const createStoryWithPinia = (initialChips: number) => ({
  components: { GoldDisplay },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useGlobalStore();
    store.player.totalChips = initialChips;
    return {};
  },
  template: '<GoldDisplay />',
});

export const Low: Story = {
  args: {},
  render: () => createStoryWithPinia(25),
};

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(500),
};

export const HighRoller: Story = {
  args: {},
  render: () => createStoryWithPinia(1000000),
};
