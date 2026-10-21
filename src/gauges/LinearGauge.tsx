import { cx, GaugeFrame, LinearScale, orientPoint, type Orientation } from '../core/frame';
import { useRanged } from '../core/ranged';
import { normalize } from '../core/scale';
import { V } from '../core/theme';
import type { CommonGaugeProps, RangedGaugeProps } from '../core/types';
import { clipZone, resolveColor } from '../core/zones';

export type LinearGaugeSlot = 'track' | 'fill' | 'zones' | 'pointer' | 'target' | 'ticks' | 'tickLabels' | 'value' | 'label' | 'markers';

export interface LinearGaugeProps extends CommonGaugeProps<LinearGaugeSlot>, RangedGaugeProps {
  orientation?: Orientation;
  /**
   * `'bar'` (default) – filled bar with a thin zone strip.
   * `'pointer'` – zones colour the track, a pointer marks the value.
   * `'bullet'` – bullet chart: zone bands, slim value bar and a target line.
   */
  variant?: 'bar' | 'pointer' | 'bullet';
  /** Track thickness (default 12). */
  thickness?: number;
  /** Rounded track & bar (default true for bar). */
  rounded?: boolean;
  /** Fill starts here instead of `min` (bipolar bars). */
  origin?: number;
  /** Target value (drawn as a bold line – ideal for bullet charts). */
  target?: number;
  /** `'top'` (default: header row with the label), `'end'`, `'inside'` or `'none'`. */
  valuePosition?: 'top' | 'end' | 'inside' | 'none';
  /** Length of the track in viewBox units (default 300 horizontal / 220 vertical). */
  length?: number;
}

