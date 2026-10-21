import type { ReactElement } from 'react';
import { cx, fmtCtx, GaugeFrame, useSafeId } from '../core/frame';
import { createFormatter, type FormatInput } from '../core/format';
import { useRanged } from '../core/ranged';
import { generateTicks, normalize, type TickOptions } from '../core/scale';
import { V } from '../core/theme';
import type { CommonGaugeProps, RangedGaugeProps } from '../core/types';
import { clipZone, resolveColor } from '../core/zones';

export type ThermometerSlot =
  | 'tube'
  | 'liquid'
  | 'zones'
  | 'ticks'
  | 'tickLabels'
  | 'secondaryTicks'
  | 'secondaryLabels'
  | 'value'
  | 'label'
  | 'markers';

export type TemperatureUnit = 'C' | 'F' | 'K';

const toC: Record<TemperatureUnit, (v: number) => number> = {
  C: (v) => v,
  F: (v) => ((v - 32) * 5) / 9,
  K: (v) => v - 273.15,
};
const fromC: Record<TemperatureUnit, (v: number) => number> = {
  C: (v) => v,
  F: (v) => (v * 9) / 5 + 32,
  K: (v) => v + 273.15,
};

/** Convert between temperature units. */
export function convertTemperature(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  return fromC[to](toC[from](value));
}

const unitSymbol = (u: TemperatureUnit) => (u === 'K' ? 'K' : `°${u}`);

export interface SecondaryScale {
  /** Primary → secondary units. */
  toSecondary: (v: number) => number;
  /** Secondary → primary units. */
  toPrimary: (v: number) => number;
  format?: FormatInput;
  ticks?: TickOptions;
}

export interface ThermometerProps extends CommonGaugeProps<ThermometerSlot>, RangedGaugeProps {
  /** Unit of `value`, `min` and `max` (default `'C'`). Sets the readout suffix. */
  unit?: TemperatureUnit;
  /** Show a second scale in another unit on the opposite side, e.g. `'F'`. */
  secondaryUnit?: TemperatureUnit;
  /** Fully custom secondary scale (overrides `secondaryUnit`). */
  secondaryScale?: SecondaryScale;
  /** Default `'vertical'`. */
  orientation?: 'vertical' | 'horizontal';
  /** Which side the primary scale sits on (default `'left'`; top in horizontal). */
  scaleSide?: 'left' | 'right';
  /** Tube width in viewBox units (default 14). */
  tubeWidth?: number;
  /** Bulb radius (default 19). */
  bulbRadius?: number;
}

const TOP = 14;
const SCALE_TOP = 26;
const SCALE_BOTTOM = 214;

