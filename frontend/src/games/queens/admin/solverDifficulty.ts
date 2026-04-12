export type QueensAdminSolverDifficulty = 'easy' | 'medium' | 'hard';

export const SOLVER_DIFFICULTY_ORDER: QueensAdminSolverDifficulty[] = ['easy', 'medium', 'hard'];

export const SOLVER_DIFFICULTY_OPTIONS: Array<{
  label: string;
  value: QueensAdminSolverDifficulty;
}> = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
];

export function isSolverDifficulty(value: unknown): value is QueensAdminSolverDifficulty {
  return (
    typeof value === 'string' &&
    SOLVER_DIFFICULTY_ORDER.includes(value as QueensAdminSolverDifficulty)
  );
}

export function normalizeSolverDifficulty(
  value: unknown,
  fallback: QueensAdminSolverDifficulty = 'medium'
): QueensAdminSolverDifficulty {
  return isSolverDifficulty(value) ? value : fallback;
}

export function formatSolverDifficulty(value: QueensAdminSolverDifficulty): string {
  return SOLVER_DIFFICULTY_OPTIONS.find((option) => option.value === value)?.label ?? 'Medium';
}

export function solverDifficultyRank(value: QueensAdminSolverDifficulty): number {
  return SOLVER_DIFFICULTY_ORDER.indexOf(value);
}

export function isDifficultyAtOrBelow(
  difficulty: QueensAdminSolverDifficulty,
  threshold: QueensAdminSolverDifficulty
): boolean {
  return solverDifficultyRank(difficulty) <= solverDifficultyRank(threshold);
}
