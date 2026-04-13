import solverConfigJson from '../../../../../shared/queens-solver-config.json';
import type { QueensAdminDifficulty } from '../admin/types';

export type SharedSolverDifficulty = QueensAdminDifficulty;

export interface SharedSolverPatternCell {
  row: number;
  col: number;
  activeSquare?: boolean;
}

export interface SharedSolverPatternOffset {
  row: number;
  col: number;
}

export interface SharedBuiltInSolverStepConfig {
  id: string;
  label: string;
  description: string;
  difficultyTier: SharedSolverDifficulty;
  enabled: boolean;
  sortOrder: number;
}

export interface SharedSolverPatternConfig {
  id: string;
  name: string;
  size: number;
  cells: SharedSolverPatternCell[];
  outputFlags: SharedSolverPatternOffset[];
  difficultyTier: SharedSolverDifficulty;
  enabled: boolean;
  sortOrder: number;
}

export interface SharedQueensSolverConfig {
  difficultyOrder: SharedSolverDifficulty[];
  builtInSteps: SharedBuiltInSolverStepConfig[];
  patterns: SharedSolverPatternConfig[];
}

export const SHARED_QUEENS_SOLVER_CONFIG: SharedQueensSolverConfig =
  solverConfigJson as SharedQueensSolverConfig;

export const SHARED_QUEENS_SOLVER_DIFFICULTY_ORDER = SHARED_QUEENS_SOLVER_CONFIG.difficultyOrder;

export function getSharedSolverDifficultyRank(difficulty: SharedSolverDifficulty): number {
  const rank = SHARED_QUEENS_SOLVER_DIFFICULTY_ORDER.indexOf(difficulty);
  return rank >= 0 ? rank : Number.POSITIVE_INFINITY;
}

export function compareSharedSolverDifficulty(
  left: SharedSolverDifficulty,
  right: SharedSolverDifficulty
): number {
  return getSharedSolverDifficultyRank(left) - getSharedSolverDifficultyRank(right);
}

export function getSharedBuiltInSolverStep(stepId: string): SharedBuiltInSolverStepConfig | null {
  return SHARED_QUEENS_SOLVER_CONFIG.builtInSteps.find((step) => step.id === stepId) ?? null;
}

export function getSharedSolverPattern(patternId: string): SharedSolverPatternConfig | null {
  return SHARED_QUEENS_SOLVER_CONFIG.patterns.find((pattern) => pattern.id === patternId) ?? null;
}
