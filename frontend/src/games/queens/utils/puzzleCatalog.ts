export interface QueensPuzzleCatalogRecord {
  id: string | number;
  name?: string;
  layout: string;
  queens: string;
  orthogonalMinDistance?: number;
  difficulty?: string;
  targetQueenCount?: number;
  minimumGroupSize?: number;
}

type QueensPuzzleCatalog = Record<string, QueensPuzzleCatalogRecord[]>;

interface SplitCatalogIndexEntry {
  sizeKey: string;
  difficulty: string;
  orthogonalMinDistances: number[];
  countsByOrthogonalMinDistance?: Record<string, number>;
  count: number;
  path: string;
}

const indexCache = new Map<string, Promise<SplitCatalogIndexEntry[]>>();
const sizeCatalogCache = new Map<string, Promise<QueensPuzzleCatalog>>();
let fullCatalogCache: Promise<QueensPuzzleCatalog> | null = null;

async function fetchJson<T>(path: string, cache: RequestCache = 'force-cache'): Promise<T | null> {
  const response = await fetch(path, { cache });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
}

function mergeCatalogs(
  ...catalogs: Array<QueensPuzzleCatalog | null | undefined>
): QueensPuzzleCatalog {
  const merged: QueensPuzzleCatalog = {};
  for (const catalog of catalogs) {
    if (!catalog) continue;
    for (const [sizeKey, puzzles] of Object.entries(catalog)) {
      if (!merged[sizeKey]) {
        merged[sizeKey] = [];
      }
      merged[sizeKey].push(...puzzles);
    }
  }
  return merged;
}

async function loadSplitIndex(
  namespace: 'classic' | 'extended'
): Promise<SplitCatalogIndexEntry[]> {
  const cached = indexCache.get(namespace);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    const payload = await fetchJson<SplitCatalogIndexEntry[]>(
      `/queens/catalog/${namespace}-index.json`
    );
    return Array.isArray(payload) ? payload : [];
  })();

  indexCache.set(namespace, promise);
  return promise;
}

export async function loadQueensPuzzleCatalogForSize(
  sizeKey: string,
  cache: RequestCache = 'force-cache'
): Promise<QueensPuzzleCatalog> {
  const cached = sizeCatalogCache.get(sizeKey);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    const [classicIndex, extendedIndex] = await Promise.all([
      loadSplitIndex('classic'),
      loadSplitIndex('extended'),
    ]);

    const matchingEntries = [...classicIndex, ...extendedIndex].filter(
      (entry) => entry.sizeKey === sizeKey
    );

    if (matchingEntries.length > 0) {
      const catalogs = await Promise.all(
        matchingEntries.map((entry) => fetchJson<QueensPuzzleCatalog>(entry.path, cache))
      );
      return mergeCatalogs(...catalogs);
    }

    const [classicFallback, extendedFallback] = await Promise.all([
      fetchJson<QueensPuzzleCatalog>('/queens/puzzles.json', cache),
      fetchJson<QueensPuzzleCatalog>('/queens/extendedPuzzles.json', cache),
    ]);

    return mergeCatalogs(
      classicFallback ? { [sizeKey]: classicFallback[sizeKey] ?? [] } : null,
      extendedFallback ? { [sizeKey]: extendedFallback[sizeKey] ?? [] } : null
    );
  })();

  sizeCatalogCache.set(sizeKey, promise);
  return promise;
}

export async function loadMergedQueensPuzzleCatalog(
  cache: RequestCache = 'force-cache'
): Promise<QueensPuzzleCatalog> {
  if (fullCatalogCache) {
    return fullCatalogCache;
  }

  fullCatalogCache = (async () => {
    const [classicIndex, extendedIndex] = await Promise.all([
      loadSplitIndex('classic'),
      loadSplitIndex('extended'),
    ]);

    const allEntries = [...classicIndex, ...extendedIndex];
    if (allEntries.length > 0) {
      const catalogs = await Promise.all(
        allEntries.map((entry) => fetchJson<QueensPuzzleCatalog>(entry.path, cache))
      );
      return mergeCatalogs(...catalogs);
    }

    const [classicFallback, extendedFallback] = await Promise.all([
      fetchJson<QueensPuzzleCatalog>('/queens/puzzles.json', cache),
      fetchJson<QueensPuzzleCatalog>('/queens/extendedPuzzles.json', cache),
    ]);
    return mergeCatalogs(classicFallback, extendedFallback);
  })();

  return fullCatalogCache;
}

export function __resetPuzzleCatalogCacheForTests(): void {
  indexCache.clear();
  sizeCatalogCache.clear();
  fullCatalogCache = null;
}
