import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface QueensPuzzleCatalogFileRecord {
  id: string | number;
  name?: string;
  layout: string;
  queens: string;
  orthogonalMinDistance?: number;
  difficulty?: string;
  targetQueenCount?: number;
  minimumGroupSize?: number;
}

type QueensPuzzleCatalogFile = Record<string, QueensPuzzleCatalogFileRecord[]>;

interface SplitCatalogIndexEntry {
  sizeKey: string;
  difficulty: string;
  orthogonalMinDistances: number[];
  count: number;
  path: string;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

function mergeCatalogs(
  ...catalogs: Array<QueensPuzzleCatalogFile | null | undefined>
): QueensPuzzleCatalogFile {
  const merged: QueensPuzzleCatalogFile = {};
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

function resolveCatalogEntryPath(publicDir: string, entryPath: string): string {
  const relativePath = entryPath.replace(/^\/queens\//, 'queens/');
  return path.resolve(publicDir, relativePath);
}

function loadSplitCatalogNamespace(
  publicDir: string,
  namespace: 'classic' | 'extended'
): QueensPuzzleCatalogFile | null {
  const indexPath = path.resolve(publicDir, `queens/catalog/${namespace}-index.json`);
  if (!existsSync(indexPath)) {
    return null;
  }

  const entries = readJsonFile<SplitCatalogIndexEntry[]>(indexPath);
  const catalogs = entries.map((entry) =>
    readJsonFile<QueensPuzzleCatalogFile>(resolveCatalogEntryPath(publicDir, entry.path))
  );

  return mergeCatalogs(...catalogs);
}

export function loadQueensPuzzleCatalogFromPublicDir(publicDir: string): QueensPuzzleCatalogFile {
  const classicCatalog = loadSplitCatalogNamespace(publicDir, 'classic');
  const extendedCatalog = loadSplitCatalogNamespace(publicDir, 'extended');
  if (classicCatalog || extendedCatalog) {
    return mergeCatalogs(classicCatalog, extendedCatalog);
  }

  const classicFallbackPath = path.resolve(publicDir, 'queens/puzzles.json');
  const extendedFallbackPath = path.resolve(publicDir, 'queens/extendedPuzzles.json');

  return mergeCatalogs(
    existsSync(classicFallbackPath) ? readJsonFile<QueensPuzzleCatalogFile>(classicFallbackPath) : null,
    existsSync(extendedFallbackPath)
      ? readJsonFile<QueensPuzzleCatalogFile>(extendedFallbackPath)
      : null
  );
}
