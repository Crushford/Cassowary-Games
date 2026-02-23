<template>
  <router-view />
  <CookieConsentBanner />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import CookieConsentBanner from './components/shared/CookieConsentBanner.vue';
import { useCookieConsent } from './composables/useCookieConsent';
import { initGoogleAnalytics, trackPageView } from './utils/analytics';

const route = useRoute();
const { hasAccepted } = useCookieConsent();

// Initialize analytics if consent was already given (on page load)
onMounted(() => {
  if (hasAccepted.value && import.meta.env.VITE_GA_MEASUREMENT_ID) {
    initGoogleAnalytics();
    // Track initial page view after GA initializes
    setTimeout(() => {
      const [path, query] = route.fullPath.split('?');
      trackPageView(path, query ? `?${query}` : undefined);
    }, 100);
  }
});

// Track page views on route changes (including query strings)
watch(
  () => route.fullPath,
  (fullPath) => {
    if (hasAccepted.value) {
      // Extract path and query separately for clarity
      const [path, query] = fullPath.split('?');
      trackPageView(path, query ? `?${query}` : undefined);
    }
  }
);
</script>
