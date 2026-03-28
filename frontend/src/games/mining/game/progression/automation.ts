import type { MiningAutomationDefinition, MiningMagpieSkillId } from '../types';

export const AUTOMATION_OPTIONS: MiningAutomationDefinition[] = [
  {
    id: 'buy-magpie',
    title: 'Buy Magpie',
    description: 'Hire a nosy magpie to start learning the mine instead of merely admiring it.',
    category: 'magpie',
    requiredLevel: 1,
    cost: 1,
    effectSummary: 'Enables later training lessons.',
  },
  {
    id: 'auto-flag-row',
    title: 'Row Flags',
    description: 'The magpie starts crossing out the rest of a row once a rich seam is confirmed.',
    category: 'magpie',
    requiredLevel: 1,
    cost: 1,
    effectSummary: 'Confirmed seams add not-gold markers across their row.',
    requires: ['buy-magpie'],
  },
  {
    id: 'auto-flag-column',
    title: 'Column Flags',
    description: 'The magpie learns to rule out the rest of a column after a seam is locked in.',
    category: 'magpie',
    requiredLevel: 2,
    cost: 1,
    effectSummary: 'Confirmed seams add not-gold markers down their column.',
    requires: ['buy-magpie'],
  },
  {
    id: 'auto-flag-diagonal',
    title: 'Diagonal Flags',
    description: 'The bird learns to distrust tiles that touch a known seam on the diagonal.',
    category: 'magpie',
    requiredLevel: 2,
    cost: 1,
    effectSummary: 'Confirmed seams add not-gold markers on touching diagonals.',
    requires: ['buy-magpie'],
  },
  {
    id: 'pattern-automation-1',
    title: 'Pattern Automation I',
    description: 'Teaches the magpie the first fixed Queens-derived pattern for not-gold marks.',
    category: 'pattern',
    requiredLevel: 3,
    cost: 1,
    effectSummary: 'Applies the first fixed pattern card to place not-gold markers.',
    requires: ['buy-magpie'],
  },
  {
    id: 'pattern-automation-2',
    title: 'Pattern Automation II',
    description: 'Adds a second fixed Queens-derived pattern for not-gold mining deductions.',
    category: 'pattern',
    requiredLevel: 3,
    cost: 1,
    effectSummary: 'Applies the second fixed pattern card to place not-gold markers.',
    requires: ['buy-magpie'],
  },
];

export function getAutomationOption(skillId: MiningMagpieSkillId): MiningAutomationDefinition {
  const skill = AUTOMATION_OPTIONS.find((candidate) => candidate.id === skillId);

  if (!skill) {
    throw new Error(`Unknown magpie skill: ${skillId}`);
  }

  return skill;
}
