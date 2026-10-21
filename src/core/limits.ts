import { useEffect, useRef } from 'react';
import { ZONE_COLORS, type Marker, type Zone } from './zones';

/** Where a reading sits against its limits. */
export type GaugeStatus = 'ok' | 'warn' | 'alarm';

/** Which limit was crossed. */
export type LimitKey = 'alarmBelow' | 'warnBelow' | 'warnAbove' | 'alarmAbove';

/**
 * Warning and alarm limits.
 *
 *   limits={{ warnBelow: 2, alarmBelow: 0.5 }}      // a cooler must not get too cold
 *   limits={{ warnAbove: 80, alarmAbove: 95 }}      // or too full, too fast, too hot…
 *
 * A reading strictly below a `…Below` limit, or strictly above a `…Above` limit,
 * is in that state. Alarm wins over warning.
 */
export interface Limits {
  /** Warning when the reading drops below this. */
  warnBelow?: number;
  /** Alarm when the reading drops below this. */
  alarmBelow?: number;
  /** Warning when the reading rises above this. */
  warnAbove?: number;
  /** Alarm when the reading rises above this. */
  alarmAbove?: number;
  /**
   * Dead band that stops a reading hovering on a limit from flickering.
   * Once a limit is crossed, the reading must come back past it by this much to clear.
   * Default 0.
   */
  hysteresis?: number;
  /** Draw the limits as coloured zones when the gauge has no `zones` of its own (default true). */
  showZones?: boolean;
  /** Draw a marker line at each limit (default true). */
  showMarkers?: boolean;
  /** Colour the numeric readout while warning or alarming (default true). */
  colorReadout?: boolean;
  /** Blink the readout while alarming. Skipped for users who prefer reduced motion. Default false. */
  blink?: boolean;
  /** Words used in the accessible text and `onStatusChange` info. */
  labels?: Partial<Record<LimitKey, string>>;
}

export interface StatusInfo {
  status: GaugeStatus;
  /** The limit currently crossed, if any. */
  limit?: LimitKey;
  /** That limit's value. */
  threshold?: number;
  /** The reading that caused the change. */
  value: number;
  /** Human-readable state, e.g. "Low alarm". */
  label?: string;
}

export const LIMIT_LABELS: Record<LimitKey, string> = {
  alarmBelow: 'Low alarm',
  warnBelow: 'Low warning',
  warnAbove: 'High warning',
  alarmAbove: 'High alarm',
};

const ORDER: LimitKey[] = ['alarmBelow', 'alarmAbove', 'warnBelow', 'warnAbove'];

/**
 * Pure status check. `active` is the set of limits that were crossed last time;
 * pass it to apply hysteresis. Returns the new set to feed back next time.
 */
export function evaluateLimits(
  value: number,
  limits: Limits | undefined,
  active: ReadonlySet<LimitKey> = new Set(),
): StatusInfo & { active: Set<LimitKey> } {
  const next = new Set<LimitKey>();
  if (limits && Number.isFinite(value)) {
    const h = Math.max(0, limits.hysteresis ?? 0);
    for (const key of ORDER) {
      const at = limits[key];
      if (at === undefined || !Number.isFinite(at)) continue;
      const slack = active.has(key) ? h : 0;
      const below = key.endsWith('Below');
      if (below ? value < at + slack : value > at - slack) next.add(key);
    }
  }
  const limit = ORDER.find((k) => next.has(k));
  const status: GaugeStatus = !limit ? 'ok' : limit.startsWith('alarm') ? 'alarm' : 'warn';
  return {
    status,
    limit,
    threshold: limit ? limits?.[limit] : undefined,
    value,
    label: limit ? limits?.labels?.[limit] ?? LIMIT_LABELS[limit] : undefined,
    active: next,
  };
}

/** Colour for a status indicator – arc, bar, liquid (undefined when ok). */
export function statusColor(status: GaugeStatus): string | undefined {
  return status === 'alarm' ? ZONE_COLORS.bad : status === 'warn' ? ZONE_COLORS.warn : undefined;
}

/**
 * Colour for status *text*. Amber and red are often too light to read as text,
 * so they're mixed toward the text colour: darker on light pages, lighter on dark
 * ones. Override with `--rg-warn-text` / `--rg-bad-text` (theme `warnText` / `badText`).
 */
export function statusTextColor(status: GaugeStatus): string | undefined {
  if (status === 'alarm') return `var(--rg-bad-text, color-mix(in srgb, ${ZONE_COLORS.bad} 80%, var(--rg-text, currentColor)))`;
  if (status === 'warn') return `var(--rg-warn-text, color-mix(in srgb, ${ZONE_COLORS.warn} 60%, var(--rg-text, currentColor)))`;
  return undefined;
}

/** Zones that picture the limits across a range. */
export function limitZones(limits: Limits | undefined, min: number, max: number): Zone[] {
  if (!limits) return [];
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const zones: Zone[] = [];
  const { alarmBelow, warnBelow, warnAbove, alarmAbove } = limits;
  if (alarmBelow !== undefined) zones.push({ from: lo, to: alarmBelow, color: 'bad', label: LIMIT_LABELS.alarmBelow });
  if (warnBelow !== undefined) zones.push({ from: alarmBelow ?? lo, to: warnBelow, color: 'warn', label: LIMIT_LABELS.warnBelow });
  if (warnAbove !== undefined) zones.push({ from: warnAbove, to: alarmAbove ?? hi, color: 'warn', label: LIMIT_LABELS.warnAbove });
  if (alarmAbove !== undefined) zones.push({ from: alarmAbove, to: hi, color: 'bad', label: LIMIT_LABELS.alarmAbove });
  return zones.filter((z) => z.to > z.from);
}

/** Marker lines at each limit. */
export function limitMarkers(limits: Limits | undefined): Marker[] {
  if (!limits) return [];
  return ORDER.flatMap((key) => {
    const at = limits[key];
    return at === undefined ? [] : [{ value: at, color: key.startsWith('alarm') ? 'bad' : 'warn', className: `rg-limit rg-limit-${key}` }];
  });
}

/**
 * Track a reading's status against its limits, with hysteresis, and call
 * `onChange` whenever the status (or the crossed limit) changes – including on
 * mount when the first reading is already out of bounds.
 */
export function useLimitStatus(
  value: number,
  limits: Limits | undefined,
  onChange?: (status: GaugeStatus, info: StatusInfo) => void,
): StatusInfo {
  const active = useRef<Set<LimitKey>>(new Set());
  const result = evaluateLimits(value, limits, active.current);
  const reported = useRef<{ status: GaugeStatus; limit?: LimitKey }>({ status: 'ok' });
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    active.current = result.active;
    const prev = reported.current;
    if (prev.status !== result.status || prev.limit !== result.limit) {
      reported.current = { status: result.status, limit: result.limit };
      const { active: _a, ...info } = result;
      handler.current?.(result.status, info);
    }
  });

  const { active: _a, ...info } = result;
  return info;
}
