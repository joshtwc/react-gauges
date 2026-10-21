import { useAnimatedNumber } from '../core/animation';
import { cx, GaugeFrame, useSafeId } from '../core/frame';
import { createFormatter, type FormatInput } from '../core/format';
import { polar, sectorPath } from '../core/geometry';
import { clamp } from '../core/scale';
import { V } from '../core/theme';
import type { CommonGaugeProps } from '../core/types';
import { clipZone, resolveColor, type Zone } from '../core/zones';

export type AttitudeSlot = 'bezel' | 'sky' | 'ground' | 'horizon' | 'ladder' | 'rollScale' | 'rollPointer' | 'aircraft' | 'value' | 'label' | 'zones';

export interface AttitudeIndicatorProps extends CommonGaugeProps<AttitudeSlot> {
  /** Pitch in degrees, nose up positive. */
  pitch: number;
  /** Roll / bank in degrees, right wing down positive. */
  roll: number;
  /** Pitch visible from the centre to the edge of the window (default 30). */
  pitchRange?: number;
  /** Pitch ladder spacing in degrees (default 10, with half-steps). */
  pitchStep?: number;
  /** Maximum bank on the roll scale (default 60). */
  rollRange?: number;
  /** Coloured bank-angle bands on the roll scale (signed degrees, e.g. `{from: 30, to: 60}` and `{from: -60, to: -30}`). */
  rollZones?: Zone[];
  /** Readout format for pitch & roll (default `'+0.0°'`). */
  format?: FormatInput;
  /** Show the numeric pitch/roll readout (default true). */
  showValue?: boolean;
  skyColor?: string;
  groundColor?: string;
}

const C = 100;
const R = 78;

