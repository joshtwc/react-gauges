/** Coloured ranges ("zones") and markers shared by all ranged gauges. */

/** Semantic colours. Override any of them with the matching CSS variable or theme key. */
export const ZONE_COLORS = {
  good: 'var(--rg-good, #3f8f5a)',
  warn: 'var(--rg-warn, #d49a2a)',
  bad: 'var(--rg-bad, #c2463d)',
  info: 'var(--rg-info, #3b76c4)',
  cold: 'var(--rg-cold, #5b8fd6)',
} as const;

export interface Zone {
  /** Zone start (inclusive). */
  from: number;
  /** Zone end (inclusive). */
  to: number;
  /** Any CSS colour, or a key of ZONE_COLORS ('good' | 'warn' | 'bad' | 'info' | 'cold'). */
  color: string;
  /** Optional label (used for accessibility text and some gauges' legends). */
  label?: string;
  /** Extra class for the zone shape. */
  className?: string;
}

export interface Marker {
  value: number;
  /** Short label drawn next to the marker. */
  label?: string;
  color?: string;
  className?: string;
}

/** Resolve a zone colour: semantic keys map to theme variables. */
export function resolveColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  return (ZONE_COLORS as Record<string, string>)[color] ?? color;
}

/** First zone containing `value`, or undefined. */
export function zoneAt(value: number, zones: readonly Zone[] | undefined): Zone | undefined {
  if (!zones || !Number.isFinite(value)) return undefined;
  return zones.find((z) => value >= Math.min(z.from, z.to) && value <= Math.max(z.from, z.to));
}

/** Clip a zone to the gauge range; returns null when fully outside. */
export function clipZone(zone: Zone, min: number, max: number): Zone | null {
  const lo = Math.max(Math.min(zone.from, zone.to), Math.min(min, max));
  const hi = Math.min(Math.max(zone.from, zone.to), Math.max(min, max));
  return hi > lo ? { ...zone, from: lo, to: hi } : null;
}

/**
 * Quick zones from threshold stops.
 *
 *   thresholdZones([0, 60, 85, 100])                      → good / warn / bad
 *   thresholdZones([0, 20, 50, 100], ['bad','warn','good']) → low is bad
 */
export function thresholdZones(stops: number[], colors: string[] = ['good', 'warn', 'bad'], labels?: string[]): Zone[] {
  const zones: Zone[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    zones.push({
      from: stops[i],
      to: stops[i + 1],
      color: colors[Math.min(i, colors.length - 1)],
      label: labels?.[i],
    });
  }
  return zones;
}

/** Colour for the value indicator: explicit colour > zone colour (if enabled) > fallback. */
export function valueColor(
  value: number,
  zones: readonly Zone[] | undefined,
  explicit: string | undefined,
  useZoneColor: boolean,
  fallback: string,
): string {
  if (explicit) return resolveColor(explicit)!;
  if (useZoneColor) {
    const z = zoneAt(value, zones);
    if (z) return resolveColor(z.color)!;
  }
  return fallback;
}
