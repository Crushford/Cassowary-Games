const RULES_SEEN_KEY = 'honey-pot-ant-farming-rules-seen';

export const rulesStorage = {
  hasSeenRules(gameType: string): boolean {
    try {
      return localStorage.getItem(`${RULES_SEEN_KEY}-${gameType}`) === 'true';
    } catch (error) {
      console.warn('Failed to load rules seen state:', error);
      return false;
    }
  },

  markRulesAsSeen(gameType: string) {
    try {
      localStorage.setItem(`${RULES_SEEN_KEY}-${gameType}`, 'true');
    } catch (error) {
      console.warn('Failed to save rules seen state:', error);
    }
  },

  resetRulesSeen(gameType: string) {
    try {
      localStorage.removeItem(`${RULES_SEEN_KEY}-${gameType}`);
    } catch (error) {
      console.warn('Failed to reset rules seen state:', error);
    }
  },
};
