import type { DialogueNode } from '../stores/dialogueStore';

export const dialogueTree: Record<string, DialogueNode> = {
  start: {
    id: 'start',
    text: "Hello there! I'm Polly the Parrot. I've been watching your ant farming adventures with great interest!",
    options: [
      {
        id: 'start_1',
        text: 'Who are you?',
        nextNodeId: 'who_are_you',
      },
      {
        id: 'start_2',
        text: 'What do you know about ant farming?',
        nextNodeId: 'ant_farming',
      },
      {
        id: 'start_3',
        text: "I'm busy, can we talk later?",
        nextNodeId: 'busy',
      },
    ],
  },
  who_are_you: {
    id: 'who_are_you',
    text: "I'm Polly, the guardian of the ant farm! I've been here for generations, watching over the colony and helping new farmers like yourself.",
    options: [
      {
        id: 'who_1',
        text: "That's fascinating! Tell me more about your role.",
        nextNodeId: 'guardian_role',
      },
      {
        id: 'who_2',
        text: 'How long have you been here?',
        nextNodeId: 'how_long',
      },
      {
        id: 'who_3',
        text: 'I need to get back to farming.',
        nextNodeId: 'back_to_farming',
      },
    ],
  },
  ant_farming: {
    id: 'ant_farming',
    text: "Oh, I know quite a bit! The key is to maintain the right balance of honey pots and avoid getting bitten. It's all about strategy!",
    options: [
      {
        id: 'farming_1',
        text: 'Can you give me some tips?',
        nextNodeId: 'farming_tips',
      },
      {
        id: 'farming_2',
        text: "What's the deal with the honey pots?",
        nextNodeId: 'honey_pots',
      },
      {
        id: 'farming_3',
        text: 'Thanks for the info!',
        nextNodeId: 'back_to_farming',
      },
    ],
  },
  busy: {
    id: 'busy',
    text: "Of course! Farming is important work. Come back when you have time to chat. I'll be here!",
    options: [
      {
        id: 'busy_1',
        text: 'Actually, I do have time now.',
        nextNodeId: 'start',
      },
      {
        id: 'busy_2',
        text: 'Thanks for understanding!',
        nextNodeId: 'end',
      },
    ],
  },
};
