import type { Meta, StoryObj } from '@storybook/vue3';
import TablesSelectionModal from '@/games/queens/components/casino/TablesSelectionModal.vue';
import { useGlobalStore } from '@/games/queens/stores/global';
import { useTableStore } from '@/games/queens/stores/table';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof TablesSelectionModal> = {
  title: 'Casino/TablesSelectionModal',
  component: TablesSelectionModal,
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof TablesSelectionModal>;

const mockTables = {
  table1: {
    id: 'table1',
    name: 'Beginner Table',
    minimumBuyIn: 100,
    maxPayout: 1000,
    boardSize: '4x4',
    payoutMultiplier: 1.0,
  },
  table2: {
    id: 'table2',
    name: 'Intermediate Table',
    minimumBuyIn: 500,
    maxPayout: 5000,
    boardSize: '6x6',
    payoutMultiplier: 2.0,
  },
  table3: {
    id: 'table3',
    name: 'Expert Table',
    minimumBuyIn: 2000,
    maxPayout: 20000,
    boardSize: '8x8',
    payoutMultiplier: 5.0,
  },
};

const mockTableProgress = {
  table1: {
    totalProfit: 500,
    roundsComplete: 3,
    currentPuzzleIdOrName: 'puzzle1',
    isUsingRegex: false,
    roundWinnings: 100,
  },
  table2: {
    totalProfit: 4500,
    roundsComplete: 8,
    currentPuzzleIdOrName: 'puzzle2',
    isUsingRegex: false,
    roundWinnings: 500,
  },
};

const createStoryWithPinia = (initialChips: number, tables?: any) => ({
  components: { TablesSelectionModal },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const globalStore = useGlobalStore();
    const tableStore = useTableStore();

    globalStore.player.totalChips = initialChips;

    tableStore.tables = tables || mockTables;
    tableStore.loaded = true;

    return {};
  },
  template: '<TablesSelectionModal />',
});

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(1000),
};

export const HighRoller: Story = {
  args: {},
  render: () => createStoryWithPinia(100000),
};

export const LowBalance: Story = {
  args: {},
  render: () => createStoryWithPinia(50),
};

export const WithProgress: Story = {
  args: {},
  render: () => ({
    components: { TablesSelectionModal },
    setup() {
      const pinia = createPinia();
      setActivePinia(pinia);

      const globalStore = useGlobalStore();
      const tableStore = useTableStore();

      globalStore.player.totalChips = 5000;

      tableStore.tables = {
        table1: mockTables.table1,
        table2: mockTables.table2,
      };
      tableStore.loaded = true;

      // Add progress
      globalStore.tablesProgress = mockTableProgress;

      return {};
    },
    template: '<TablesSelectionModal />',
  }),
};
