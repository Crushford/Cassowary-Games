import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Scene, AssetCandidate, SceneLayout, ActiveInteraction } from '../types';
import { sampleScenes } from '../data/sampleScenes';
import { generateCandidatesForScene, generateLayoutForScene } from '../data/sampleAssets';
import * as api from '../admin/api';

export type GenerationStatus = 'idle' | 'pending' | 'running' | 'complete' | 'failed';

export const usePointAndClickAdminStore = defineStore('pointAndClickAdmin', () => {
  const scenes = ref<Scene[]>(sampleScenes);
  const selectedSceneId = ref<string>(sampleScenes[0]?.id ?? '');
  const candidates = ref<AssetCandidate[]>([]);
  const layout = ref<SceneLayout | null>(null);
  const activeEntityId = ref<string | null>(null);
  const loading = ref(false);
  const generationStatus = ref<GenerationStatus>('idle');
  const generationMessage = ref<string>('');

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

  const isGenerating = computed(() => generationStatus.value === 'pending' || generationStatus.value === 'running');

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function selectScene(id: string) {
    selectedSceneId.value = id;
    activeEntityId.value = null;
    loading.value = true;
    try {
      const [fetchedCandidates, fetchedLayout] = await Promise.all([
        api.fetchCandidates(id),
        api.fetchLayout(id),
      ]);
      candidates.value = fetchedCandidates;
      layout.value = fetchedLayout;
    } finally {
      loading.value = false;
    }
  }

  function selectCandidate(candidateId: string) {
    const target = candidates.value.find((c) => c.id === candidateId);
    if (!target) return;
    candidates.value.forEach((c) => {
      if (c.kind === target.kind && c.entityId === target.entityId) c.selected = false;
    });
    target.selected = true;
    // Best-effort persist to backend; errors are non-fatal
    if (selectedSceneId.value) {
      api.selectCandidate(selectedSceneId.value, candidateId).catch(() => {});
    }
  }

  function toggleEntity(entityId: string) {
    activeEntityId.value = activeEntityId.value === entityId ? null : entityId;
  }

  function dismissInteraction() {
    activeEntityId.value = null;
  }

  async function generateAssets(entityId?: string) {
    if (!selectedSceneId.value || isGenerating.value) return;
    generationStatus.value = 'pending';
    generationMessage.value = 'Starting generation…';
    try {
      const job = await api.startGeneration(selectedSceneId.value, entityId);
      generationStatus.value = job.status;

      // Poll until complete
      let attempts = 0;
      while (
        (generationStatus.value === 'pending' || generationStatus.value === 'running') &&
        attempts < 60
      ) {
        await sleep(2000);
        const updated = await api.pollJob(job.jobId);
        generationStatus.value = updated.status;
        generationMessage.value =
          updated.status === 'running' ? 'Generating images…' : updated.status;
        if (updated.candidates?.length) {
          // Merge new candidates in, keeping existing selection state
          mergeCandidates(updated.candidates);
        }
        if (updated.status === 'complete' || updated.status === 'failed') break;
        attempts++;
      }

      if (generationStatus.value === 'complete') {
        generationMessage.value = 'Generation complete';
      } else if (generationStatus.value === 'failed') {
        generationMessage.value = 'Generation failed';
      }
    } catch (err) {
      generationStatus.value = 'failed';
      generationMessage.value = err instanceof Error ? err.message : 'Generation unavailable';
    }
  }

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

  function resetGenerationStatus() {
    generationStatus.value = 'idle';
    generationMessage.value = '';
  }

  // Initialise with the first scene
  selectScene(selectedSceneId.value);

  return {
    scenes,
    selectedSceneId,
    candidates,
    layout,
    activeEntityId,
    loading,
    generationStatus,
    generationMessage,
    isGenerating,
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
    generateAssets,
    resetGenerationStatus,
  };
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
