import { defineStore } from 'pinia';

export interface DialogueTopic {
  id: string;
  questionText: string;
  answerText: string;
  prerequisites: string[];
}

export interface CharacterDialogue {
  id: string;
  displayName: string;
  fallbackEmoji: string;
  portraitUrl: string | null;
  introNodeId: string;
  dialogue: DialogueTopic[];
}

export interface DialogueState {
  currentCharacter: CharacterDialogue | null;
  currentTopicId: string | null;
  isAnimating: boolean;
  // Conversation history per character
  conversationHistory: Record<string, Set<string>>;
}

export const useDialogueStore = defineStore('dialogue', {
  state: (): DialogueState => ({
    currentCharacter: null,
    currentTopicId: null,
    isAnimating: false,
    conversationHistory: {},
  }),

  getters: {
    currentTopic: (state): DialogueTopic | null => {
      if (!state.currentCharacter || !state.currentTopicId) return null;
      return state.currentCharacter.dialogue.find((t) => t.id === state.currentTopicId) || null;
    },

    availableTopics: (state): DialogueTopic[] => {
      if (!state.currentCharacter) return [];

      // Get the conversation history for this character
      const characterHistory = state.conversationHistory[state.currentCharacter.id] || new Set();

      return state.currentCharacter.dialogue.filter((topic) => {
        // Check if all prerequisites have been seen in this character's conversation history
        return topic.prerequisites.every((prereq) => characterHistory.has(prereq));
      });
    },

    isDialogueActive: (state): boolean => {
      return state.currentCharacter !== null;
    },

    // Get conversation history for current character
    currentCharacterHistory: (state): Set<string> => {
      if (!state.currentCharacter) return new Set();
      return state.conversationHistory[state.currentCharacter.id] || new Set();
    },
  },

  actions: {
    loadCharacter(character: CharacterDialogue) {
      this.currentCharacter = character;

      // Initialize conversation history for this character if it doesn't exist
      if (!this.conversationHistory[character.id]) {
        this.conversationHistory[character.id] = new Set();
      }

      // Set current topic to intro if we haven't seen it yet, but don't add to history
      if (!this.conversationHistory[character.id].has(character.introNodeId)) {
        this.currentTopicId = character.introNodeId;
        // Don't auto-add to conversation history - let user click it first
      } else {
        // If we've already seen the intro, find the first available topic
        const available = this.availableTopics;
        this.currentTopicId = available.length > 0 ? available[0].id : null;
      }
    },

    async selectTopic(topicId: string) {
      if (!this.currentCharacter) return;

      const topic = this.currentCharacter.dialogue.find((t) => t.id === topicId);
      if (!topic) return;

      this.currentTopicId = topicId;

      // Add to persistent history
      this.conversationHistory[this.currentCharacter.id].add(topicId);

      // Save to localStorage
      this.saveConversationHistory();
    },

    setAnimating(isAnimating: boolean) {
      this.isAnimating = isAnimating;
    },

    resetDialogue() {
      this.currentCharacter = null;
      this.currentTopicId = null;
      this.isAnimating = false;
    },

    hasSeenTopic(topicId: string): boolean {
      if (!this.currentCharacter) return false;
      return this.conversationHistory[this.currentCharacter.id]?.has(topicId) || false;
    },

    // Save conversation history to localStorage
    saveConversationHistory() {
      try {
        const historyToSave: Record<string, string[]> = {};
        for (const [characterId, topics] of Object.entries(this.conversationHistory)) {
          historyToSave[characterId] = Array.from(topics);
        }
        localStorage.setItem('dialogue-conversation-history', JSON.stringify(historyToSave));
      } catch (error) {
        console.warn('Failed to save conversation history:', error);
      }
    },

    // Load conversation history from localStorage
    loadConversationHistory() {
      try {
        const saved = localStorage.getItem('dialogue-conversation-history');
        if (saved) {
          const historyData: Record<string, string[]> = JSON.parse(saved);
          this.conversationHistory = {};
          for (const [characterId, topics] of Object.entries(historyData)) {
            this.conversationHistory[characterId] = new Set(topics);
          }
        }
      } catch (error) {
        console.warn('Failed to load conversation history:', error);
        this.conversationHistory = {};
      }
    },

    // Reset conversation history for a specific character
    resetCharacterHistory(characterId: string) {
      this.conversationHistory[characterId] = new Set();
      this.saveConversationHistory();
    },

    // Reset all conversation history
    resetAllHistory() {
      this.conversationHistory = {};
      this.saveConversationHistory();
    },
  },
});
