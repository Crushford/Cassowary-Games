import type { QueensAdminDifficulty } from './types';

export const SOLVER_DIFFICULTY_ORDER: QueensAdminDifficulty[] = [
  'easy',
  'medium',
  'hard',
  'extra-hard',
  'unsolvable',
];

export const SOLVER_DIFFICULTY_OPTIONS: Array<{
  label: string;
  value: QueensAdminDifficulty;
}> = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
  { label: 'Extra Hard', value: 'extra-hard' },
  { label: 'Unsolvable', value: 'unsolvable' },
];

export function isSolverDifficulty(value: unknown): value is QueensAdminDifficulty {
  return (
    typeof value === 'string' && SOLVER_DIFFICULTY_ORDER.includes(value as QueensAdminDifficulty)
  );
}

export function normalizeSolverDifficulty(
  value: unknown,
  fallback: QueensAdminDifficulty = 'medium'
): QueensAdminDifficulty {
  return isSolverDifficulty(value) ? value : fallback;
}

export function formatSolverDifficulty(value: QueensAdminDifficulty): string {
  return SOLVER_DIFFICULTY_OPTIONS.find((option) => option.value === value)?.label ?? 'Medium';
}

export function solverDifficultyRank(value: QueensAdminDifficulty): number {
  return SOLVER_DIFFICULTY_ORDER.indexOf(value);
}

export function isDifficultyAtOrBelow(
  difficulty: QueensAdminDifficulty,
  threshold: QueensAdminDifficulty
): boolean {
  return solverDifficultyRank(difficulty) <= solverDifficultyRank(threshold);
}
