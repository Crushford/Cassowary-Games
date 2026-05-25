import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Scene, AssetCandidate, SceneLayout, ActiveInteraction } from '../types';
import { sampleScenes } from '../data/sampleScenes';
import { generateCandidatesForScene, generateLayoutForScene } from '../data/sampleAssets';

export const usePointAndClickAdminStore = defineStore('pointAndClickAdmin', () => {
  const scenes = ref<Scene[]>(sampleScenes);
  const selectedSceneId = ref<string>(sampleScenes[0]?.id ?? '');
  const candidates = ref<AssetCandidate[]>([]);
  const layout = ref<SceneLayout | null>(null);
  const activeEntityId = ref<string | null>(null);

  // ── Derived state ───────────────────────────────────────────────────────────

  const selectedScene = computed(() => scenes.value.find((s) => s.id === selectedSceneId.value) ?? null);

  const backgroundCandidates = computed(() => candidates.value.filter((c) => c.kind === 'background'));

  const characterCandidates = computed(() => candidates.value.filter((c) => c.kind === 'character'));

  const selectedBackground = computed(() => backgroundCandidates.value.find((c) => c.selected) ?? null);

  // Returns selected candidate per character id
  const selectedCharacterById = computed(() => {
    const map: Record<string, AssetCandidate> = {};
    for (const c of characterCandidates.value) {
      if (c.selected && c.entityId) map[c.entityId] = c;
    }
    return map;
  });

  const activeInteraction = computed((): ActiveInteraction | null => {
    if (!activeEntityId.value || !selectedScene.value) return null;

    const character = selectedScene.value.characters.find((c) => c.id === activeEntityId.value);
    if (character) {
      return {
        kind: 'character',
        entityId: character.id,
        label: `${character.name} — ${character.role}`,
        bodyText: character.description,
        lines: selectedScene.value.dialogue.filter((d) => d.characterId === character.id),
      };
    }

    const interactable = selectedScene.value.interactables.find((i) => i.id === activeEntityId.value);
    if (interactable) {
      return {
        kind: 'object',
        entityId: interactable.id,
        label: interactable.name,
        bodyText: interactable.interactionText,
        lines: [],
      };
    }

    return null;
  });

  // ── Actions ─────────────────────────────────────────────────────────────────

  function selectScene(id: string) {
    selectedSceneId.value = id;
    activeEntityId.value = null;
    const scene = scenes.value.find((s) => s.id === id);
    if (scene) {
      candidates.value = generateCandidatesForScene(scene);
      layout.value = generateLayoutForScene(scene);
    }
  }

  function selectCandidate(candidateId: string) {
    const target = candidates.value.find((c) => c.id === candidateId);
    if (!target) return;
    // Deselect all candidates with the same kind + entityId, then select the target
    candidates.value.forEach((c) => {
      if (c.kind === target.kind && c.entityId === target.entityId) c.selected = false;
    });
    target.selected = true;
  }

  function toggleEntity(entityId: string) {
    activeEntityId.value = activeEntityId.value === entityId ? null : entityId;
  }

  function dismissInteraction() {
    activeEntityId.value = null;
  }

  // Initialise with the first scene
  selectScene(selectedSceneId.value);

  return {
    scenes,
    selectedSceneId,
    candidates,
    layout,
    activeEntityId,
    selectedScene,
    backgroundCandidates,
    characterCandidates,
    selectedBackground,
    selectedCharacterById,
    activeInteraction,
    selectScene,
    selectCandidate,
    toggleEntity,
    dismissInteraction,
  };
});
