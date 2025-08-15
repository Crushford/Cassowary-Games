import type { GridSquare } from '../types/types';

let worker: Worker | null = null;

// Helper function to serialize grid data
function serializeGrid(grid: GridSquare[][]): any[][] {
  return grid.map((row) =>
    row.map((square) => ({
      position: { ...square.position },
      groupColor: square.groupColor,
    }))
  );
}

export function validatePuzzleWithWorker(
  grid: GridSquare[][],
  maxSolutions: number = 2
): Promise<number> {
  return new Promise((resolve, reject) => {
    // Create worker if it doesn't exist
    if (!worker) {
      worker = new Worker(new URL('../workers/puzzleValidator.worker.ts', import.meta.url), {
        type: 'module',
      });
    }

    // Set up message handler
    const messageHandler = (e: MessageEvent) => {
      worker?.removeEventListener('message', messageHandler);
      resolve(e.data.solutions);
    };

    // Set up error handler
    const errorHandler = (e: ErrorEvent) => {
      worker?.removeEventListener('error', errorHandler);
      reject(new Error(`Worker error: ${e.message}`));
    };

    // Add event listeners
    worker.addEventListener('message', messageHandler);
    worker.addEventListener('error', errorHandler);

    // Serialize grid data before sending to worker
    const serializedGrid = serializeGrid(grid);

    // Send data to worker
    worker.postMessage({ grid: serializedGrid, maxSolutions });
  });
}

export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
