import { createRouter, createWebHistory } from 'vue-router';
import HarvestGame from '@/games/queens/views/HarvestGame.vue';
import PlantGame from '@/games/queens/views/PlantGame.vue';
import LevelBuilder from '@/games/queens/views/LevelBuilder.vue';
import Levels from '@/games/queens/views/Levels.vue';
import KenoGameWrapper from '@/games/keno/views/KenoGameWrapper.vue';
import QueensGame from '@/games/queens/views/QueensGame.vue';
import QueensAdmin from '@/games/queens/views/QueensAdmin.vue';
import IncrementalQueensEntry from '@/games/queens/views/IncrementalQueensEntry.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/level-builder',
      name: 'level-builder',
      component: LevelBuilder,
    },
    {
      path: '/harvest',
      name: 'harvest',
      component: HarvestGame,
    },
    {
      path: '/plant',
      name: 'plant',
      component: PlantGame,
    },
    {
      path: '/levels',
      name: 'levels',
      component: Levels,
    },
    {
      path: '/keno',
      name: 'keno',
      component: KenoGameWrapper,
    },
    {
      path: '/queens',
      name: 'queens',
      component: () => import('@/games/queens/views/QueensLevels.vue'),
    },
    {
      path: '/queens/tutorial/:levelName',
      name: 'queens-tutorial',
      component: QueensGame,
    },
    {
      path: '/queens/incremental',
      name: 'queens-incremental',
      component: IncrementalQueensEntry,
    },
    {
      path: '/queens/admin',
      name: 'queens-admin',
      redirect: (to) => {
        const tab =
          to.query.tab === 'batch' || to.query.tab === 'catalog' ? to.query.tab : 'workshop';
        return { name: `queens-admin-${tab}` };
      },
    },
    {
      path: '/queens/admin/workshop',
      name: 'queens-admin-workshop',
      component: QueensAdmin,
    },
    {
      path: '/queens/admin/batch',
      name: 'queens-admin-batch',
      component: QueensAdmin,
    },
    {
      path: '/queens/admin/catalog',
      name: 'queens-admin-catalog',
      component: QueensAdmin,
    },
    {
      path: '/queens/puzzle/:encodedLayout',
      name: 'queens-encoded-puzzle',
      component: QueensGame,
    },
    {
      path: '/queens/:sizeKey/mindistance:orthogonalMinDistance/:difficulty(easy|medium|hard)/:selectedPuzzleId?',
      name: 'queens-selection-puzzle-with-difficulty',
      component: QueensGame,
    },
    {
      path: '/queens/:sizeKey/mindistance:orthogonalMinDistance/:selectedPuzzleId?',
      name: 'queens-selection-puzzle',
      component: QueensGame,
    },
    {
      path: '/queens/:puzzleId',
      name: 'queens-puzzle',
      component: QueensGame,
    },
    {
      path: '/depth',
      redirect: '/depth/levels',
    },
    {
      path: '/depth/levels',
      name: 'depth-levels',
      component: () => import('@/games/depth/views/Game.vue'),
    },
    {
      path: '/depth/level/:levelId',
      name: 'depth-level',
      component: () => import('@/games/depth/views/Game.vue'),
    },
    {
      path: '/depth/dev',
      name: 'depth-dev',
      component: () => import('@/games/depth/views/DevGame.vue'),
    },
    {
      path: '/mining',
      name: 'mining',
      component: () => import('@/games/mining/views/MiningGame.vue'),
    },
    {
      path: '/ballarat',
      redirect: '/depth',
    },
    {
      path: '/ballarat/levels',
      redirect: '/depth/levels',
    },
    {
      path: '/ballarat/level/:levelId',
      redirect: (to) => `/depth/level/${to.params.levelId}`,
    },
    {
      path: '/ballarat/dev',
      redirect: '/depth/dev',
    },
    {
      path: '/evolve',
      name: 'evolve',
      component: () => import('@/games/evolve/views/Evolve.vue'),
    },
    {
      path: '/pompeii',
      name: 'pompeii',
      component: () => import('@/games/pompeii/views/PompeiiGame.vue'),
    },
    {
      path: '/storybook',
      redirect: '/storybook-static/index.html',
    },
    {
      path: '/internal/pattern-card-designer',
      name: 'internal-pattern-card-designer',
      component: () => import('@/games/queens/views/PatternCardDesigner.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

export default router;
