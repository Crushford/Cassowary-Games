import { createRouter, createWebHistory } from 'vue-router';
import GameMode from '../views/GameMode.vue';
import LevelBuilder from '../views/LevelBuilder.vue';

function getBaseUrl() {
  if (process.env.CI_PAGES_URL) {
    const url = new URL(process.env.CI_PAGES_URL);
    return url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  }
  return '/';
}

const router = createRouter({
  history: createWebHistory(getBaseUrl()),
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