/** Horizontal or vertical bar / pointer / bullet gauge. */
export function LinearGauge(props: LinearGaugeProps) {
  const {
    orientation = 'horizontal',
    variant = 'bar',
    thickness = 12,
    valuePosition = 'top',
    classNames = {},
    showValue = true,
  } = props;
  const rounded = props.rounded ?? variant !== 'bullet';
  const s = useRanged(props, { min: 0, max: 100, ticks: { count: 5, minor: 1 }, format: { maxDecimals: 1 } });
  const { zones, markers } = s;
  const vertical = orientation === 'vertical';
  const valuePos = showValue ? valuePosition : 'none';
  const bandH = variant === 'bullet' ? thickness * 1.8 : thickness;
  const barH = variant === 'bullet' ? thickness * 0.6 : thickness;
  const pointerSpace = variant === 'pointer' ? 12 : 0;
  const hasTicks = s.ticks.major.length > 0;
  const hasLabels = hasTicks && s.tickOptions.labels !== false;

  let W: number;
  let H: number;
  let start: number;
  let end: number;
  let c0: number;
  if (!vertical) {
    const len = props.length ?? 300;
    const headerH = props.label || valuePos === 'top' ? 24 : 0;
    const markerSpace = markers.some((m) => m.label) ? 10 : 0;
    c0 = headerH + pointerSpace + markerSpace + 4;
    start = 12;
    end = len - 12 - (valuePos === 'end' ? 64 : 0);
    W = len;
    H = c0 + bandH + (variant === 'bar' && zones.length ? 6 : 0) + (hasTicks ? (hasLabels ? 28 : 14) : 6);
  } else {
    const len = props.length ?? 220;
    const topPad = valuePos !== 'none' && valuePos !== 'inside' ? 34 : 12;
    const bottomPad = props.label ? 28 : 12;
    c0 = 26 + pointerSpace;
    start = topPad + len;
    end = topPad;
    W = c0 + bandH + (variant === 'bar' && zones.length ? 6 : 0) + (hasTicks ? (hasLabels ? 48 : 16) : 12);
    H = topPad + len + bottomPad;
  }

  const at = (v: number) => start + normalize(v, s.min, s.max) * (end - start);
  const rect = (a0: number, a1: number, cStart: number, cSize: number) => {
    const lo = Math.min(a0, a1);
    const size = Math.abs(a1 - a0);
    return vertical ? { x: cStart, y: lo, width: cSize, height: size } : { x: lo, y: cStart, width: size, height: cSize };
  };
  const trackRect = rect(start, end, c0, bandH);
  const barOffset = (bandH - barH) / 2;
  const fillFrom = at(props.origin ?? s.min);
  const fillTo = at(s.pos);
  const fillRect = rect(fillFrom, fillTo, c0 + barOffset, barH);
  const radius = rounded ? Math.min(barH, bandH) / 2 : variant === 'bullet' ? 0 : 2;

  const zoneStripAt = c0 + bandH + 2;
  const scaleAt = c0 + bandH + (variant === 'bar' && zones.length ? 6 : 3);

  const pointerPath = (() => {
    const a = at(s.pos);
    const tip = orientPoint(orientation, a, c0 - 1);
    const b1 = orientPoint(orientation, a - 7, c0 - 12);
    const b2 = orientPoint(orientation, a + 7, c0 - 12);
    return `M ${tip.x} ${tip.y} L ${b1.x} ${b1.y} L ${b2.x} ${b2.y} Z`;
  })();

  const crossLine = (v: number, overshoot: number) => {
    const a = at(v);
    const p0 = orientPoint(orientation, a, c0 - overshoot);
    const p1 = orientPoint(orientation, a, c0 + bandH + overshoot);
    return `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`;
  };

  // Readout positions.
  let valueEl: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; fill: string; size: number } | null = null;
  if (valuePos !== 'none') {
    if (vertical) {
      if (valuePos === 'inside') {
        const p = orientPoint(orientation, fillTo + 10, c0 + bandH / 2);
        valueEl = { ...p, anchor: 'middle', fill: 'var(--rg-on-accent, #fff)', size: Math.min(10, barH * 0.7) };
      } else valueEl = { x: c0 + bandH / 2, y: 16, anchor: 'middle', fill: V.value, size: 16 };
    } else if (valuePos === 'top') valueEl = { x: end, y: 11, anchor: 'end', fill: V.value, size: 15 };
    else if (valuePos === 'end') valueEl = { x: end + 12, y: c0 + bandH / 2, anchor: 'start', fill: V.value, size: 15 };
    else valueEl = { x: Math.max(fillTo - 6, start + 26), y: c0 + bandH / 2, anchor: 'end', fill: 'var(--rg-on-accent, #fff)', size: Math.min(11, barH * 0.8) };
  }
  const labelEl = props.label
    ? vertical
      ? { x: c0 + bandH / 2, y: H - 12, anchor: 'middle' as const }
      : { x: start, y: 11, anchor: 'start' as const }
    : null;

  return (
    <GaugeFrame
      width={W}
      height={H}
      defaultSize={vertical ? 110 : 320}
      size={props.size}
      className={cx(classNames.root, props.className)}
      svgClassName={classNames.svg}
      style={props.style}
      theme={props.theme}
      id={props.id}
      ariaLabel={props.ariaLabel ?? props.label}
      valueNow={props.value}
      valueMin={s.min}
      valueMax={s.max}
      valueText={s.ariaText}
      status={s.statusInfo}
      limits={s.limits}
    >
      {/* Track */}
      <rect {...trackRect} rx={variant === 'bullet' ? 0 : radius} fill={V.track} className={classNames.track} />

      {/* Zones */}
      <g className={cx('rg-zones', classNames.zones)}>
        {zones.map((z, i) => {
          const c = clipZone(z, s.min, s.max);
          if (!c) return null;
          const color = resolveColor(z.color);
          if (variant === 'bar') {
            return <rect key={i} {...rect(at(c.from), at(c.to), zoneStripAt, 3)} fill={color} className={z.className} />;
          }
          return (
            <rect
              key={i}
              {...rect(at(c.from), at(c.to), c0, bandH)}
              fill={color}
              opacity={variant === 'bullet' ? 0.3 : 1}
              className={z.className}
            />
          );
        })}
      </g>

      {/* Value */}
      {variant !== 'pointer' && Math.abs(fillTo - fillFrom) > 0.1 && (
        <rect {...fillRect} rx={radius} fill={variant === 'bullet' ? (props.color ? s.color : V.accent) : s.color} className={cx('rg-fill', classNames.fill)} />
      )}
      {variant === 'pointer' && <path d={pointerPath} fill={props.color ? s.color : V.needle} className={cx('rg-pointer', classNames.pointer)} />}
      {variant === 'pointer' && (
        <path d={crossLine(s.pos, 0)} stroke={props.color ? s.color : V.needle} strokeWidth={2} className={classNames.pointer} />
      )}

      {/* Origin line for bipolar bars */}
      {props.origin !== undefined && <path d={crossLine(props.origin, 3)} stroke={V.text} strokeWidth={1} opacity={0.6} />}

      {/* Target */}
      {props.target !== undefined && (
        <path
          d={crossLine(props.target, variant === 'bullet' ? -bandH * 0.15 : 3)}
          stroke={V.marker}
          strokeWidth={3}
          className={cx('rg-target', classNames.target)}
        />
      )}

      {/* Markers */}
      {markers.map((m, i) => {
        const color = resolveColor(m.color) ?? V.marker;
        const lp = orientPoint(orientation, at(m.value), c0 - 5);
        return (
          <g key={i} className={cx(classNames.markers, m.className)}>
            <path d={crossLine(m.value, 3)} stroke={color} strokeWidth={1.5} strokeDasharray="2 2" />
            {m.label && (
              <text
                x={vertical ? lp.x - 2 : lp.x}
                y={lp.y}
                fontSize={8}
                fill={color}
                textAnchor={vertical ? 'end' : 'middle'}
                dominantBaseline={vertical ? 'central' : 'auto'}
              >
                {m.label}
              </text>
            )}
          </g>
        );
      })}

      <LinearScale
        orientation={orientation}
        start={start}
        end={end}
        at={scaleAt}
        side={1}
        min={s.min}
        max={s.max}
        ticks={s.ticks}
        majorLength={6}
        minorLength={3}
        labels={s.tickOptions.labels}
        labelEvery={s.tickOptions.labelEvery}
        formatTick={s.tickFmt}
        tickClassName={classNames.ticks}
        labelClassName={classNames.tickLabels}
      />

      {valueEl && (
        <text
          x={valueEl.x}
          y={valueEl.y}
          textAnchor={valueEl.anchor}
          dominantBaseline="central"
          fontSize={valueEl.size}
          fontFamily={V.valueFont}
          fontWeight={V.valueWeight}
          fill={valueEl.fill}
          className={cx('rg-value', classNames.value)}
        >
          {s.text}
        </text>
      )}
      {labelEl && (
        <text
          x={labelEl.x}
          y={labelEl.y}
          textAnchor={labelEl.anchor}
          dominantBaseline="central"
          fontSize={11}
          fill={V.muted}
          className={cx('rg-label', classNames.label)}
        >
          {props.label}
        </text>
      )}
    </GaugeFrame>
  );
}
