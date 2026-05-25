import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Scene, AssetCandidate, SceneLayout, ActiveInteraction } from '../types';
import { sampleScenes } from '../data/sampleScenes';
import { generateCandidatesForScene, generateLayoutForScene } from '../data/sampleAssets';
import * as api from '../admin/api';
import type { PromptType, ServerConfig } from '../admin/api';

export type GenerationStatus = 'idle' | 'pending' | 'running' | 'complete' | 'failed';

// Per-type generation tracking
export interface TypeStatus {
  backgrounds: GenerationStatus;
  characters: GenerationStatus;
  objects: GenerationStatus;
}

export const usePointAndClickAdminStore = defineStore('pointAndClickAdmin', () => {
  const scenes = ref<Scene[]>(sampleScenes);
  const selectedSceneId = ref<string>(sampleScenes[0]?.id ?? '');
  const candidates = ref<AssetCandidate[]>([]);
  const layout = ref<SceneLayout | null>(null);
  const activeEntityId = ref<string | null>(null);
  const loading = ref(false);
  const serverConfig = ref<ServerConfig | null>(null);
  const typeStatus = ref<TypeStatus>({ backgrounds: 'idle', characters: 'idle', objects: 'idle' });
  const typeMessage = ref<Partial<Record<PromptType, string>>>({});

  // ── Derived state ───────────────────────────────────────────────────────────

  const selectedScene = computed(() => scenes.value.find((s) => s.id === selectedSceneId.value) ?? null);

  const backgroundCandidates = computed(() => candidates.value.filter((c) => c.kind === 'background'));
  const characterCandidates = computed(() => candidates.value.filter((c) => c.kind === 'character'));

  const selectedBackground = computed(() => backgroundCandidates.value.find((c) => c.selected) ?? null);

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

  const isAnyGenerating = computed(() =>
    Object.values(typeStatus.value).some((s) => s === 'pending' || s === 'running'),
  );

  const hasPrompts = computed(() => candidates.value.some((c) => c.prompt));

  const hasImages = computed(() => candidates.value.some((c) => c.imageUrl || c.imageData));

  const generationMode = computed(() => serverConfig.value?.generationMode ?? 'mock');

  // ── Scene loading ───────────────────────────────────────────────────────────

  async function selectScene(id: string) {
    selectedSceneId.value = id;
    activeEntityId.value = null;
    typeStatus.value = { backgrounds: 'idle', characters: 'idle', objects: 'idle' };
    loading.value = true;
    try {
      const [manifest, fetchedCandidates, fetchedLayout] = await Promise.all([
        api.fetchManifest(id),
        api.fetchCandidates(id),
        api.fetchLayout(id),
      ]);
      // If backend returns the scene manifest, update the scene list
      if (manifest) {
        const idx = scenes.value.findIndex((s) => s.id === id);
        if (idx >= 0) scenes.value[idx] = manifest;
      }
      candidates.value = fetchedCandidates;
      layout.value = fetchedLayout;
    } finally {
      loading.value = false;
    }
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  async function loadConfig() {
    serverConfig.value = await api.fetchConfig();
  }

  // ── Prompt building ─────────────────────────────────────────────────────────

  async function buildPrompts(type?: PromptType) {
    if (!selectedSceneId.value) return;
    const types: PromptType[] = type ? [type] : ['backgrounds', 'characters', 'objects'];
    await Promise.all(types.map((t) => buildPromptType(t)));
  }

  async function buildPromptType(type: PromptType) {
    typeStatus.value[type] = 'pending';
    typeMessage.value[type] = 'Building prompts…';
    try {
      const built = await api.buildPrompts(selectedSceneId.value, type);
      // Merge into candidates: add new, update existing
      mergeCandidates(built);
      typeStatus.value[type] = 'idle'; // prompts built but not generated yet
      typeMessage.value[type] = `${built.length} prompt${built.length !== 1 ? 's' : ''} ready`;
    } catch (err) {
      typeStatus.value[type] = 'failed';
      typeMessage.value[type] = err instanceof Error ? err.message : 'Failed';
    }
  }

  // ── Image generation ────────────────────────────────────────────────────────

  async function generateType(type: PromptType) {
    if (!selectedSceneId.value) return;
    typeStatus.value[type] = 'pending';
    typeMessage.value[type] = 'Generating…';
    try {
      const result = await api.generateAssets(selectedSceneId.value, type);

      // v1: synchronous result — backend returns candidates directly
      if (result.candidates?.length) {
        mergeCandidates(result.candidates);
        typeStatus.value[type] = 'complete';
        typeMessage.value[type] = `${result.candidates.length} image${result.candidates.length !== 1 ? 's' : ''} ready`;
        return;
      }

      // v2 compatibility: backend returned a jobId, poll until complete
      if (result.jobId) {
        typeStatus.value[type] = 'running';
        let attempts = 0;
        while (attempts < 60) {
          await sleep(2000);
          const poll = await api.pollJob(result.jobId);
          if (poll.candidates?.length) mergeCandidates(poll.candidates);
          if (poll.status === 'complete') {
            typeStatus.value[type] = 'complete';
            typeMessage.value[type] = 'Done';
            return;
          }
          if (poll.status === 'failed') {
            typeStatus.value[type] = 'failed';
            typeMessage.value[type] = poll.error ?? 'Generation failed';
            return;
          }
          attempts++;
        }
        typeStatus.value[type] = 'failed';
        typeMessage.value[type] = 'Timed out';
      }
    } catch (err) {
      typeStatus.value[type] = 'failed';
      typeMessage.value[type] = err instanceof Error ? err.message : 'Unavailable';
    }
  }

  async function generateAll() {
    await Promise.allSettled(
      (['backgrounds', 'characters', 'objects'] as PromptType[]).map((t) => generateType(t)),
    );
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  async function exportScene(): Promise<api.PlayableScene | null> {
    if (!selectedSceneId.value || !layout.value) return null;
    const selectedIds = candidates.value.filter((c) => c.selected).map((c) => c.id);
    try {
      return await api.exportScene(selectedSceneId.value, {
        selectedCandidateIds: selectedIds,
        layout: layout.value,
      });
    } catch (err) {
      console.error('Export failed:', err);
      return null;
    }
  }

  // ── Candidate selection (local only in v1) ──────────────────────────────────

  function selectCandidate(candidateId: string) {
    const target = candidates.value.find((c) => c.id === candidateId);
    if (!target) return;
    candidates.value.forEach((c) => {
      if (c.kind === target.kind && c.entityId === target.entityId) c.selected = false;
    });
    target.selected = true;
  }

  // ── Preview interaction ─────────────────────────────────────────────────────

  function toggleEntity(entityId: string) {
    activeEntityId.value = activeEntityId.value === entityId ? null : entityId;
  }

  function dismissInteraction() {
    activeEntityId.value = null;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function mergeCandidates(incoming: AssetCandidate[]) {
    for (const c of incoming) {
      const existing = candidates.value.find((x) => x.id === c.id);
      if (existing) {
        Object.assign(existing, c);
      } else {
        candidates.value.push(c);
      }
    }
  }

  function resetTypeStatus(type?: PromptType) {
    if (type) {
      typeStatus.value[type] = 'idle';
      delete typeMessage.value[type];
    } else {
      typeStatus.value = { backgrounds: 'idle', characters: 'idle', objects: 'idle' };
      typeMessage.value = {};
    }
  }

  // Initialise
  loadConfig();
  selectScene(selectedSceneId.value);

  return {
    scenes,
    selectedSceneId,
    candidates,
    layout,
    activeEntityId,
    loading,
    serverConfig,
    typeStatus,
    typeMessage,
    isAnyGenerating,
    hasPrompts,
    hasImages,
    generationMode,
    selectedScene,
    backgroundCandidates,
    characterCandidates,
    selectedBackground,
    selectedCharacterById,
    activeInteraction,
    selectScene,
    loadConfig,
    buildPrompts,
    generateType,
    generateAll,
    exportScene,
    selectCandidate,
    toggleEntity,
    dismissInteraction,
    resetTypeStatus,
  };
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
