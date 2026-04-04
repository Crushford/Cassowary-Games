export const QUEENS_PUZZLE_SHARE_BASE_URL = 'https://cassowarygames.com';

export function encodeQueensPuzzleLayout(layout: string): string {
  return globalThis.btoa(layout).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

export function decodeQueensPuzzleLayout(encodedLayout: string): string {
  const normalized = encodedLayout.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return globalThis.atob(`${normalized}${padding}`);
}
