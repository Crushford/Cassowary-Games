import type { MiningFieldDefinition, MiningFieldId } from '../types';

export const FIELD_OPTIONS: MiningFieldDefinition[] = [
  {
    id: 'training-field',
    title: 'Training Field',
    description:
      'A forgiving contract parcel that pulls from a smaller, steadier subset of 5x5 patterns.',
    cost: 1,
    boardSize: 5,
    implemented: true,
  },
  {
    id: 'standard-field',
    title: 'Standard Field',
    description:
      'The normal work parcel. Same 5x5 footprint for now, but it uses the full standard puzzle pool.',
    cost: 1,
    boardSize: 5,
    implemented: true,
  },
  {
    id: 'large-field',
    title: 'Larger Fields',
    description:
      'Prototype placeholder for bigger contracts later. Visible now so the menu structure can be tested.',
    cost: 1,
    boardSize: 5,
    implemented: false,
  },
];

export function getFieldOption(fieldId: MiningFieldId): MiningFieldDefinition {
  const field = FIELD_OPTIONS.find((candidate) => candidate.id === fieldId);

  if (!field) {
    throw new Error(`Unknown mining field: ${fieldId}`);
  }

  return field;
}
