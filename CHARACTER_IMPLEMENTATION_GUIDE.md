# Character Implementation Guide

This guide explains how to add new characters to the Honey Pot Ant Farming game.

## Overview

Characters in this game use a dialogue system with branching conversations. Each character has:

- A unique ID and display name
- A portrait image and fallback emoji
- An introduction dialogue that appears first
- Multiple dialogue topics with prerequisites

## How the Dialogue System Works

The dialogue system is managed by the `DialogueBox.vue` component and `dialogueStore.ts`. Here's how it works:

1. **Character Loading**: When a character is loaded, their intro dialogue appears automatically
2. **Topic Availability**: Topics become available based on prerequisites (what the player has already seen)
3. **Typewriter Effect**: Text appears with a typewriter animation
4. **Auto-scroll**: The dialogue box automatically scrolls to show new text
5. **Topic Selection**: Players can click on available topic buttons to continue the conversation

## Step-by-Step Implementation

### 1. Create Character Data File

Copy the template from `src/data/characters/character-template.json` and customize it:

```json
{
  "id": "your_character_id",
  "displayName": "Your Character Name",
  "fallbackEmoji": "🦜",
  "portraitUrl": "/assets/characters/your-character.png",
  "introNodeId": "your_character_intro",
  "dialogue": [
    {
      "id": "your_character_intro",
      "questionText": "Introduction",
      "answerText": "Your character's introduction text here...",
      "prerequisites": []
    }
    // ... more dialogue topics
  ]
}
```

### 2. Add Character Portrait

Place your character's portrait image in `public/assets/characters/` with the filename referenced in `portraitUrl`.

### 3. Import and Load Character

In your component (like `Story.vue`), import and load the character:

```typescript
import yourCharacter from '../../data/characters/your-character.json';

// In your component setup
onMounted(() => {
  dialogueStore.loadCharacter(yourCharacter);
});
```

### 4. Character Switching (Optional)

To allow switching between characters, you can modify the dialogue store:

```typescript
// In your component
const switchToCharacter = (character: CharacterDialogue) => {
  dialogueStore.loadCharacter(character);
};
```

## Dialogue Structure

### Required Fields

- **id**: Unique identifier for the character
- **displayName**: Name shown in the UI
- **fallbackEmoji**: Emoji shown if portrait image fails to load
- **portraitUrl**: Path to character portrait image
- **introNodeId**: ID of the first dialogue topic to show
- **dialogue**: Array of dialogue topics

### Dialogue Topic Fields

- **id**: Unique identifier for this topic
- **questionText**: Text shown on the topic button
- **answerText**: The character's response (supports `\n\n` for paragraphs)
- **prerequisites**: Array of topic IDs that must be seen first

## Prerequisites System

The prerequisites system controls conversation flow:

- **Empty array `[]`**: Topic is available immediately
- **Single prerequisite `["topic_id"]`**: Topic requires one other topic to be seen first
- **Multiple prerequisites `["topic1", "topic2"]`**: Topic requires multiple topics to be seen first

## Best Practices

1. **Start with an intro**: Every character should have an introduction topic with no prerequisites
2. **Use meaningful IDs**: Use descriptive IDs like `"who_are_you"` instead of `"topic1"`
3. **Plan conversation flow**: Design your dialogue tree before implementing
4. **Test prerequisites**: Make sure your prerequisite chains work as expected
5. **Use consistent naming**: Follow the existing naming conventions

## Example: Adding a New Character

Here's a complete example of adding a new character called "Zara":

1. **Create `src/data/characters/zara.json`**:

```json
{
  "id": "zara_ant_expert",
  "displayName": "Zara",
  "fallbackEmoji": "🐜",
  "portraitUrl": "/assets/characters/zara.png",
  "introNodeId": "zara_intro",
  "dialogue": [
    {
      "id": "zara_intro",
      "questionText": "Introduction",
      "answerText": "Hello! I'm Zara, the colony's ant behavior specialist. I study how ants communicate and organize themselves.\n\nI can help you understand the deeper patterns in the honeypot ant colonies.",
      "prerequisites": []
    },
    {
      "id": "ant_communication",
      "questionText": "How do ants communicate?",
      "answerText": "Ants use pheromones, touch, and even sound! Each colony has its own chemical language. That's why we can't mix different color groups - they speak different dialects.",
      "prerequisites": []
    },
    {
      "id": "colony_organization",
      "questionText": "How are colonies organized?",
      "answerText": "Every colony has a queen, workers, and specialized roles. The repletes you're working with are the food storage specialists. They're like living pantries!",
      "prerequisites": ["ant_communication"]
    }
  ]
}
```

2. **Add portrait image**: Place `zara.png` in `public/assets/characters/`

3. **Load in component**:

```typescript
import zara from '../../data/characters/zara.json';

onMounted(() => {
  dialogueStore.loadCharacter(zara);
});
```

## Troubleshooting

- **404 on character image**: Check that the image path in `portraitUrl` is correct
- **Topics not appearing**: Verify that prerequisites are correctly set up
- **Typewriter not working**: Check that `answerText` contains valid text
- **Character not loading**: Ensure the JSON file is valid and properly imported

## Advanced Features

### Dynamic Dialogue

You can modify dialogue based on game state by updating the dialogue store:

```typescript
// Add a method to update dialogue based on game progress
dialogueStore.updateDialogueForProgress(gameProgress);
```

### Multiple Characters

To support multiple characters, you can extend the system:

```typescript
// In dialogueStore.ts
state: {
  characters: Map<string, CharacterDialogue>,
  currentCharacterId: string | null,
  // ... other state
}
```

This guide should help you implement new characters effectively!
