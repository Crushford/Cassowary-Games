import { defineStore } from 'pinia';

export interface DialogueOption {
  id: string;
  text: string;
  nextNodeId: string;
}

export interface DialogueNode {
  id: string;
  text: string;
  options: DialogueOption[];
}

export interface DialogueState {
  currentNodeId: string | null;
  isAnimating: boolean;
  dialogueTree: Record<string, DialogueNode>;
  hasSeenNode: Set<string>;
}

export const useDialogueStore = defineStore('dialogue', {
  state: (): DialogueState => ({
    currentNodeId: null,
    isAnimating: false,
    dialogueTree: {},
    hasSeenNode: new Set(),
  }),

  getters: {
    currentNode: (state): DialogueNode | null => {
      if (!state.currentNodeId) return null;
      return state.dialogueTree[state.currentNodeId] || null;
    },

    currentOptions: (state): DialogueOption[] => {
      if (!state.currentNodeId) return [];
      return state.dialogueTree[state.currentNodeId]?.options || [];
    },

    isDialogueActive: (state): boolean => {
      return state.currentNodeId !== null;
    },
  },

  actions: {
    initializeDialogue(dialogueTree: Record<string, DialogueNode>, startNodeId: string) {
      this.dialogueTree = dialogueTree;
      this.currentNodeId = startNodeId;
      this.hasSeenNode = new Set([startNodeId]);
    },

    goToNode(nodeId: string) {
      if (!this.dialogueTree[nodeId]) {
        console.error(`Dialogue node ${nodeId} not found`);
        return;
      }
      this.currentNodeId = nodeId;
      this.hasSeenNode.add(nodeId);
    },

    setAnimating(isAnimating: boolean) {
      this.isAnimating = isAnimating;
    },

    resetDialogue() {
      this.currentNodeId = null;
      this.isAnimating = false;
      this.hasSeenNode.clear();
    },

    hasVisitedNode(nodeId: string): boolean {
      return this.hasSeenNode.has(nodeId);
    },
  },
});
