import { ref, computed } from 'vue';
import { isConsentRequiredLocation } from '@/utils/region';

const CONSENT_KEY = 'cookie-consent';
const CONSENT_VALUE_ACCEPTED = 'accepted';
const CONSENT_VALUE_DECLINED = 'declined';
const regionConsentRequired = ref<boolean>(isConsentRequiredLocation());

// Shared reactive state
const consentStatus = ref<string | null>(null);

// Initialize from localStorage
function loadConsentStatus() {
  if (typeof localStorage === 'undefined') {
    consentStatus.value = null;
    return;
  }

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

  const shouldShowBanner = computed(() => {
    return regionConsentRequired.value && !hasConsented.value;
  });

  const isAnalyticsAllowed = computed(() => {
    if (consentStatus.value === CONSENT_VALUE_DECLINED) {
      return false;
    }
    if (consentStatus.value === CONSENT_VALUE_ACCEPTED) {
      return true;
    }
    return !regionConsentRequired.value;
  });

  const acceptConsent = () => {
    if (typeof localStorage === 'undefined') {
      consentStatus.value = CONSENT_VALUE_ACCEPTED;
      return;
    }

    try {
      localStorage.setItem(CONSENT_KEY, CONSENT_VALUE_ACCEPTED);
      consentStatus.value = CONSENT_VALUE_ACCEPTED;
    } catch (error) {
      console.warn('Failed to save cookie consent:', error);
    }
  };

  const declineConsent = () => {
    if (typeof localStorage === 'undefined') {
      consentStatus.value = CONSENT_VALUE_DECLINED;
      return;
    }

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
    regionConsentRequired,
    shouldShowBanner,
    isAnalyticsAllowed,
    acceptConsent,
    declineConsent,
  };
}
