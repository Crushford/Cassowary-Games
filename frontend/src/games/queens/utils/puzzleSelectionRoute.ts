export type QueensSelectionDifficulty = 'easy' | 'medium' | 'hard';

interface QueensSelectionRouteInput {
  sizeKey: string;
  orthogonalMinDistance: number;
  difficulty?: QueensSelectionDifficulty | null;
  puzzleId?: string | number | null;
  targetQueenCount?: number | null;
  minimumGroupSize?: number | null;
}

export function isQueensSelectionDifficulty(
  value: string | null | undefined
): value is QueensSelectionDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

export function buildQueensSelectionPath({
  sizeKey,
  orthogonalMinDistance,
  difficulty,
  puzzleId,
}: QueensSelectionRouteInput): string {
  const basePath = `/queens/${sizeKey}/mindistance${orthogonalMinDistance}`;
  const selectionPath = difficulty ? `${basePath}/${difficulty}` : basePath;
  return puzzleId === null || puzzleId === undefined
    ? selectionPath
    : `${selectionPath}/${String(puzzleId)}`;
}

export function buildQueensSelectionRoute({
  sizeKey,
  orthogonalMinDistance,
  difficulty,
  puzzleId,
  targetQueenCount,
  minimumGroupSize,
}: QueensSelectionRouteInput): { path: string } {
  const route: {
    path: string;
    query?: Record<string, string>;
  } = {
    path: buildQueensSelectionPath({
      sizeKey,
      orthogonalMinDistance,
      difficulty,
      puzzleId,
    }),
  };

  const query: Record<string, string> = {};
  if (targetQueenCount != null) {
    query.targetQueenCount = String(targetQueenCount);
  }
  if (minimumGroupSize != null) {
    query.minimumGroupSize = String(minimumGroupSize);
  }

  if (Object.keys(query).length > 0) {
    route.query = query;
  }

  return route;
}
