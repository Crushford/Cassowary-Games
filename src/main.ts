import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

// DEBUG: Log app initialization
console.log('🔍 App Debug: Starting app initialization');
console.log('🔍 App Debug: Current URL at startup =', window.location.href);
console.log('🔍 App Debug: User agent =', navigator.userAgent);

const app = createApp(App);
const pinia = createPinia();

// DEBUG: Log when plugins are being added
console.log('🔍 App Debug: Adding Pinia store');
app.use(pinia);

console.log('🔍 App Debug: Adding Vue Router');
app.use(router);

// DEBUG: Log when app is being mounted
console.log('🔍 App Debug: Mounting app to #app element');
app.mount('#app');

// DEBUG: Log after app is mounted
console.log('🔍 App Debug: App successfully mounted');
console.log('🔍 App Debug: Current route =', router.currentRoute.value.path);
