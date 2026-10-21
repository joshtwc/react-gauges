import { useId, type CSSProperties, type ReactNode } from 'react';
import { polar } from './geometry';
import type { Formatter } from './format';
import { normalize, type Ticks } from './scale';
import { statusTextColor, type Limits, type StatusInfo } from './limits';
import { themeToVars, useGaugeTheme, V, type GaugeTheme } from './theme';

/** Join class names, skipping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string | undefined {
  const s = parts.filter(Boolean).join(' ');
  return s || undefined;
}

/** `useId` output made safe for use inside `url(#…)` references. */
export function useSafeId(prefix = 'rg'): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export interface GaugeFrameProps {
  /** viewBox width / height (and optional origin). */
  width: number;
  height: number;
  x?: number;
  y?: number;
  size?: number | string;
  defaultSize: number;
  className?: string;
  svgClassName?: string;
  style?: CSSProperties;
  theme?: Partial<GaugeTheme>;
  role?: 'meter' | 'img';
  ariaLabel?: string;
  valueNow?: number;
  valueMin?: number;
  valueMax?: number;
  valueText?: string;
  id?: string;
  /** Status against the gauge's limits: sets `data-status`, tints the readout and extends the ARIA text. */
  status?: StatusInfo;
  /** The gauge's limits (for `colorReadout` / `blink`). */
  limits?: Limits;
  /** Extra HTML rendered after the SVG (used by the Odometer). */
  after?: ReactNode;
  children: ReactNode;
}

