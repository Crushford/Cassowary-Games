# Point-and-Click Scene Pipeline v1

This backend slice adds a v1 scene production pipeline server under the existing Queens admin backend.

## Environment

- `POINTANDCLICK_IMAGE_GENERATION_MODE=mock` (default): returns placeholder asset candidates, no OpenAI calls.
- `POINTANDCLICK_IMAGE_GENERATION_MODE=openai`: enables real image generation.
- `OPENAI_API_KEY`: required only for `openai` mode. Read by backend only; never exposed to frontend.
- `CASSOWARY_LORE_PATH`: optional local path for lore markdown scene files.

## Notes

- This is a backend workshop pipeline, not the gameplay runtime server.
- Generated images are not persisted to cloud storage in v1.
- Scene JSON export is a draft runtime shape for frontend integration.
- No auth, persistence, or job queue is implemented in this version.
