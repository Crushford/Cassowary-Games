/**
 * queensRules.ts
 *
 * Atomic, stateless Queens game rule checks.
 * These are the lowest-level board constraint functions — no store deps, no side effects.
 * Both queensStore and any future board variant (e.g. infiniteQueensStore) should use these.
 */

import type { Pos } from '../types/types';

/**
 * Returns true if two positions are diagonally adjacent (exactly 1 step diagonally).
 * Queens cannot touch diagonally.
 */
export function isDiagonalTouch(left: Pos, right: Pos): boolean {
  return Math.abs(left.row - right.row) === 1 && Math.abs(left.col - right.col) === 1;
}

/**
 * Returns true if two positions conflict under the orthogonal minimum distance rule.
 * Two queens on the same row or column must be at least `orthogonalMinDistance` apart.
 */
export function isOrthogonalConflict(
  left: Pos,
  right: Pos,
  orthogonalMinDistance: number
): boolean {
  if (left.row === right.row) {
    return Math.abs(left.col - right.col) < orthogonalMinDistance;
  }
  if (left.col === right.col) {
    return Math.abs(left.row - right.row) < orthogonalMinDistance;
  }
  return false;
}
