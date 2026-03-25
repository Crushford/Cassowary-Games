import type { MiningAutomationDefinition, MiningMagpieSkillId } from '../types';

export const AUTOMATION_OPTIONS: MiningAutomationDefinition[] = [
  {
    id: 'buy-magpie',
    title: 'Buy Magpie',
    description: 'Hire a nosy magpie to start learning the mine instead of merely admiring it.',
    cost: 1,
    effectSummary: 'Enables later training lessons.',
    implemented: true,
  },
  {
    id: 'teach-row-rule',
    title: 'Teach Row Rule',
    description: 'The magpie learns that good seams do not stack within the same row.',
    cost: 1,
    effectSummary: 'Row-based system flags appear after gold is found.',
    implemented: true,
  },
  {
    id: 'teach-column-rule',
    title: 'Teach Column Rule',
    description: 'The bird starts crossing out columns that already contain a found seam.',
    cost: 1,
    effectSummary: 'Column-based system flags appear after gold is found.',
    implemented: true,
  },
  {
    id: 'teach-diagonal-rule',
    title: 'Teach Diagonal Rule',
    description: 'The magpie stops trusting tiles that touch a known seam on the diagonal.',
    cost: 1,
    effectSummary: 'Diagonal system flags appear after gold is found.',
    implemented: true,
  },
  {
    id: 'teach-pattern-recognition',
    title: 'Teach Simple Pattern Recognition',
    description:
      'Prototype lesson slot for later higher-level heuristics and puzzle difficulty tuning.',
    cost: 1,
    effectSummary: 'Prototype only for now.',
    implemented: false,
  },
];

export function getAutomationOption(skillId: MiningMagpieSkillId): MiningAutomationDefinition {
  const skill = AUTOMATION_OPTIONS.find((candidate) => candidate.id === skillId);

  if (!skill) {
    throw new Error(`Unknown magpie skill: ${skillId}`);
  }

  return skill;
}
