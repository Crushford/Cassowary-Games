import type { MiningPermitDefinition, MiningPermitTierId } from '../types';

export const PERMIT_OPTIONS: MiningPermitDefinition[] = [
  {
    id: 'basic-permit',
    title: 'Basic Permit',
    description: 'The standard company share. Nothing generous, nothing criminal.',
    cost: 1,
    payoutMultiplier: 1,
  },
  {
    id: 'better-permit',
    title: 'Better Permit',
    description: 'A friendlier split that keeps more gold in the cassowary pocket.',
    cost: 1,
    payoutMultiplier: 1.25,
  },
  {
    id: 'premium-permit',
    title: 'Premium Permit',
    description: 'A suspiciously generous contract draft, useful for testing payout feel.',
    cost: 1,
    payoutMultiplier: 1.5,
  },
];

export function getPermitOption(permitId: MiningPermitTierId): MiningPermitDefinition {
  const permit = PERMIT_OPTIONS.find((candidate) => candidate.id === permitId);

  if (!permit) {
    throw new Error(`Unknown permit tier: ${permitId}`);
  }

  return permit;
}