/** Artificial horizon (attitude indicator) – pitch & roll. */
export function AttitudeIndicator(props: AttitudeIndicatorProps) {
  const { pitchRange = 30, pitchStep = 10, rollRange = 60, rollZones = [], classNames = {}, showValue = true } = props;
  const clip = useSafeId('rg-ai');
  const pitch = useAnimatedNumber(props.pitch, props.animate);
  const roll = useAnimatedNumber(props.roll, props.animate);
  const fmt = createFormatter(props.format, { minDecimals: 1, maxDecimals: 1, unit: '°', signDisplay: 'exceptZero' });
  const ctx = { min: -90, max: 90, ratio: 0 };
  const pxPerDeg = R / pitchRange;
  const p = clamp(pitch, -90, 90);
  const sky = props.skyColor ?? 'var(--rg-sky, #5b8fd6)';
  const ground = props.groundColor ?? 'var(--rg-ground, #9a6b43)';
  const rollScaleR = R + 6;
  const H = 200 + (showValue ? 26 : 0) + (props.label ? 14 : 0);

  // Pitch ladder (in horizon coordinates, before roll rotation).
  const ladder: Array<{ deg: number; half: boolean }> = [];
  for (let d = -90; d <= 90; d += pitchStep / 2) {
    if (Math.abs(d) < 1e-9) continue;
    ladder.push({ deg: d, half: Math.abs(d % pitchStep) > 1e-9 });
  }

  const rollTicks = [10, 20, 30, 45, 60, 90].filter((t) => t <= rollRange);
  const rollTick = (a: number, len: number) => {
    const p0 = polar(C, C, rollScaleR, a);
    const p1 = polar(C, C, rollScaleR + len, a);
    return `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`;
  };

  const ariaText = `Pitch ${fmt(props.pitch, ctx)}, roll ${fmt(props.roll, ctx)}`;

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
      role="img"
      ariaLabel={props.ariaLabel ?? (props.label ? `${props.label}: ${ariaText}` : ariaText)}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx={C} cy={C} r={R} />
        </clipPath>
      </defs>
      <circle cx={C} cy={C} r={R + 18} fill={V.face} stroke={V.faceBorder} strokeWidth={2} className={classNames.bezel} />

      {/* Moving horizon */}
      <g clipPath={`url(#${clip})`}>
        <g transform={`rotate(${-roll} ${C} ${C}) translate(0 ${p * pxPerDeg})`}>
          <rect x={C - 3 * R} y={C - 3 * R - 90 * pxPerDeg} width={6 * R} height={3 * R + 90 * pxPerDeg} fill={sky} className={classNames.sky} />
          <rect x={C - 3 * R} y={C} width={6 * R} height={3 * R + 90 * pxPerDeg} fill={ground} className={classNames.ground} />
          <line x1={C - 3 * R} y1={C} x2={C + 3 * R} y2={C} stroke="#fff" strokeWidth={2} className={classNames.horizon} />
          <g stroke="#fff" fill="#fff" className={classNames.ladder}>
            {ladder.map(({ deg, half }) => {
              const y = C - deg * pxPerDeg;
              const w = half ? 12 : 26;
              return (
                <g key={deg}>
                  <line x1={C - w} y1={y} x2={C + w} y2={y} strokeWidth={half ? 1 : 1.5} />
                  {!half && (
                    <>
                      <text x={C - w - 4} y={y} fontSize={8} textAnchor="end" dominantBaseline="central" stroke="none">
                        {Math.abs(deg)}
                      </text>
                      <text x={C + w + 4} y={y} fontSize={8} textAnchor="start" dominantBaseline="central" stroke="none">
                        {Math.abs(deg)}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </g>
      <circle cx={C} cy={C} r={R} fill="none" stroke={V.faceBorder} strokeWidth={1.5} />

      {/* Roll zones & scale (fixed) */}
      <g className={cx('rg-zones', classNames.zones)}>
        {rollZones.map((z, i) => {
          const c = clipZone(z, -rollRange, rollRange);
          if (!c) return null;
          return <path key={i} d={sectorPath(C, C, rollScaleR + 4, rollScaleR, -c.from, -c.to)} fill={resolveColor(z.color)} className={z.className} />;
        })}
      </g>
      <g stroke={V.tick} strokeLinecap="round" className={classNames.rollScale}>
        <path d={rollTick(0, 0)} />
        {rollTicks.flatMap((t) => [t, -t]).map((t) => (
          <path key={t} d={rollTick(t, t % 30 === 0 ? 10 : 6)} strokeWidth={t % 30 === 0 ? 2 : 1.5} />
        ))}
      </g>
      <path d={`M ${C} ${C - rollScaleR} l -6 -10 l 12 0 Z`} fill={V.text} className={classNames.rollScale} />
      {/* Roll pointer rotates with the horizon */}
      <path
        d={`M ${C} ${C - R + 1} l -6 10 l 12 0 Z`}
        transform={`rotate(${-roll} ${C} ${C})`}
        fill={V.needle}
        className={cx('rg-roll-pointer', classNames.rollPointer)}
      />

      {/* Fixed aircraft symbol */}
      <g fill="none" stroke={V.needle} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" className={cx('rg-aircraft', classNames.aircraft)}>
        <path d={`M ${C - 46} ${C} L ${C - 18} ${C} L ${C - 10} ${C + 8}`} />
        <path d={`M ${C + 46} ${C} L ${C + 18} ${C} L ${C + 10} ${C + 8}`} />
        <circle cx={C} cy={C} r={2.5} fill={V.needle} stroke="none" />
      </g>

      {showValue && (
        <text
          x={C}
          y={212}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          fontFamily={V.valueFont}
          fontWeight={V.valueWeight}
          fill={V.text}
          className={cx('rg-value', classNames.value)}
        >
          {`Pitch ${fmt(pitch, ctx)}   Roll ${fmt(roll, ctx)}`}
        </text>
      )}
      {props.label && (
        <text x={C} y={H - 7} textAnchor="middle" dominantBaseline="central" fontSize={9} fill={V.muted} className={cx('rg-label', classNames.label)}>
          {props.label}
        </text>
      )}
    </GaugeFrame>
  );
}
