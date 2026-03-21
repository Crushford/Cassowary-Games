<template>
  <Modal :is-visible="isVisible" @close="close">
    <div class="text-white">
      <h2 class="text-2xl font-semibold mb-4">Privacy Settings</h2>

      <div class="mb-6">
        <p class="text-semantic-neutral-300 mb-4">
          We use Google Analytics to understand how visitors use our site. This helps us improve the
          user experience by analyzing basic usage patterns like page views and session duration.
        </p>

        <div class="bg-semantic-neutral-800 p-4 rounded-lg mb-4">
          <h3 class="font-semibold mb-2">Current Status:</h3>
          <p v-if="hasAccepted" class="text-semantic-success-400">
            ✓ Analytics tracking is enabled
          </p>
          <p v-else-if="hasConsented" class="text-semantic-warning-400">
            ✗ Analytics tracking is disabled
          </p>
          <p v-else class="text-semantic-neutral-400">No preference set</p>
        </div>

        <div class="space-y-3">
          <button
            class="w-full px-6 py-3 bg-semantic-warning-600 hover:bg-semantic-warning-500 text-white font-semibold rounded-lg transition-colors"
            @click="handleAccept"
          >
            Enable Analytics Tracking
          </button>

          <button
            class="w-full px-6 py-3 bg-semantic-neutral-700 hover:bg-semantic-neutral-600 text-white font-semibold rounded-lg transition-colors"
            @click="handleDecline"
          >
            Disable Analytics Tracking
          </button>
        </div>

        <p class="text-sm text-semantic-neutral-400 mt-4">
          Your preference is saved locally in your browser and will persist across visits.
        </p>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue';
import { useCookieConsent } from '@/shared/composables/useCookieConsent';
import { initGoogleAnalytics } from '@/shared/utils/analytics';
import { trackAnalyticsConsentUpdated } from '@/shared/utils/analyticsEvents';

interface Props {
  isVisible: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const { hasConsented, hasAccepted, acceptConsent, declineConsent } = useCookieConsent();

const close = () => {
  emit('close');
};

const handleAccept = () => {
  acceptConsent();
  trackAnalyticsConsentUpdated({ source: 'privacy_settings', status: 'accepted' });
  if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
    initGoogleAnalytics();
  }
  // Small delay to show the change before closing
  setTimeout(() => {
    close();
  }, 300);
};

const handleDecline = () => {
  declineConsent();
  trackAnalyticsConsentUpdated({ source: 'privacy_settings', status: 'declined' });
  // Note: GA won't load if declined, and if it was already loaded,
  // it will stop tracking new events (but won't unload the script)
  setTimeout(() => {
    close();
  }, 300);
};
</script>
