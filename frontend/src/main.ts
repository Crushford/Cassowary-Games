import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import App from './App.vue';
import router from './router';
import './style.css';
import 'primeicons/primeicons.css';

const app = createApp(App);
const pinia = createPinia();

document.documentElement.classList.add('app-dark');

app.use(pinia);
app.use(router);
app.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.app-dark',
    },
  },
});
app.mount('#app');
