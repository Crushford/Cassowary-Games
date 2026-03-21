import { trackEvent } from '@/shared/utils/analytics';

type EventValue = string | number | boolean | undefined;
type EventParams = Record<string, EventValue>;

interface GameEventParams extends EventParams {
  game_name: string;
  game_mode?: string;
}

function sendAnalyticsEvent(eventName: string, params: EventParams) {
  trackEvent(eventName, params);
}

export function trackGameStart(params: GameEventParams) {
  sendAnalyticsEvent('game_start', params);
}

export function trackGameComplete(params: GameEventParams) {
  sendAnalyticsEvent('game_complete', params);
}

export function trackRulesOpened(params: GameEventParams) {
  sendAnalyticsEvent('rules_opened', params);
}

export function trackAnalyticsConsentUpdated(params: {
  source: 'banner' | 'privacy_settings';
  status: 'accepted' | 'declined';
}) {
  sendAnalyticsEvent('analytics_consent_updated', {
    consent_source: params.source,
    consent_status: params.status,
  });
}
