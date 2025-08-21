import type { Meta, StoryObj } from '@storybook/vue3';
import ToolDrawer from '../components/casino/ToolDrawer.vue';
import { useRoundStore } from '../stores/round';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof ToolDrawer> = {
  title: 'Casino/ToolDrawer',
  component: ToolDrawer,
  parameters: {
    layout: 'padded',
  },
};
export default meta;

type Story = StoryObj<typeof ToolDrawer>;

const createStoryWithPinia = (flippingMode?: string, autoFlagging?: boolean) => ({
  components: { ToolDrawer },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const roundStore = useRoundStore();

    // Initialize UI state
    roundStore.uiState = {
      flippingMode: flippingMode || 'auto',
      autoFlagging: autoFlagging || false,
    };

    return {};
  },
  template: '<ToolDrawer />',
});

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(),
};

export const AutoMode: Story = {
  args: {},
  render: () => createStoryWithPinia('auto'),
};

export const FlipMode: Story = {
  args: {},
  render: () => createStoryWithPinia('flip'),
};

export const FlagMode: Story = {
  args: {},
  render: () => createStoryWithPinia('flag'),
};

export const WithAutoFlagging: Story = {
  args: {},
  render: () => createStoryWithPinia('auto', true),
};

export const FlipModeWithAutoFlagging: Story = {
  args: {},
  render: () => createStoryWithPinia('flip', true),
};
