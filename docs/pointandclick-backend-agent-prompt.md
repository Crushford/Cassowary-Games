# Point-and-Click Backend Agent Prompt

## Overall vision
We are building a scene production pipeline for a Cassowary World point-and-click adventure game.
The lore repo contains human-written markdown scene descriptions. These files describe the creative idea of a scene: location, mood, background, characters, interactable objects, dialogue, and player actions.
The frontend dashboard, built separately, will let a user load one of those markdown scenes, inspect its structure, generate visual asset candidates, choose preferred images, arrange characters and objects on top of a background, and finally export a playable scene JSON file.
This backend is not the game engine. It is the pipeline server behind the workshop.
Its job is to turn lore into structured production material:
markdown scene
→ parsed scene manifest
→ image generation prompts
→ asset candidates
→ selected asset metadata
→ exported playable scene JSON
For v1, keep it simple and backend-focused:
- read or load scene markdown
- parse it into a stable manifest
- generate prompts from that manifest
- support mock asset generation
- support real OpenAI image generation only when configured
- return JSON shapes that the frontend can consume
- do not build the frontend UI
- do not implement final persistence yet
- do not implement the full point-and-click runtime
The frontend agent will build the Vue dashboard separately. This backend should provide clean, predictable endpoints and types so the frontend can call it.

Think of this as a tiny content pipeline backend for a game studio tool, not as a player-facing gameplay server.
