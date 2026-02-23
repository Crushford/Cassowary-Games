const EU_TIMEZONES = new Set([
  'Africa/Ceuta',
  'Asia/Nicosia',
  'Atlantic/Azores',
  'Atlantic/Canary',
  'Atlantic/Madeira',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Europe/Bratislava',
  'Europe/Brussels',
  'Europe/Bucharest',
  'Europe/Budapest',
  'Europe/Busingen',
  'Europe/Copenhagen',
  'Europe/Dublin',
  'Europe/Helsinki',
  'Europe/Lisbon',
  'Europe/Ljubljana',
  'Europe/Luxembourg',
  'Europe/Madrid',
  'Europe/Malta',
  'Europe/Mariehamn',
  'Europe/Paris',
  'Europe/Prague',
  'Europe/Riga',
  'Europe/Rome',
  'Europe/Sofia',
  'Europe/Stockholm',
  'Europe/Tallinn',
  'Europe/Vienna',
  'Europe/Vilnius',
  'Europe/Warsaw',
  'Europe/Zagreb',
  'Europe/Berlin',
]);

function getRegionOverride(): 'eu' | 'non-eu' | null {
  const override = import.meta.env.VITE_ANALYTICS_REGION_OVERRIDE?.toLowerCase();
  if (override === 'eu' || override === 'non-eu') {
    return override;
  }
  return null;
}

export function isEuLocation(): boolean {
  const override = getRegionOverride();
  if (override === 'eu') {
    return true;
  }
  if (override === 'non-eu') {
    return false;
  }

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return Boolean(timeZone && EU_TIMEZONES.has(timeZone));
  } catch (error) {
    console.warn('Failed to detect timezone for analytics consent region check:', error);
    return false;
  }
}
