<template>
  <Transition name="cookie-banner">
    <div
      v-if="!hasConsented"
      class="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 border-t-2 border-yellow-600 shadow-lg"
    >
      <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-white mb-2">Analytics Consent</h3>
            <p class="text-sm text-gray-300">
              We use Google Analytics to track basic site usage (page views, session duration, and
              unique visitors) to help us improve the site. No personal information is collected.
              Click "Accept" to enable analytics tracking, or "Decline" to disable it.
            </p>
          </div>
          <div class="flex gap-3 flex-shrink-0">
            <button
              @click="decline"
              class="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Decline
            </button>
            <button
              @click="accept"
              class="px-6 py-2 text-sm font-semibold bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { useCookieConsent } from '@/composables/useCookieConsent';
import { initGoogleAnalytics, trackPageView } from '@/utils/analytics';

const route = useRoute();
const { hasConsented, hasAccepted, acceptConsent, declineConsent } = useCookieConsent();

// Watch for consent changes and initialize analytics if accepted
watch(
  hasAccepted,
  (accepted) => {
    if (accepted && import.meta.env.VITE_GA_MEASUREMENT_ID) {
      initGoogleAnalytics();
      // Track current page view after GA initializes
      // Use nextTick to ensure GA is ready
      setTimeout(() => {
        const [path, query] = route.fullPath.split('?');
        trackPageView(path, query ? `?${query}` : undefined);
      }, 100);
    }
  },
  { immediate: true }
);

const accept = () => {
  acceptConsent();
};

const decline = () => {
  declineConsent();
};
</script>

<style scoped>
.cookie-banner-enter-active {
  transition: all 0.3s ease-out;
}

.cookie-banner-leave-active {
  transition: all 0.3s ease-in;
}

.cookie-banner-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.cookie-banner-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
