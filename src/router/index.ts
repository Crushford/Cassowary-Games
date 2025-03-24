import { createRouter, createWebHistory } from 'vue-router';
import GameMode from '../views/GameMode.vue';
import LevelBuilder from '../views/LevelBuilder.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'game',
      component: GameMode,
    },
    {
      path: '/builder',
      name: 'builder',
      component: LevelBuilder,
    },
  ],
});

export default router;
