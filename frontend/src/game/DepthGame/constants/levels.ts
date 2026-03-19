import { buildLevelDefinition } from '../builder/buildLevelDefinition';
import { DEPTH_LEVEL_INPUTS } from './levelInputs';

export const DEPTH_LEVELS = DEPTH_LEVEL_INPUTS.map((input) => buildLevelDefinition(input));

export function getLevelDefinition(levelNumber: number) {
  const level = DEPTH_LEVELS.find((item) => item.id === levelNumber);
  if (!level) {
    throw new Error(`Unknown Depth level: ${levelNumber}`);
  }
  return level;
}
