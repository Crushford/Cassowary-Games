import { createRouter, createWebHistory } from 'vue-router';
import HarvestGame from '../views/HarvestGame.vue';
import PlantGame from '../views/PlantGame.vue';
import LevelBuilder from '../views/LevelBuilder.vue';
import Levels from '../views/Levels.vue';
import KenoGameWrapper from '../views/KenoGameWrapper.vue';
import QueensGame from '../views/QueensGame.vue';
import QueensDiversityLab from '../views/QueensDiversityLab.vue';
import IncrementalQueensEntry from '../views/IncrementalQueensEntry.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue'),
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
      component: () => import('../views/QueensLevels.vue'),
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
      path: '/queens/:puzzleId',
      name: 'queens-puzzle',
      component: QueensGame,
    },
    {
      path: '/ballarat',
      name: 'ballarat',
      component: () => import('../views/BallaratGame.vue'),
    },
    {
      path: '/evolve',
      name: 'evolve',
      component: () => import('../views/Evolve.vue'),
    },
    {
      path: '/pompeii',
      name: 'pompeii',
      component: () => import('../views/PompeiiGame.vue'),
    },
    {
      path: '/storybook',
      redirect: '/storybook-static/index.html',
    },
    {
      path: '/internal/queens-diversity',
      name: 'internal-queens-diversity',
      component: QueensDiversityLab,
    },
    {
      path: '/internal/pattern-card-designer',
      name: 'internal-pattern-card-designer',
      component: () => import('../views/PatternCardDesigner.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

export default router;
