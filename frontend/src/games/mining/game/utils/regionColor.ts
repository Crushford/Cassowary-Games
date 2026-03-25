export function getRegionColorStyle(
  regionId: string | null,
  muted: boolean = false
): Record<string, string> {
  if (!regionId || regionId === '.') {
    return {};
  }

  const seed = regionId.charCodeAt(0);
  const hue = (seed * 37) % 360;
  const saturation = muted ? 28 : 48;
  const lightness = muted ? 30 : 42;

  return {
    backgroundColor: `hsl(${hue}deg ${saturation}% ${lightness}%)`,
    borderColor: `hsl(${hue}deg ${Math.max(20, saturation - 8)}% ${Math.max(20, lightness - 10)}%)`,
  };
}
