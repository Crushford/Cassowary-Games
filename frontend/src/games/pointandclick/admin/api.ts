import type { Scene, AssetCandidate, SceneLayout } from '../types';
import { sampleScenes } from '../data/sampleScenes';
import { generateCandidatesForScene, generateLayoutForScene } from '../data/sampleAssets';

const BASE = '/api/pointandclick';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Server config ─────────────────────────────────────────────────────────────

export interface ServerConfig {
  generationMode: 'mock' | 'openai';
  model: string;
  loreAvailable: boolean;
  version: string;
}

export async function fetchConfig(): Promise<ServerConfig | null> {
  try {
    return await apiFetch<ServerConfig>('/config');
  } catch {
    return null;
  }
}

// ── Scene manifest ────────────────────────────────────────────────────────────

export async function fetchScenes(): Promise<Scene[]> {
  try {
    return await apiFetch<Scene[]>('/scenes');
  } catch {
    return sampleScenes;
  }
}

export async function fetchManifest(sceneId: string): Promise<Scene | null> {
  try {
    return await apiFetch<Scene>(`/scenes/${sceneId}/manifest`);
  } catch {
    return sampleScenes.find((s) => s.id === sceneId) ?? null;
  }
}

export async function fetchSource(sceneId: string): Promise<string | null> {
  try {
    return await apiFetch<string>(`/scenes/${sceneId}/source`);
  } catch {
    return null;
  }
}

export async function validateScene(sceneId: string): Promise<{ valid: boolean; errors: string[] }> {
  try {
    return await apiFetch<{ valid: boolean; errors: string[] }>(`/scenes/${sceneId}/validate`, {
      method: 'POST',
    });
  } catch {
    return { valid: true, errors: [] };
  }
}

// ── Prompt building ───────────────────────────────────────────────────────────
// Returns candidates with prompt text populated but no imageUrl yet.

export type PromptType = 'backgrounds' | 'characters' | 'objects';

export async function buildPrompts(sceneId: string, type: PromptType): Promise<AssetCandidate[]> {
  try {
    return await apiFetch<AssetCandidate[]>(`/scenes/${sceneId}/prompts/${type}`, {
      method: 'POST',
    });
  } catch {
    // Fall back to locally generated candidates for the matching kind
    const scene = sampleScenes.find((s) => s.id === sceneId);
    if (!scene) return [];
    const all = generateCandidatesForScene(scene);
    const kindMap: Record<PromptType, string> = { backgrounds: 'background', characters: 'character', objects: 'item' };
    return all.filter((c) => c.kind === kindMap[type]);
  }
}

// ── Image generation ──────────────────────────────────────────────────────────
// v1: may return candidates synchronously or asynchronously via jobId.
// Frontend handles both: if jobId present, polls; otherwise uses candidates directly.

export interface GenerationResult {
  jobId?: string;
  candidates?: AssetCandidate[];
  status: 'complete' | 'pending' | 'running' | 'failed';
  error?: string;
}

export async function generateAssets(sceneId: string, type: PromptType): Promise<GenerationResult> {
  return apiFetch<GenerationResult>(`/scenes/${sceneId}/generate/${type}`, {
    method: 'POST',
  });
}

export async function pollJob(jobId: string): Promise<GenerationResult> {
  return apiFetch<GenerationResult>(`/jobs/${jobId}`);
}

// ── Candidate retrieval and selection ─────────────────────────────────────────

export async function fetchCandidates(sceneId: string): Promise<AssetCandidate[]> {
  try {
    return await apiFetch<AssetCandidate[]>(`/scenes/${sceneId}/candidates`);
  } catch {
    const scene = sampleScenes.find((s) => s.id === sceneId);
    return scene ? generateCandidatesForScene(scene) : [];
  }
}

// v1: selection is local-only; selectedCandidateIds are passed to /export.
// v1.1 will add PUT /candidates/:id/select for server-side persistence.
export async function selectCandidate(_sceneId: string, _candidateId: string): Promise<void> {
  // intentionally no-op in v1
}

// ── Layout ────────────────────────────────────────────────────────────────────

export async function fetchLayout(sceneId: string): Promise<SceneLayout | null> {
  try {
    return await apiFetch<SceneLayout>(`/scenes/${sceneId}/layout`);
  } catch {
    const scene = sampleScenes.find((s) => s.id === sceneId);
    return scene ? generateLayoutForScene(scene) : null;
  }
}

// v1: layout is local-only; passed to /export at export time.
// v1.1 will add PUT /layout for server-side persistence.
export async function saveLayout(_sceneId: string, _layout: SceneLayout): Promise<void> {
  // intentionally no-op in v1
}

// ── Export ────────────────────────────────────────────────────────────────────

export interface PlayableScene {
  sceneId: string;
  manifest: Scene;
  layout: SceneLayout;
  assets: {
    backgroundUrl?: string;
    characters: Record<string, string>; // entityId → imageUrl
    objects: Record<string, string>;
  };
}

// In v1, selection + layout live in frontend state and are passed to /export.
// Backend uses them to compose the playable scene without needing persistence.
export interface ExportRequest {
  selectedCandidateIds: string[];
  layout: SceneLayout;
}

export async function exportScene(sceneId: string, payload: ExportRequest): Promise<PlayableScene> {
  return apiFetch<PlayableScene>(`/scenes/${sceneId}/export`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
