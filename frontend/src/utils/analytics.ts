import { configure, addGtag, event, pageview } from 'vue-gtag';
import { useCookieConsent } from '@/composables/useCookieConsent';

let isConfigured = false;
let isInitialized = false;

// Initialize Google Analytics (loads the script)
// Only called after user consent is granted
export function initGoogleAnalytics() {
  const { hasAccepted } = useCookieConsent();

  // Only initialize if user has accepted cookies
  if (!hasAccepted.value) {
    return;
  }

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) {
    return;
  }

  // Configure vue-gtag with proper GA4 settings (only once)
  if (!isConfigured) {
    configure({
      tagId: measurementId,
      initMode: 'manual', // Don't auto-initialize
      config: {
        // Disable advertising features for privacy compliance
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        // Enable IP anonymization (GA4 handles this differently, but we ensure no extra identifiers)
        anonymize_ip: true,
      },
    });
    isConfigured = true;
  }

  // Initialize GA (loads the script) - only once, idempotent
  if (!isInitialized) {
    addGtag();
    isInitialized = true;
  }
}

export function trackEvent(eventName: string, eventParams?: Record<string, unknown>) {
  const { hasAccepted } = useCookieConsent();

  if (!hasAccepted.value || !isInitialized) {
    return;
  }

  // Ensure no personal data is sent
  const safeParams: Record<string, unknown> = {};
  if (eventParams) {
    for (const [key, value] of Object.entries(eventParams)) {
      // Filter out any potential personal identifiers
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.includes('email') &&
        !lowerKey.includes('username') &&
        !lowerKey.includes('user_id') &&
        !lowerKey.includes('name') &&
        typeof value !== 'object'
      ) {
        safeParams[key] = value;
      }
    }
  }

  event(eventName, safeParams);
}

export function trackPageView(path: string, query?: string) {
  const { hasAccepted } = useCookieConsent();

  if (!hasAccepted.value || !isInitialized) {
    return;
  }

  // Include query string if provided
  const fullPath = query ? `${path}${query}` : path;

  pageview({
    page_path: fullPath,
  });
}
