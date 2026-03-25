import type { MiningDepthLevel } from '../types';

export function getGoldRewardForDepth(depthLevel: MiningDepthLevel): number {
  switch (depthLevel) {
    case 4:
      return 40;
    case 3:
      return 20;
    case 2:
      return 10;
    default:
      return 5;
  }
}
