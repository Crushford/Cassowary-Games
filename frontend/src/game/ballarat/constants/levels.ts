import { buildLevelDefinition } from '../builder/buildLevelDefinition';
import { BALLARAT_LEVEL_INPUTS } from './levelInputs';

export const BALLARAT_LEVELS = BALLARAT_LEVEL_INPUTS.map((input) => buildLevelDefinition(input));

export function getLevelDefinition(levelNumber: number) {
  const level = BALLARAT_LEVELS.find((item) => item.id === levelNumber);
  if (!level) {
    throw new Error(`Unknown Ballarat level: ${levelNumber}`);
  }
  return level;
}
