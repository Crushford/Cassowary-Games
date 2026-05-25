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

// ── Scene CRUD ────────────────────────────────────────────────────────────────

export async function fetchScenes(): Promise<Scene[]> {
  try {
    return await apiFetch<Scene[]>('/scenes');
  } catch {
    return sampleScenes;
  }
}

export async function fetchScene(id: string): Promise<Scene | null> {
  try {
    return await apiFetch<Scene>(`/scenes/${id}`);
  } catch {
    return sampleScenes.find((s) => s.id === id) ?? null;
  }
}

// ── Asset candidates ──────────────────────────────────────────────────────────

export async function fetchCandidates(sceneId: string): Promise<AssetCandidate[]> {
  try {
    return await apiFetch<AssetCandidate[]>(`/scenes/${sceneId}/candidates`);
  } catch {
    const scene = sampleScenes.find((s) => s.id === sceneId);
    return scene ? generateCandidatesForScene(scene) : [];
  }
}

export async function selectCandidate(sceneId: string, candidateId: string): Promise<void> {
  try {
    await apiFetch<void>(`/scenes/${sceneId}/candidates/${candidateId}/select`, {
      method: 'PUT',
    });
  } catch {
    // non-fatal: local state already updated optimistically
  }
}

// ── Image generation ──────────────────────────────────────────────────────────
// Kicks off async generation; returns a job ID to poll.

export interface GenerationJob {
  jobId: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  candidates?: AssetCandidate[];
  error?: string;
}

export async function startGeneration(
  sceneId: string,
  entityId?: string,
): Promise<GenerationJob> {
  return apiFetch<GenerationJob>(`/scenes/${sceneId}/generate`, {
    method: 'POST',
    body: JSON.stringify({ entityId }),
  });
}

export async function pollJob(jobId: string): Promise<GenerationJob> {
  return apiFetch<GenerationJob>(`/jobs/${jobId}`);
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

export async function saveLayout(sceneId: string, layout: SceneLayout): Promise<void> {
  await apiFetch<void>(`/scenes/${sceneId}/layout`, {
    method: 'PUT',
    body: JSON.stringify(layout),
  });
}
