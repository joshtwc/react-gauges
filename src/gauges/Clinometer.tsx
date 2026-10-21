import { ArcScale, cx, GaugeFrame } from '../core/frame';
import { createFormatter, formatNumber, type FormatInput } from '../core/format';
import { polar, sectorPath } from '../core/geometry';
import { useRanged } from '../core/ranged';
import { clamp, normalize } from '../core/scale';
import { V } from '../core/theme';
import type { CommonGaugeProps, RangedGaugeProps } from '../core/types';
import { clipZone, resolveColor } from '../core/zones';
import { Dial, type DialProps } from './Dial';

export type ClinometerSlot =
  | 'face'
  | 'zones'
  | 'ticks'
  | 'tickLabels'
  | 'beam'
  | 'pointer'
  | 'horizon'
  | 'value'
  | 'secondaryValue'
  | 'label'
  | 'markers';

/** Slope grade in percent for an angle in degrees (rise/run × 100). */
export function angleToGrade(deg: number): number {
  if (Math.abs(Math.abs(deg) - 90) < 1e-9) return deg > 0 ? Infinity : -Infinity;
  return Math.tan((deg * Math.PI) / 180) * 100;
}

/** Angle in degrees for a slope grade in percent. */
export function gradeToAngle(grade: number): number {
  return (Math.atan(grade / 100) * 180) / Math.PI;
}

export interface ClinometerProps extends CommonGaugeProps<ClinometerSlot>, RangedGaugeProps {
  /** Tilt angle in degrees. Positive = right side up / nose up. */
  value: number;
  /**
   * `'level'` (default): a beam tilts inside a round face with mirrored scales.
   * `'protractor'`: a half-circle protractor with a needle (built on <Dial>).
   */
  variant?: 'level' | 'protractor';
  /** Readout as degrees (default), slope grade %, or both. */
  display?: 'degrees' | 'percent' | 'both';
  /** Format for the grade % readout (default `'0.0 %'`). */
  gradeFormat?: FormatInput;
  /** Draw ticks on both sides of the face (level variant, default true). */
  mirror?: boolean;
  /** Extra props forwarded to the Dial (protractor variant). */
  dialProps?: Partial<DialProps>;
}

const C = 100;
const R = 92;

