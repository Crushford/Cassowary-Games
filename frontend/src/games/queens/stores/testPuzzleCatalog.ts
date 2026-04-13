import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadQueensPuzzleCatalogFromPublicDir } from '../utils/puzzleCatalogFile';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadQueensCatalogFixture() {
  return loadQueensPuzzleCatalogFromPublicDir(path.resolve(dirname, '../../../../public'));
}

export function loadQueensStoryIndexFixture() {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(dirname, '../../../../public/queens/catalog/story-index.json'),
      'utf8'
    )
  );
}
