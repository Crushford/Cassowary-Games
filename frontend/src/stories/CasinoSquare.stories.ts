import type { Meta, StoryObj } from '@storybook/vue3';
import CasinoSquare from '../components/casino/CasinoSquare.vue';
import { useRoundStore } from '../stores/round';
import { createPinia, setActivePinia } from 'pinia';

const meta: Meta<typeof CasinoSquare> = {
  title: 'Casino/CasinoSquare',
  component: CasinoSquare,
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof CasinoSquare>;

const createStoryWithPinia = (rowIndex: number, colIndex: number) => ({
  components: { CasinoSquare },
  setup() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const roundStore = useRoundStore();

    // Initialize a simple 3x3 grid for testing
    roundStore.grid = [
      [
        { groupColor: 'red', playerMark: null },
        { groupColor: 'red', playerMark: 'flag' },
        { groupColor: 'blue', playerMark: 'queen' },
      ],
      [
        { groupColor: 'green', playerMark: 'invalid' },
        { groupColor: 'green', playerMark: null },
        { groupColor: 'blue', playerMark: null },
      ],
      [
        { groupColor: 'yellow', playerMark: null },
        { groupColor: 'yellow', playerMark: null },
        { groupColor: 'purple', playerMark: null },
      ],
    ];

    roundStore.gridSize = 3;

    return {};
  },
  template:
    '<div class="w-20 h-20"><CasinoSquare :row-index="0" :col-index="0" :store="roundStore" /></div>',
});

export const Default: Story = {
  args: {},
  render: () => createStoryWithPinia(0, 0),
};

export const WithFlag: Story = {
  args: {},
  render: () => ({
    components: { CasinoSquare },
    setup() {
      const pinia = createPinia();
      setActivePinia(pinia);

      const roundStore = useRoundStore();

      roundStore.grid = [
        [
          { groupColor: 'red', playerMark: 'flag' },
          { groupColor: 'blue', playerMark: null },
          { groupColor: 'green', playerMark: null },
        ],
      ];

      roundStore.gridSize = 3;

      return {};
    },
    template:
      '<div class="w-20 h-20"><CasinoSquare :row-index="0" :col-index="0" :store="roundStore" /></div>',
  }),
};

export const WithQueen: Story = {
  args: {},
  render: () => ({
    components: { CasinoSquare },
    setup() {
      const pinia = createPinia();
      setActivePinia(pinia);

      const roundStore = useRoundStore();

      roundStore.grid = [
        [
          { groupColor: 'red', playerMark: 'queen' },
          { groupColor: 'blue', playerMark: null },
          { groupColor: 'green', playerMark: null },
        ],
      ];

      roundStore.gridSize = 3;

      return {};
    },
    template:
      '<div class="w-20 h-20"><CasinoSquare :row-index="0" :col-index="0" :store="roundStore" /></div>',
  }),
};

export const WithInvalid: Story = {
  args: {},
  render: () => ({
    components: { CasinoSquare },
    setup() {
      const pinia = createPinia();
      setActivePinia(pinia);

      const roundStore = useRoundStore();

      roundStore.grid = [
        [
          { groupColor: 'red', playerMark: 'invalid' },
          { groupColor: 'blue', playerMark: null },
          { groupColor: 'green', playerMark: null },
        ],
      ];

      roundStore.gridSize = 3;

      return {};
    },
    template:
      '<div class="w-20 h-20"><CasinoSquare :row-index="0" :col-index="0" :store="roundStore" /></div>',
  }),
};