/** Clinometer / inclinometer showing tilt in degrees and/or grade. */
export function Clinometer(props: ClinometerProps) {
  const { variant = 'level', display = 'degrees', mirror = true, classNames = {}, showValue = true } = props;
  const s = useRanged(props, {
    min: -90,
    max: 90,
    format: { maxDecimals: 1, minDecimals: 1, unit: '°' },
    ticks: { step: 30, minor: 2 },
  });
  const { zones, markers } = s;
  const gradeFmt = createFormatter(props.gradeFormat, { decimals: 1, unit: '%', unitSpace: false });
  const grade = (v: number) => {
    const g = angleToGrade(v);
    return Number.isFinite(g) ? gradeFmt(g, { min: -Infinity, max: Infinity, ratio: 0 }) : `${g > 0 ? '' : '−'}∞`;
  };
  const primaryText = display === 'percent' ? grade(s.display) : s.text;
  const secondaryText = display === 'both' ? grade(s.display) : undefined;

  if (variant === 'protractor') {
    const start = clamp(s.min, -180, 180);
    const end = clamp(s.max, -180, 180);
    const { variant: _v, display: _d, gradeFormat: _g, mirror: _m, dialProps, classNames: _c, ...rest } = props;
    return (
      <Dial
        {...rest}
        {...dialProps}
        variant={dialProps?.variant ?? 'needle'}
        startAngle={start}
        endAngle={end}
        min={s.min}
        max={s.max}
        ticks={props.ticks ?? { step: 15, minor: 2 }}
        format={display === 'percent' ? (v) => grade(v) : props.format ?? { minDecimals: 1, maxDecimals: 1, unit: '°' }}
        label={secondaryText !== undefined ? [secondaryText, props.label].filter(Boolean).join(' · ') : props.label}
        classNames={{
          face: classNames.face,
          zones: classNames.zones,
          ticks: classNames.ticks,
          tickLabels: classNames.tickLabels,
          needle: classNames.pointer,
          value: classNames.value,
          label: classNames.label,
          markers: classNames.markers,
          svg: classNames.svg,
        }}
        className={cx(classNames.root, props.className)}
        needle={{ shape: 'line', tail: 0.2, ...dialProps?.needle }}
      />
    );
  }

  // Level variant geometry: right side reads 90 - v, left side mirrors at 270 - v.
  const rightStart = 90 - s.min;
  const rightEnd = 90 - s.max;
  const leftStart = 270 - s.min;
  const leftEnd = 270 - s.max;
  const tickStart = R - 9;
  const labelR = tickStart - 18;
  const beamR = labelR - 14;
  const tilt = s.pos;
  const readoutY = 2 * C + 20;
  const H = 2 * C + (showValue ? (secondaryText ? 48 : 32) : 0) + (props.label ? 16 : 0);
  const angleRight = (v: number) => rightStart + normalize(v, s.min, s.max) * (rightEnd - rightStart);
  const angleLeft = (v: number) => leftStart + normalize(v, s.min, s.max) * (leftEnd - leftStart);

  const connector = (a: number) => {
    const p0 = polar(C, C, beamR + 1, a);
    const p1 = polar(C, C, tickStart - 8, a);
    return `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`;
  };
  const arrow = (a: number) => {
    const tip = polar(C, C, tickStart + 1, a);
    const l = polar(C, C, tickStart - 9, a - 3.4);
    const r = polar(C, C, tickStart - 9, a + 3.4);
    return `M ${l.x} ${l.y} L ${tip.x} ${tip.y} L ${r.x} ${r.y} Z`;
  };

  return (
    <GaugeFrame
      width={200}
      height={H}
      defaultSize={220}
      size={props.size}
      className={cx(classNames.root, props.className)}
      svgClassName={classNames.svg}
      style={props.style}
      theme={props.theme}
      id={props.id}
      ariaLabel={props.ariaLabel ?? props.label ?? 'Inclination'}
      valueNow={props.value}
      valueMin={s.min}
      valueMax={s.max}
      valueText={s.ariaText}
      status={s.statusInfo}
      limits={s.limits}
    >
      <circle cx={C} cy={C} r={R + 4} fill={V.face} stroke={V.faceBorder} strokeWidth={2} className={classNames.face} />

      {/* Zones on both arcs */}
      <g className={cx('rg-zones', classNames.zones)}>
        {zones.map((z, i) => {
          const c = clipZone(z, s.min, s.max);
          if (!c) return null;
          const color = resolveColor(z.color);
          return (
            <g key={i} className={z.className}>
              <path d={sectorPath(C, C, R, R - 5, angleRight(c.from), angleRight(c.to))} fill={color} />
              {mirror && <path d={sectorPath(C, C, R, R - 5, angleLeft(c.from), angleLeft(c.to))} fill={color} />}
            </g>
          );
        })}
      </g>

      <ArcScale
        cx={C}
        cy={C}
        radius={tickStart}
        startAngle={rightStart}
        endAngle={rightEnd}
        min={s.min}
        max={s.max}
        ticks={s.ticks}
        majorLength={8}
        minorLength={4}
        labelRadius={labelR}
        labels={s.tickOptions.labels}
        labelEvery={s.tickOptions.labelEvery}
        formatTick={s.tickFmt}
        labelSize={9}
        tickClassName={classNames.ticks}
        labelClassName={classNames.tickLabels}
      />
      {mirror && (
        <ArcScale
          cx={C}
          cy={C}
          radius={tickStart}
          startAngle={leftStart}
          endAngle={leftEnd}
          min={s.min}
          max={s.max}
          ticks={s.ticks}
          majorLength={8}
          minorLength={4}
          labelRadius={tickStart - 16}
          labels={false}
          formatTick={s.tickFmt}
          tickClassName={classNames.ticks}
        />
      )}

      {/* Fixed horizon reference */}
      <path
        d={`M ${C - beamR - 4} ${C} L ${C + beamR + 4} ${C}`}
        stroke={V.tick}
        strokeWidth={1}
        strokeDasharray="3 3"
        className={classNames.horizon}
      />

      {/* Markers (e.g. max safe tilt) */}
      {markers.map((m, i) => {
        const color = resolveColor(m.color) ?? V.marker;
        const seg = (a: number) => {
          const p0 = polar(C, C, R + 2, a);
          const p1 = polar(C, C, tickStart - 10, a);
          return `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`;
        };
        return (
          <path
            key={i}
            d={seg(angleRight(m.value)) + (mirror ? ' ' + seg(angleLeft(m.value)) : '')}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            className={cx(classNames.markers, m.className)}
          />
        );
      })}

      {/* Beam and pointers */}
      <g className={cx('rg-pointer', classNames.pointer)} fill={s.color}>
        <path d={connector(90 - tilt) + (mirror ? ' ' + connector(270 - tilt) : '')} stroke={s.color} strokeWidth={1} strokeDasharray="2 2" />
        <path d={arrow(90 - tilt)} />
        {mirror && <path d={arrow(270 - tilt)} />}
      </g>
      <g transform={`rotate(${-tilt} ${C} ${C})`} className={cx('rg-beam', classNames.beam)}>
        <rect x={C - beamR} y={C - 4} width={beamR * 2} height={8} rx={4} fill={s.color} />
        <rect x={C - 12} y={C - 9} width={24} height={18} rx={4} fill={V.face} stroke={s.color} strokeWidth={2} />
        <circle cx={C} cy={C} r={3} fill={s.color} />
      </g>

      {showValue && (
        <text
          x={C}
          y={readoutY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={20}
          fontFamily={V.valueFont}
          fontWeight={V.valueWeight}
          fill={V.value}
          className={cx('rg-value', classNames.value)}
        >
          {primaryText}
        </text>
      )}
      {showValue && secondaryText && (
        <text
          x={C}
          y={readoutY + 18}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fill={V.muted}
          className={classNames.secondaryValue}
        >
          {secondaryText} grade
        </text>
      )}
      {props.label && (
        <text
          x={C}
          y={H - 8}
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

/** Format an angle and grade together, e.g. "12.5° (22.2%)". Handy for custom readouts. */
export function formatSlope(deg: number, decimals = 1): string {
  const g = angleToGrade(deg);
  const gs = Number.isFinite(g) ? formatNumber(g, { decimals, unit: '%', unitSpace: false }) : '∞';
  return `${formatNumber(deg, { decimals, unit: '°' })} (${gs})`;
}
