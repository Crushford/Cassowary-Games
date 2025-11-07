import { createRouter, createWebHistory } from 'vue-router';
import HarvestGame from '../views/HarvestGame.vue';
import PlantGame from '../views/PlantGame.vue';
import LevelBuilder from '../views/LevelBuilder.vue';
import CasinoGame from '../components/casino/CasinoGame.vue';
import KenoGameWrapper from '../views/KenoGameWrapper.vue';
import QueensGame from '../views/QueensGame.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'main-game',
      component: CasinoGame,
    },
    {
      path: '/menu',
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
      path: '/casino',
      name: 'casino',
      component: CasinoGame,
    },
    {
      path: '/keno',
      name: 'keno',
      component: KenoGameWrapper,
    },
    {
      path: '/queens',
      name: 'queens',
      component: QueensGame,
    },
    {
      path: '/storybook',
      redirect: '/storybook-static/index.html',
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

export default router;
