import { createRouter, createWebHistory } from 'vue-router';
import GameMode from '../views/GameMode.vue';
import LevelBuilder from '../views/LevelBuilder.vue';

// DEBUG: Log the base URL being used for the router
console.log('🔍 Router Debug: BASE_URL =', import.meta.env.BASE_URL);
console.log('🔍 Router Debug: Current location =', window.location.href);

const router = createRouter({
  // DEBUG: This creates HTML5 history mode (uses browser's history API)
  // This is what causes the 404 issue on refresh in production
  // The server needs to be configured to serve index.html for all routes
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      // DEBUG: Lazy loading - this component is loaded only when needed
      component: () => import('../views/Home.vue'),
    },
    {
      path: '/level-builder',
      name: 'level-builder',
      // DEBUG: Eager loading - this component is loaded immediately
      component: LevelBuilder,
    },
    {
      path: '/game',
      name: 'game',
      // DEBUG: Eager loading - this component is loaded immediately
      component: GameMode,
    },
  ],
});

// DEBUG: Add navigation guards to log route changes
router.beforeEach((to, from, next) => {
  console.log('🔍 Router Debug: Navigating from', from.path, 'to', to.path);
  console.log('🔍 Router Debug: To route name =', to.name);
  console.log('🔍 Router Debug: To route params =', to.params);
  console.log('🔍 Router Debug: To route query =', to.query);
  next();
});

router.afterEach((to, from) => {
  console.log('🔍 Router Debug: Successfully navigated to', to.path);
  console.log('🔍 Router Debug: Current URL =', window.location.href);
});

// DEBUG: Add error handling for navigation failures
router.onError((error) => {
  console.error('🔍 Router Debug: Navigation error:', error);
  console.error('🔍 Router Debug: Error details:', {
    message: error.message,
    stack: error.stack,
    currentLocation: window.location.href,
  });
});

export default router;