/** Liquid-in-glass thermometer with optional dual scale. */
export function Thermometer(props: ThermometerProps) {
  const {
    unit = 'C',
    orientation = 'vertical',
    scaleSide = 'left',
    tubeWidth = 14,
    bulbRadius = 19,
    classNames = {},
    showValue = true,
  } = props;
  const clip = useSafeId('rg-thermo');
  const s = useRanged(props, {
    min: unit === 'F' ? -20 : unit === 'K' ? 250 : -30,
    max: unit === 'F' ? 120 : unit === 'K' ? 330 : 50,
    format: { maxDecimals: 1, unit: unitSymbol(unit) },
    ticks: { count: 8, minor: 1 },
  });
  const { zones, markers } = s;

  const secondary: SecondaryScale | undefined =
    props.secondaryScale ??
    (props.secondaryUnit
      ? {
          toSecondary: (v) => convertTemperature(v, unit, props.secondaryUnit!),
          toPrimary: (v) => convertTemperature(v, props.secondaryUnit!, unit),
          format: { maxDecimals: 0 },
        }
      : undefined);

  const hasLeft = scaleSide === 'left' || !!secondary;
  const hasRight = scaleSide === 'right' || !!secondary;
  const leftSpace = hasLeft ? 46 : 22;
  const rightSpace = hasRight ? 46 : 22;
  const tubeL = leftSpace;
  const tubeR = leftSpace + tubeWidth;
  const tcx = leftSpace + tubeWidth / 2;
  const W = leftSpace + tubeWidth + rightSpace;
  const bulbCy = SCALE_BOTTOM + bulbRadius + 10;
  const H0 = bulbCy + bulbRadius + 4;
  const valueBlock = (showValue ? 24 : 0) + (props.label ? 14 : 0);
  const horizontal = orientation === 'horizontal';

  // Along-axis position (y in the vertical drawing).
  const y = (v: number) => SCALE_BOTTOM - normalize(v, s.min, s.max) * (SCALE_BOTTOM - SCALE_TOP);
  // Vertical drawing → final coordinates (rotated 90° clockwise for horizontal).
  const map = (x: number, yy: number) => (horizontal ? { x: H0 - yy, y: x } : { x, y: yy });
  const groupTransform = horizontal ? `translate(${H0} 0) rotate(90)` : undefined;

  const halfW = tubeWidth / 2;
  const joinDy = Math.sqrt(Math.max(0, bulbRadius ** 2 - halfW ** 2));
  const glass = [
    `M ${tubeL} ${bulbCy - joinDy}`,
    `L ${tubeL} ${TOP + halfW}`,
    `A ${halfW} ${halfW} 0 0 1 ${tubeR} ${TOP + halfW}`,
    `L ${tubeR} ${bulbCy - joinDy}`,
    `A ${bulbRadius} ${bulbRadius} 0 1 1 ${tubeL} ${bulbCy - joinDy}`,
    'Z',
  ].join(' ');
  const inset = 3.5;
  const liquidTop = y(s.pos);

  // Primary ticks (drawn on the scale side).
  const primarySide: -1 | 1 = scaleSide === 'left' ? -1 : 1;
  const edge = (side: -1 | 1) => (side < 0 ? tubeL - 7 : tubeR + 7);
  const tickLines = (vals: number[], side: -1 | 1, len: number, pos: (v: number) => number) =>
    vals
      .map((v) => {
        const x0 = edge(side);
        return `M ${x0} ${pos(v)} L ${x0 + side * len} ${pos(v)}`;
      })
      .join(' ');

  const labelAt = (x: number, yy: number, side: -1 | 1) => {
    const p = map(x, yy);
    if (horizontal) return { ...p, anchor: 'middle' as const, baseline: side < 0 ? ('auto' as const) : ('hanging' as const) };
    return { ...p, anchor: side < 0 ? ('end' as const) : ('start' as const), baseline: 'central' as const };
  };

  // Secondary scale.
  let secondaryEls: ReactElement | null = null;
  if (secondary) {
    const sMin = secondary.toSecondary(s.min);
    const sMax = secondary.toSecondary(s.max);
    const st = generateTicks(sMin, sMax, { count: 8, minor: 1, ...secondary.ticks });
    const sFmt = createFormatter(secondary.format, { maxDecimals: 0 });
    const side = (-primarySide) as -1 | 1;
    const posS = (v: number) => y(secondary.toPrimary(v));
    secondaryEls = (
      <>
        <g transform={groupTransform}>
          <path d={tickLines(st.major, side, 7, posS)} stroke={V.tick} strokeWidth={1.5} className={classNames.secondaryTicks} />
          <path d={tickLines(st.minor, side, 4, posS)} stroke={V.tick} strokeWidth={1} opacity={0.7} className={classNames.secondaryTicks} />
        </g>
        {st.major.map((v) => {
          const l = labelAt(edge(side) + side * 10, posS(v), side);
          return (
            <text
              key={v}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
              dominantBaseline={l.baseline}
              fontSize={9}
              fill={V.muted}
              className={classNames.secondaryLabels}
            >
              {sFmt(v, fmtCtx(v, sMin, sMax))}
            </text>
          );
        })}
      </>
    );
  }

  const size = horizontal ? { w: H0 + 4, h: W + valueBlock } : { w: W, h: H0 + valueBlock };
  const readout = horizontal
    ? { x: (H0 - SCALE_BOTTOM + H0 - SCALE_TOP) / 2, y: W + 14 }
    : { x: tcx, y: H0 + 14 };

  return (
    <GaugeFrame
      width={size.w}
      height={size.h}
      defaultSize={horizontal ? 300 : 110}
      size={props.size}
      className={cx(classNames.root, props.className)}
      svgClassName={classNames.svg}
      style={props.style}
      theme={props.theme}
      id={props.id}
      ariaLabel={props.ariaLabel ?? props.label ?? 'Temperature'}
      valueNow={props.value}
      valueMin={s.min}
      valueMax={s.max}
      valueText={s.ariaText}
      status={s.statusInfo}
      limits={s.limits}
    >
      <defs>
        <clipPath id={clip}>
          <path d={glass} />
        </clipPath>
      </defs>
      <g transform={groupTransform}>
        {/* Zones band beside the tube */}
        <g className={cx('rg-zones', classNames.zones)}>
          {zones.map((z, i) => {
            const c = clipZone(z, s.min, s.max);
            if (!c) return null;
            const x = primarySide < 0 ? tubeL - 5.5 : tubeR + 2;
            return (
              <rect
                key={i}
                x={x}
                y={y(c.to)}
                width={3.5}
                height={Math.max(0, y(c.from) - y(c.to))}
                fill={resolveColor(z.color)}
                className={z.className}
              />
            );
          })}
        </g>
        {/* Glass */}
        <path d={glass} fill={V.track} stroke={V.faceBorder} strokeWidth={1.5} className={classNames.tube} />
        {/* Liquid */}
        <g clipPath={`url(#${clip})`} className={cx('rg-liquid', classNames.liquid)} fill={s.color}>
          <rect x={tcx - halfW + inset} y={liquidTop} width={tubeWidth - inset * 2} height={bulbCy - liquidTop} rx={1} />
          <circle cx={tcx} cy={bulbCy} r={bulbRadius - inset} />
        </g>
        {/* Glass highlight */}
        <path
          d={`M ${tubeL + 3} ${TOP + halfW + 2} L ${tubeL + 3} ${SCALE_BOTTOM}`}
          stroke="#fff"
          strokeOpacity={0.35}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* Primary ticks */}
        <path d={tickLines(s.ticks.major, primarySide, 8, y)} stroke={V.tick} strokeWidth={1.5} className={classNames.ticks} />
        <path d={tickLines(s.ticks.minor, primarySide, 4, y)} stroke={V.tick} strokeWidth={1} opacity={0.7} className={classNames.ticks} />
        {/* Markers */}
        {markers.map((m, i) => {
          const my = y(m.value);
          return (
            <path
              key={i}
              d={`M ${tubeL - 3} ${my} L ${tubeR + 3} ${my}`}
              stroke={resolveColor(m.color) ?? V.marker}
              strokeWidth={2}
              strokeDasharray="2 2"
              className={cx(classNames.markers, m.className)}
            >
              {m.label && <title>{m.label}</title>}
            </path>
          );
        })}
      </g>

      {/* Primary labels */}
      {s.tickOptions.labels !== false &&
        s.ticks.major.map((v, i) => {
          if (i % Math.max(1, s.tickOptions.labelEvery ?? 1) !== 0) return null;
          const l = labelAt(edge(primarySide) + primarySide * 11, y(v), primarySide);
          return (
            <text
              key={v}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
              dominantBaseline={l.baseline}
              fontSize={10}
              fill={V.muted}
              className={classNames.tickLabels}
            >
              {s.tickFmt(v, fmtCtx(v, s.min, s.max))}
            </text>
          );
        })}
      {secondaryEls}

      {/* Marker labels */}
      {markers.map((m, i) => {
        // With a secondary scale the opposite side is taken – the label moves into a tooltip.
        if (!m.label || secondary) return null;
        const side = (-primarySide) as -1 | 1;
        const l = labelAt((side < 0 ? tubeL : tubeR) + side * 6, y(m.value), side);
        return (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor={l.anchor}
            dominantBaseline={l.baseline}
            fontSize={8}
            fill={resolveColor(m.color) ?? V.marker}
            className={classNames.markers}
          >
            {m.label}
          </text>
        );
      })}

      {showValue && (
        <text
          x={readout.x}
          y={readout.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={16}
          fontFamily={V.valueFont}
          fontWeight={V.valueWeight}
          fill={V.value}
          className={cx('rg-value', classNames.value)}
        >
          {s.text}
        </text>
      )}
      {props.label && (
        <text
          x={readout.x}
          y={readout.y + (showValue ? 17 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fill={V.muted}
          className={cx('rg-label', classNames.label)}
        >
          {props.label}
        </text>
      )}
    </GaugeFrame>
  );
}
