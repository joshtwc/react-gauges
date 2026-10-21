import { useEffect, useState } from 'react';
import { useAnimatedNumber, type AnimateInput } from './animation';
import { createFormatter, createTickFormatter, type FormatInput, type FormatOptions, type Formatter } from './format';
import { clamp, generateTicks, normalize, type TickOptions, type Ticks } from './scale';
import { limitMarkers, limitZones, statusColor, useLimitStatus, type GaugeStatus, type Limits, type StatusInfo } from './limits';
import { V } from './theme';
import { valueColor, type Marker, type Zone } from './zones';

export interface RangedInput {
  value: number;
  min?: number;
  max?: number;
  zones?: Zone[];
  markers?: Marker[];
  limits?: Limits;
  onStatusChange?: (status: GaugeStatus, info: StatusInfo) => void;
  format?: FormatInput;
  tickFormat?: FormatInput;
  ticks?: TickOptions | false;
  color?: string;
  zoneColor?: boolean;
  animate?: AnimateInput;
}

export interface RangedDefaults {
  min: number;
  max: number;
  format?: FormatOptions;
  tickFormat?: FormatOptions;
  ticks?: TickOptions;
  /** Fallback indicator colour (default: accent). */
  color?: string;
  /** Reading to test against `limits` when it isn't `value` (e.g. a bubble level's tilt magnitude). */
  statusValue?: number;
}

export interface RangedState {
  min: number;
  max: number;
  /** The animated value (unclamped). */
  display: number;
  /** Animated value clamped to the range – use for positioning. */
  pos: number;
  /** 0..1 position of the animated value. */
  ratio: number;
  over: boolean;
  under: boolean;
  fmt: Formatter;
  tickFmt: Formatter;
  ticks: Ticks;
  tickOptions: TickOptions;
  color: string;
  /** Formatted animated value for the readout. */
  text: string;
  /** Formatted target value for ARIA. */
  ariaText: string;
  /** Zones to draw: the gauge's own, else ones derived from `limits`. */
  zones: Zone[];
  /** Markers to draw: the gauge's own plus one per limit. */
  markers: Marker[];
  /** Status against `limits` (always `'ok'` without limits). */
  status: GaugeStatus;
  statusInfo: StatusInfo;
  limits?: Limits;
}

/** Shared setup for every min/max gauge: range, animation, formatting, ticks and colour. */
export function useRanged(p: RangedInput, d: RangedDefaults): RangedState {
  const min = p.min ?? d.min;
  const max = p.max ?? d.max;
  const display = useAnimatedNumber(p.value, p.animate, { initial: min });
  const finite = Number.isFinite(display);
  const pos = finite ? clamp(display, min, max) : min;
  const ratio = normalize(pos, min, max);
  const fmt = createFormatter(p.format, d.format);
  const tickOptions: TickOptions = p.ticks === false ? { show: false } : { ...d.ticks, ...p.ticks };
  const ticks = generateTicks(min, max, tickOptions, d.ticks?.count ?? 5);
  // Long tick labels (≥ 10,000) switch to compact notation unless a tick format is given.
  const big = Math.max(Math.abs(min), Math.abs(max)) >= 10000;
  const tickFmt = createTickFormatter(p.tickFormat, p.format, ticks.step, big && p.tickFormat === undefined ? { notation: 'compact', ...d.tickFormat } : d.tickFormat);
  const statusInfo = useLimitStatus(d.statusValue ?? p.value, p.limits, p.onStatusChange);
  const zones = p.zones ?? (p.limits && p.limits.showZones !== false ? limitZones(p.limits, min, max) : []);
  const markers = [...(p.markers ?? []), ...(p.limits && p.limits.showMarkers !== false ? limitMarkers(p.limits) : [])];
  // An explicit colour wins; otherwise a warning/alarm tints the indicator, then zones.
  const alertColor = p.color || p.zoneColor === false ? undefined : statusColor(statusInfo.status);
  const color = alertColor ?? valueColor(pos, zones, p.color, p.zoneColor ?? true, d.color ?? V.accent);
  const ctx = { min, max, ratio };
  return {
    min,
    max,
    display,
    pos,
    ratio,
    over: p.value > Math.max(min, max),
    under: p.value < Math.min(min, max),
    fmt,
    tickFmt,
    ticks,
    tickOptions,
    color,
    text: fmt(display, ctx),
    ariaText: fmt(p.value, { min, max, ratio: normalize(p.value, min, max) }),
    zones,
    markers,
    status: statusInfo.status,
    statusInfo,
    limits: p.limits,
  };
}

/** Tracks `prefers-reduced-motion` (false during SSR). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}
