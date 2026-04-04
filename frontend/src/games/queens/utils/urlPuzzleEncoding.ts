export const QUEENS_PUZZLE_SHARE_BASE_URL = 'https://cassowarygames.com';
const REGION_SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function encodeQueensPuzzleLayout(layout: string): string {
  return globalThis.btoa(layout).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

export function decodeQueensPuzzleLayout(encodedLayout: string): string {
  const normalized = encodedLayout.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return globalThis.atob(`${normalized}${padding}`);
}

export function buildEncodedQueensPuzzleLayout(
  cells: Array<{ groupColor: string | null; isSolutionQueen: boolean }>
): string {
  const regionSymbolMap = new Map<string, string>();
  let nextIndex = 0;

  const rawLayout = cells
    .map((cell) => {
      if (!cell.groupColor) return '.';

      if (!regionSymbolMap.has(cell.groupColor)) {
        const nextSymbol = REGION_SYMBOLS[nextIndex];
        if (!nextSymbol) {
          throw new Error('Queens URL encoding supports at most 26 distinct region ids.');
        }
        regionSymbolMap.set(cell.groupColor, nextSymbol);
        nextIndex += 1;
      }

      const symbol = regionSymbolMap.get(cell.groupColor)!;
      return cell.isSolutionQueen ? symbol.toLowerCase() : symbol;
    })
    .join('');

  return encodeQueensPuzzleLayout(rawLayout);
}
