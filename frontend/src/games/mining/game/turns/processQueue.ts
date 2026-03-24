import type { ProcessResult, ProcessingLoad } from '../types';

export function processQueue(processingLoad: ProcessingLoad | null): ProcessResult {
  if (!processingLoad) {
    return {
      ok: false,
      message: 'There is nothing waiting in the processing area.',
    };
  }

  const nextLoad = {
    ...processingLoad,
    remainingDays: processingLoad.remainingDays - 1,
  };

  if (nextLoad.remainingDays > 0) {
    return {
      ok: true,
      processingLoad: nextLoad,
      goldAwarded: 0,
      tailingsAdded: 0,
      daysSpent: 1,
    };
  }

  return {
    ok: true,
    processingLoad: null,
    goldAwarded: processingLoad.goldValue,
    tailingsAdded: 1,
    daysSpent: 1,
  };
}
