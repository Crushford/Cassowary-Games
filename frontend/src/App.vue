<template>
  <router-view />
  <CookieConsentBanner />
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import CookieConsentBanner from '@/shared/components/CookieConsentBanner.vue';
import { useCookieConsent } from '@/shared/composables/useCookieConsent';
import { initGoogleAnalytics, trackPageView } from '@/shared/utils/analytics';

const route = useRoute();
const { isAnalyticsAllowed } = useCookieConsent();

watch(
  isAnalyticsAllowed,
  (allowed) => {
    if (!allowed || !import.meta.env.VITE_GA_MEASUREMENT_ID) {
      return;
    }

    initGoogleAnalytics();
    setTimeout(() => {
      const [path, query] = route.fullPath.split('?');
      trackPageView(path, query ? `?${query}` : undefined);
    }, 100);
  },
  { immediate: true }
);

// Track page views on route changes (including query strings)
watch(
  () => route.fullPath,
  (fullPath) => {
    if (isAnalyticsAllowed.value) {
      // Extract path and query separately for clarity
      const [path, query] = fullPath.split('?');
      trackPageView(path, query ? `?${query}` : undefined);
    }
  }
);
</script>
