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
    implemented: true,
  },
  {
    id: 'auto-flag-row',
    title: 'Row Flags',
    description: 'The magpie starts crossing out the rest of a row once a rich seam is confirmed.',
    category: 'magpie',
    requiredLevel: 1,
    cost: 1,
    effectSummary: 'Confirmed seams add not-gold markers across their row.',
    implemented: true,
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
    implemented: true,
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
    implemented: true,
    requires: ['buy-magpie'],
  },
  {
    id: 'gold-here-row',
    title: 'Gold-Here Flag: Row',
    description:
      'If one candidate remains in a row, the magpie marks that tile as the seam location.',
    category: 'magpie',
    requiredLevel: 2,
    cost: 1,
    effectSummary: 'Single-candidate row logic places gold-here flags.',
    implemented: true,
    requires: ['buy-magpie', 'auto-flag-row'],
  },
  {
    id: 'gold-here-column',
    title: 'Gold-Here Flag: Column',
    description:
      'If one candidate remains in a column, the magpie marks that tile as the seam location.',
    category: 'magpie',
    requiredLevel: 2,
    cost: 1,
    effectSummary: 'Single-candidate column logic places gold-here flags.',
    implemented: true,
    requires: ['buy-magpie', 'auto-flag-column'],
  },
  {
    id: 'gold-here-region',
    title: 'Gold-Here Flag: Region',
    description:
      'Once region logic is visible, the magpie can mark the only remaining seam in a claim.',
    category: 'magpie',
    requiredLevel: 3,
    cost: 1,
    effectSummary: 'Single-candidate region logic places gold-here flags.',
    implemented: false,
    requires: ['buy-magpie'],
  },
  {
    id: 'pattern-automation-1',
    title: 'Pattern Automation I',
    description: 'A future lesson slot for shape-based not-gold deductions borrowed from Queens.',
    category: 'pattern',
    requiredLevel: 3,
    cost: 1,
    effectSummary: 'Pattern automation scaffolding only for now.',
    implemented: false,
    requires: ['buy-magpie'],
  },
  {
    id: 'pattern-automation-2',
    title: 'Pattern Automation II',
    description: 'A second advanced lesson slot for more complex pattern-based mining deductions.',
    category: 'pattern',
    requiredLevel: 3,
    cost: 1,
    effectSummary: 'Pattern automation scaffolding only for now.',
    implemented: false,
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
