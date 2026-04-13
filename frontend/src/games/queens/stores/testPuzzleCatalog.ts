import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQueensPuzzleCatalogFromPublicDir } from '../utils/puzzleCatalogFile';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadQueensCatalogFixture() {
  return loadQueensPuzzleCatalogFromPublicDir(path.resolve(dirname, '../../../../public'));
}
