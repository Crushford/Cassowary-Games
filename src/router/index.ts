import { createRouter, createWebHistory } from 'vue-router';
import GameMode from '../views/GameMode.vue';
import LevelBuilder from '../views/LevelBuilder.vue';

const router = createRouter({
  history: createWebHistory(),
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
      path: '/game',
      name: 'game',
      component: GameMode,
    },
  ],
});

export default router;
