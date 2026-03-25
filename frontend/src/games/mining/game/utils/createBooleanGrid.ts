export function createBooleanGrid(size: number, value: boolean = false): boolean[][] {
  return Array.from({ length: size }, () => Array(size).fill(value));
}
