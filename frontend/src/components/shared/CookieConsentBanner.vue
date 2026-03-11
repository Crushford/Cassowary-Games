<template>
  <Transition name="cookie-banner">
    <div
      v-if="shouldShowBanner"
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
              class="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              @click="decline"
            >
              Decline
            </button>
            <button
              class="px-6 py-2 text-sm font-semibold bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors"
              @click="accept"
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
import { useCookieConsent } from '@/composables/useCookieConsent';
import { trackAnalyticsConsentUpdated } from '@/utils/analyticsEvents';

const { shouldShowBanner, acceptConsent, declineConsent } = useCookieConsent();

const accept = () => {
  acceptConsent();
  trackAnalyticsConsentUpdated({ source: 'banner', status: 'accepted' });
};

const decline = () => {
  declineConsent();
  trackAnalyticsConsentUpdated({ source: 'banner', status: 'declined' });
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
