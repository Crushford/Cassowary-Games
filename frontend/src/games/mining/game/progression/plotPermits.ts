import type { MiningPlotPermitDefinition, MiningPlotPermitId } from '../types';

export const PLOT_PERMITS: MiningPlotPermitDefinition[] = [
  {
    id: 'plot-6x6',
    title: '6x6 Claim',
    description: 'Files a permit for a wider contract with six gold seams to track.',
    category: 'plot',
    requiredLevel: 4,
    cost: 1,
    size: 6,
    effectSummary: 'Future fields can load 6x6 contracts.',
  },
  {
    id: 'plot-7x7',
    title: '7x7 Claim',
    description: 'Expands the claim again for a denser field with more room to reason.',
    category: 'plot',
    requiredLevel: 4,
    cost: 1,
    size: 7,
    effectSummary: 'Future fields can load 7x7 contracts.',
  },
  {
    id: 'plot-8x8',
    title: '8x8 Claim',
    description: 'Secures a larger permit for long, high-value stretches of ground.',
    category: 'plot',
    requiredLevel: 4,
    cost: 1,
    size: 8,
    effectSummary: 'Future fields can load 8x8 contracts.',
  },
  {
    id: 'plot-9x9',
    title: '9x9 Claim',
    description: 'The biggest permit in town. Whole hillsides open up once it is stamped.',
    category: 'plot',
    requiredLevel: 4,
    cost: 1,
    size: 9,
    effectSummary: 'Future fields can load 9x9 contracts.',
  },
];

export function getPlotPermit(permitId: MiningPlotPermitId): MiningPlotPermitDefinition {
  const permit = PLOT_PERMITS.find((candidate) => candidate.id === permitId);

  if (!permit) {
    throw new Error(`Unknown plot permit: ${permitId}`);
  }

  return permit;
}
