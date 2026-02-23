import { ref, computed } from 'vue';

const CONSENT_KEY = 'cookie-consent';
const CONSENT_VALUE_ACCEPTED = 'accepted';
const CONSENT_VALUE_DECLINED = 'declined';

// Shared reactive state
const consentStatus = ref<string | null>(null);

// Initialize from localStorage
function loadConsentStatus() {
  try {
    consentStatus.value = localStorage.getItem(CONSENT_KEY);
  } catch (error) {
    console.warn('Failed to read cookie consent from localStorage:', error);
    consentStatus.value = null;
  }
}

// Load on module initialization
loadConsentStatus();

export function useCookieConsent() {
  const hasConsented = computed(() => {
    return (
      consentStatus.value === CONSENT_VALUE_ACCEPTED ||
      consentStatus.value === CONSENT_VALUE_DECLINED
    );
  });

  const hasAccepted = computed(() => {
    return consentStatus.value === CONSENT_VALUE_ACCEPTED;
  });

  const acceptConsent = () => {
    try {
      localStorage.setItem(CONSENT_KEY, CONSENT_VALUE_ACCEPTED);
      consentStatus.value = CONSENT_VALUE_ACCEPTED;
    } catch (error) {
      console.warn('Failed to save cookie consent:', error);
    }
  };

  const declineConsent = () => {
    try {
      localStorage.setItem(CONSENT_KEY, CONSENT_VALUE_DECLINED);
      consentStatus.value = CONSENT_VALUE_DECLINED;
    } catch (error) {
      console.warn('Failed to save cookie consent:', error);
    }
  };

  return {
    hasConsented,
    hasAccepted,
    acceptConsent,
    declineConsent,
  };
}
