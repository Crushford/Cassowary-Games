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
        { position: { row: 0, col: 0 }, groupColor: 'red', playerMark: null },
        { position: { row: 0, col: 1 }, groupColor: 'red', playerMark: 'flag' },
        { position: { row: 0, col: 2 }, groupColor: 'blue', playerMark: 'queen' },
      ],
      [
        { position: { row: 1, col: 0 }, groupColor: 'green', playerMark: 'invalid' },
        { position: { row: 1, col: 1 }, groupColor: 'green', playerMark: null },
        { position: { row: 1, col: 2 }, groupColor: 'blue', playerMark: null },
      ],
      [
        { position: { row: 2, col: 0 }, groupColor: 'yellow', playerMark: null },
        { position: { row: 2, col: 1 }, groupColor: 'yellow', playerMark: null },
        { position: { row: 2, col: 2 }, groupColor: 'purple', playerMark: null },
      ],
    ];

    roundStore.gridSize = 3;

    // Ensure the store has the handleSquareClick method
    if (!roundStore.handleSquareClick) {
      roundStore.handleSquareClick = async (row: number, col: number) => {
        console.log(`Square clicked: ${row}, ${col}`);
      };
    }

    return { roundStore };
  },
  template: `
    <div class="w-32 h-32 border border-semantic-neutral-300 rounded-lg overflow-hidden relative">
      <CasinoSquare :row-index="0" :col-index="0" :store="roundStore" />
    </div>
  `,
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
          { position: { row: 0, col: 0 }, groupColor: 'red', playerMark: 'flag' },
          { position: { row: 0, col: 1 }, groupColor: 'blue', playerMark: null },
          { position: { row: 0, col: 2 }, groupColor: 'green', playerMark: null },
        ],
        [
          { position: { row: 1, col: 0 }, groupColor: 'yellow', playerMark: null },
          { position: { row: 1, col: 1 }, groupColor: 'purple', playerMark: null },
          { position: { row: 1, col: 2 }, groupColor: 'pink', playerMark: null },
        ],
        [
          { position: { row: 2, col: 0 }, groupColor: 'teal', playerMark: null },
          { position: { row: 2, col: 1 }, groupColor: 'orange', playerMark: null },
          { position: { row: 2, col: 2 }, groupColor: 'indigo', playerMark: null },
        ],
      ];

      roundStore.gridSize = 3;

      // Ensure the store has the handleSquareClick method
      if (!roundStore.handleSquareClick) {
        roundStore.handleSquareClick = async (row: number, col: number) => {
          console.log(`Square clicked: ${row}, ${col}`);
        };
      }

      return { roundStore };
    },
    template: `
      <div class="w-32 h-32 border border-semantic-neutral-300 rounded-lg overflow-hidden relative">
        <CasinoSquare :row-index="0" :col-index="0" :store="roundStore" />
      </div>
    `,
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
          { position: { row: 0, col: 0 }, groupColor: 'red', playerMark: 'queen' },
          { position: { row: 0, col: 1 }, groupColor: 'blue', playerMark: null },
          { position: { row: 0, col: 2 }, groupColor: 'green', playerMark: null },
        ],
        [
          { position: { row: 1, col: 0 }, groupColor: 'yellow', playerMark: null },
          { position: { row: 1, col: 1 }, groupColor: 'purple', playerMark: null },
          { position: { row: 1, col: 2 }, groupColor: 'pink', playerMark: null },
        ],
        [
          { position: { row: 2, col: 0 }, groupColor: 'teal', playerMark: null },
          { position: { row: 2, col: 1 }, groupColor: 'orange', playerMark: null },
          { position: { row: 2, col: 2 }, groupColor: 'indigo', playerMark: null },
        ],
      ];

      roundStore.gridSize = 3;

      // Ensure the store has the handleSquareClick method
      if (!roundStore.handleSquareClick) {
        roundStore.handleSquareClick = async (row: number, col: number) => {
          console.log(`Square clicked: ${row}, ${col}`);
        };
      }

      return { roundStore };
    },
    template: `
      <div class="w-32 h-32 border border-semantic-neutral-300 rounded-lg overflow-hidden relative">
        <CasinoSquare :row-index="0" :col-index="0" :store="roundStore" />
      </div>
    `,
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
          { position: { row: 0, col: 0 }, groupColor: 'red', playerMark: 'invalid' },
          { position: { row: 0, col: 1 }, groupColor: 'blue', playerMark: null },
          { position: { row: 0, col: 2 }, groupColor: 'green', playerMark: null },
        ],
        [
          { position: { row: 1, col: 0 }, groupColor: 'yellow', playerMark: null },
          { position: { row: 1, col: 1 }, groupColor: 'purple', playerMark: null },
          { position: { row: 1, col: 2 }, groupColor: 'pink', playerMark: null },
        ],
        [
          { position: { row: 2, col: 0 }, groupColor: 'teal', playerMark: null },
          { position: { row: 2, col: 1 }, groupColor: 'orange', playerMark: null },
          { position: { row: 2, col: 2 }, groupColor: 'indigo', playerMark: null },
        ],
      ];

      roundStore.gridSize = 3;

      // Ensure the store has the handleSquareClick method
      if (!roundStore.handleSquareClick) {
        roundStore.handleSquareClick = async (row: number, col: number) => {
          console.log(`Square clicked: ${row}, ${col}`);
        };
      }

      return { roundStore };
    },
    template: `
      <div class="w-32 h-32 border border-semantic-neutral-300 rounded-lg overflow-hidden relative">
        <CasinoSquare :row-index="0" :col-index="0" :store="roundStore" />
      </div>
    `,
  }),
};
