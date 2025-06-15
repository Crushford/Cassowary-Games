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
  hasSeenTopics: Set<string>;
  isAnimating: boolean;
}

export const useDialogueStore = defineStore('dialogue', {
  state: (): DialogueState => ({
    currentCharacter: null,
    currentTopicId: null,
    hasSeenTopics: new Set(),
    isAnimating: false,
  }),

  getters: {
    currentTopic: (state): DialogueTopic | null => {
      if (!state.currentCharacter || !state.currentTopicId) return null;
      return state.currentCharacter.dialogue.find((t) => t.id === state.currentTopicId) || null;
    },

    availableTopics: (state): DialogueTopic[] => {
      if (!state.currentCharacter) return [];

      return state.currentCharacter.dialogue.filter((topic) =>
        topic.prerequisites.every((prereq) => state.hasSeenTopics.has(prereq))
      );
    },

    isDialogueActive: (state): boolean => {
      return state.currentCharacter !== null;
    },
  },

  actions: {
    loadCharacter(character: CharacterDialogue) {
      this.currentCharacter = character;
      this.currentTopicId = character.introNodeId;
      this.hasSeenTopics = new Set([character.introNodeId]);
    },

    selectTopic(topicId: string) {
      if (!this.currentCharacter) return;

      const topic = this.currentCharacter.dialogue.find((t) => t.id === topicId);
      if (!topic) return;

      this.currentTopicId = topicId;
      this.hasSeenTopics.add(topicId);
    },

    setAnimating(isAnimating: boolean) {
      this.isAnimating = isAnimating;
    },

    resetDialogue() {
      this.currentCharacter = null;
      this.currentTopicId = null;
      this.hasSeenTopics.clear();
      this.isAnimating = false;
    },

    hasSeenTopic(topicId: string): boolean {
      return this.hasSeenTopics.has(topicId);
    },
  },
});
