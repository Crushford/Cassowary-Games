import { createRouter, createWebHistory } from 'vue-router';
import HarvestGame from '../views/HarvestGame.vue';
import PlantGame from '../views/PlantGame.vue';
import LevelBuilder from '../views/LevelBuilder.vue';
import CasinoGame from '../components/casino/CasinoGame.vue';

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