/** Shared root: sizing, theme variables, and ARIA semantics. */
export function GaugeFrame(p: GaugeFrameProps) {
  const theme = useGaugeTheme(p.theme);
  const size = p.size ?? p.defaultSize;
  const rootStyle: CSSProperties = {
    display: 'inline-block',
    width: typeof size === 'number' ? `${size}px` : size,
    maxWidth: '100%',
    lineHeight: 0,
    fontVariantNumeric: 'tabular-nums',
    ...themeToVars(theme),
    ...statusVars(p.status, p.limits),
    ...p.style,
  };
  const valueText = p.status?.label && p.valueText ? `${p.valueText}, ${p.status.label}` : p.valueText;
  const aria =
    p.role === 'img'
      ? { role: 'img' as const, 'aria-label': p.ariaLabel ?? valueText }
      : {
          role: 'meter' as const,
          'aria-label': p.ariaLabel,
          'aria-valuenow': Number.isFinite(p.valueNow) ? p.valueNow : undefined,
          'aria-valuemin': p.valueMin,
          'aria-valuemax': p.valueMax,
          'aria-valuetext': valueText,
        };
  const status = p.status && p.status.status !== 'ok' ? p.status.status : undefined;
  return (
    <div
      id={p.id}
      className={cx('rg-root', p.className)}
      style={rootStyle}
      data-status={p.status ? p.status.status : undefined}
      data-limit={p.status?.limit}
      {...aria}
    >
      <svg
        className={cx('rg-svg', p.svgClassName)}
        viewBox={`${p.x ?? 0} ${p.y ?? 0} ${p.width} ${p.height}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible', height: 'auto' }}
        fontFamily={V.font}
        aria-hidden="true"
        focusable="false"
      >
        {status === 'alarm' && p.limits?.blink && <style>{BLINK_CSS}</style>}
        {p.children}
      </svg>
      {p.after}
    </div>
  );
}

const BLINK_CSS =
  '@keyframes rg-blink{50%{opacity:.25}}@media (prefers-reduced-motion:no-preference){.rg-root[data-status=alarm] .rg-value{animation:rg-blink 1s steps(1,end) infinite}}';

/** CSS variables that recolour the readout while a limit is crossed. */
export function statusVars(status: StatusInfo | undefined, limits: Limits | undefined): CSSProperties {
  if (!status || status.status === 'ok' || limits?.colorReadout === false) return {};
  return { ['--rg-value' as string]: statusTextColor(status.status) } as CSSProperties;
}

/* ------------------------------------------------------------------ */
/* Arc scale – ticks and labels along a circular arc                  */
/* ------------------------------------------------------------------ */

export interface ArcScaleProps {
  cx: number;
  cy: number;
  /** Radius where ticks start. */
  radius: number;
  startAngle: number;
  endAngle: number;
  min: number;
  max: number;
  ticks: Ticks;
  /** Ticks point inward (default) or outward from `radius`. */
  direction?: 'in' | 'out';
  majorLength?: number;
  minorLength?: number;
  majorWidth?: number;
  minorWidth?: number;
  labelRadius: number;
  labelSize?: number;
  labels?: boolean;
  labelEvery?: number;
  formatTick: Formatter;
  tickClassName?: string;
  labelClassName?: string;
  /** Skip the label at `max` when it would overlap `min` (full circles). */
  skipLastLabel?: boolean;
}

export function ArcScale(p: ArcScaleProps) {
  const dir = p.direction === 'out' ? 1 : -1;
  const angle = (v: number) => p.startAngle + normalize(v, p.min, p.max) * (p.endAngle - p.startAngle);
  const majorLen = p.majorLength ?? 10;
  const minorLen = p.minorLength ?? 5;
  const every = Math.max(1, p.labelEvery ?? 1);
  const tick = (v: number, len: number) => {
    const a = angle(v);
    const p0 = polar(p.cx, p.cy, p.radius, a);
    const p1 = polar(p.cx, p.cy, p.radius + dir * len, a);
    return `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`;
  };
  const ctx = (v: number) => ({ min: p.min, max: p.max, ratio: normalize(v, p.min, p.max) });
  return (
    <g className="rg-ticks">
      {p.ticks.minor.length > 0 && (
        <path
          d={p.ticks.minor.map((v) => tick(v, minorLen)).join(' ')}
          stroke={V.tick}
          strokeWidth={p.minorWidth ?? 1}
          className={p.tickClassName}
          opacity={0.7}
        />
      )}
      <path
        d={p.ticks.major.map((v) => tick(v, majorLen)).join(' ')}
        stroke={V.tick}
        strokeWidth={p.majorWidth ?? 2}
        strokeLinecap="round"
        className={p.tickClassName}
      />
      {p.labels !== false &&
        p.ticks.major.map((v, i) => {
          if (i % every !== 0) return null;
          if (p.skipLastLabel && i === p.ticks.major.length - 1 && i > 0) return null;
          const pt = polar(p.cx, p.cy, p.labelRadius, angle(v));
          return (
            <text
              key={v}
              x={pt.x}
              y={pt.y}
              fill={V.muted}
              fontSize={p.labelSize ?? 11}
              textAnchor="middle"
              dominantBaseline="central"
              className={p.labelClassName}
            >
              {p.formatTick(v, ctx(v))}
            </text>
          );
        })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Linear scale – ticks and labels along a straight axis              */
/* ------------------------------------------------------------------ */

export type Orientation = 'horizontal' | 'vertical';

/**
 * Map "along the axis" / "across the axis" coordinates to x/y.
 * Vertical axes grow upward, so callers pass `along` already flipped.
 */
export function orientPoint(orientation: Orientation, along: number, across: number): { x: number; y: number } {
  return orientation === 'vertical' ? { x: across, y: along } : { x: along, y: across };
}

export interface LinearScaleProps {
  orientation: Orientation;
  /** Axis start/end in the along-axis coordinate (start = min value). */
  start: number;
  end: number;
  /** Across-axis position of the tick baseline. */
  at: number;
  /** Tick direction across the axis: -1 (left/up) or +1 (right/down). */
  side: -1 | 1;
  min: number;
  max: number;
  ticks: Ticks;
  majorLength?: number;
  minorLength?: number;
  labels?: boolean;
  labelEvery?: number;
  labelGap?: number;
  labelSize?: number;
  formatTick: Formatter;
  tickClassName?: string;
  labelClassName?: string;
  /** Map raw tick values before positioning (secondary scales). */
  position?: (v: number) => number;
}

export function LinearScale(p: LinearScaleProps) {
  const pos = (v: number) => p.start + normalize(p.position ? p.position(v) : v, p.min, p.max) * (p.end - p.start);
  const majorLen = p.majorLength ?? 8;
  const minorLen = p.minorLength ?? 4;
  const every = Math.max(1, p.labelEvery ?? 1);
  const line = (v: number, len: number) => {
    const a = orientPoint(p.orientation, pos(v), p.at);
    const b = orientPoint(p.orientation, pos(v), p.at + p.side * len);
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  };
  const gap = p.labelGap ?? 4;
  const labelAcross = p.at + p.side * (majorLen + gap);
  const vertical = p.orientation === 'vertical';
  const ctx = (v: number) => ({ min: p.min, max: p.max, ratio: normalize(v, p.min, p.max) });
  return (
    <g className="rg-ticks">
      {p.ticks.minor.length > 0 && (
        <path
          d={p.ticks.minor.map((v) => line(v, minorLen)).join(' ')}
          stroke={V.tick}
          strokeWidth={1}
          opacity={0.7}
          className={p.tickClassName}
        />
      )}
      <path
        d={p.ticks.major.map((v) => line(v, majorLen)).join(' ')}
        stroke={V.tick}
        strokeWidth={1.5}
        strokeLinecap="round"
        className={p.tickClassName}
      />
      {p.labels !== false &&
        p.ticks.major.map((v, i) => {
          if (i % every !== 0) return null;
          const pt = orientPoint(p.orientation, pos(v), labelAcross);
          return (
            <text
              key={v}
              x={pt.x}
              y={pt.y}
              fill={V.muted}
              fontSize={p.labelSize ?? 10}
              textAnchor={vertical ? (p.side < 0 ? 'end' : 'start') : 'middle'}
              dominantBaseline={vertical ? 'central' : p.side < 0 ? 'auto' : 'hanging'}
              className={p.labelClassName}
            >
              {p.formatTick(v, ctx(v))}
            </text>
          );
        })}
    </g>
  );
}

/**
 * Font size that keeps `text` within `maxWidth` (viewBox units).
 * A cheap estimate (≈0.6em per glyph) – good enough for numeric readouts.
 */
export function fitFontSize(text: string, maxWidth: number, base: number, min = 8): number {
  return Math.max(min, Math.min(base, maxWidth / Math.max(0.6, textEm(text))));
}

/**
 * Estimated width of `text` in em. Deliberately generous (bold serif readouts
 * such as Lora run wider than a system sans), so layouts err on the side of space.
 */
export function textEm(text: string): number {
  let em = 0;
  for (const ch of Array.from(text)) {
    if (/\s/.test(ch)) em += 0.28;
    else if (/[.,:;'’|]/.test(ch)) em += 0.3;
    else if (/[°/()\-−+]/.test(ch)) em += 0.45;
    else if (/[0-9]/.test(ch)) em += 0.62;
    else if (/[%@&mwMW]/.test(ch)) em += 0.9;
    else if (/[A-Z$€£]/.test(ch)) em += 0.72;
    else em += 0.58;
  }
  return em * 1.08;
}

/** Estimated width of `text` at `fontSize`, in viewBox units. */
export function textWidth(text: string, fontSize: number): number {
  return textEm(text) * fontSize;
}

/** Build a FormatContext for a value. */
export function fmtCtx(value: number, min: number, max: number) {
  return { min, max, ratio: normalize(value, min, max) };
}
