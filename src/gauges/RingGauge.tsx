import { useAnimatedNumber, type AnimateInput } from '../core/animation';
import { cx, fitFontSize, GaugeFrame } from '../core/frame';
import { createFormatter, type FormatInput } from '../core/format';
import { arcPath, polar } from '../core/geometry';
import { useRanged } from '../core/ranged';
import { clamp, normalize } from '../core/scale';
import { V } from '../core/theme';
import type { CommonGaugeProps, RangedGaugeProps } from '../core/types';
import { clipZone, resolveColor, valueColor, type Zone } from '../core/zones';

export type RingSlot = 'track' | 'fill' | 'zones' | 'value' | 'label' | 'legend' | 'markers';

export interface RingSpec {
  value: number;
  min?: number;
  max?: number;
  color?: string;
  zones?: Zone[];
  label?: string;
  format?: FormatInput;
}

export interface RingGaugeProps extends CommonGaugeProps<RingSlot>, Omit<RangedGaugeProps, 'ticks' | 'tickFormat'> {
  /** Additional concentric rings drawn inside the main one (activity-ring style). */
  rings?: RingSpec[];
  /** Ring thickness (default 14). */
  thickness?: number;
  /** Space between rings (default 4). */
  gap?: number;
  /** Angle of the ring start (default 0 = top). */
  startAngle?: number;
  /** Degrees of sweep (default 360; 270 gives a horseshoe). */
  sweep?: number;
  /** Rounded ends (default true). */
  rounded?: boolean;
  /** Draw zone colours faintly on the track (default true when zones are set). */
  showZones?: boolean;
  /** Secondary line under the value (e.g. "of 2,000 stems"). */
  sublabel?: string;
  /** Show a legend with each ring's label & value (default true when `rings` is set). */
  legend?: boolean;
}

function Ring(p: {
  spec: RingSpec;
  radius: number;
  thickness: number;
  start: number;
  sweep: number;
  rounded: boolean;
  animate: AnimateInput | undefined;
  showZones: boolean;
  classNames: Partial<Record<RingSlot, string>>;
  fallbackColor: string;
}) {
  const min = p.spec.min ?? 0;
  const max = p.spec.max ?? 100;
  const v = useAnimatedNumber(p.spec.value, p.animate, { initial: min });
  const t = normalize(clamp(v, min, max), min, max);
  const color = valueColor(v, p.spec.zones, p.spec.color, true, p.fallbackColor);
  const end = p.start + p.sweep * t;
  return (
    <g>
      <path
        d={arcPath(100, 100, p.radius, p.start, p.start + p.sweep)}
        stroke={V.track}
        strokeWidth={p.thickness}
        fill="none"
        strokeLinecap={p.rounded && p.sweep < 360 ? 'round' : 'butt'}
        className={p.classNames.track}
      />
      {p.showZones &&
        (p.spec.zones ?? []).map((z, i) => {
          const c = clipZone(z, min, max);
          if (!c) return null;
          return (
            <path
              key={i}
              d={arcPath(100, 100, p.radius, p.start + p.sweep * normalize(c.from, min, max), p.start + p.sweep * normalize(c.to, min, max))}
              stroke={resolveColor(z.color)}
              strokeOpacity={0.22}
              strokeWidth={p.thickness}
              fill="none"
              className={cx(p.classNames.zones, z.className)}
            />
          );
        })}
      {t > 0.0005 && (
        <path
          d={arcPath(100, 100, p.radius, p.start, end)}
          stroke={color}
          strokeWidth={p.thickness}
          fill="none"
          strokeLinecap={p.rounded ? 'round' : 'butt'}
          className={cx('rg-fill', p.classNames.fill)}
        />
      )}
    </g>
  );
}

/** Progress ring / donut gauge, optionally with concentric rings. */
export function RingGauge(props: RingGaugeProps) {
  const { thickness = 14, gap = 4, startAngle = 0, sweep = 360, rounded = true, classNames = {}, showValue = true } = props;
  const s = useRanged({ ...props, ticks: false }, { min: 0, max: 100, format: { maxDecimals: 0 } });
  const { markers } = s;
  // While a limit is crossed the main ring takes the status colour (s.color already resolved it).
  const primary: RingSpec = { value: props.value, min: s.min, max: s.max, zones: s.zones, color: s.status !== 'ok' ? s.color : props.color, label: props.label, format: props.format };
  const all = [primary, ...(props.rings ?? [])];
  const outer = 92;
  const showZones = props.showZones ?? true;
  const legend = props.legend ?? !!props.rings?.length;
  const ringColors = [V.accent, 'var(--rg-ring-2, var(--rg-good, #3f8f5a))', 'var(--rg-ring-3, var(--rg-warn, #d49a2a))', 'var(--rg-ring-4, var(--rg-info, #3b76c4))'];

  const legendRows = legend ? all.length : 0;
  const H = (Math.abs(sweep) < 300 ? 176 : 200) + legendRows * 16 + (legendRows ? 6 : 0);
  const legendTop = H - legendRows * 16 - 2;

  return (
    <GaugeFrame
      width={200}
      height={H}
      defaultSize={200}
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
      {all.map((spec, i) => (
        <Ring
          key={i}
          spec={spec}
          radius={outer - thickness / 2 - i * (thickness + gap)}
          thickness={thickness}
          start={startAngle}
          sweep={sweep}
          rounded={rounded}
          animate={props.animate}
          showZones={showZones}
          classNames={classNames}
          fallbackColor={i === 0 ? s.color : resolveColor(spec.color) ?? ringColors[i % ringColors.length]}
        />
      ))}
      {markers.map((m, i) => {
        const a = startAngle + sweep * normalize(m.value, s.min, s.max);
        const p0 = polar(100, 100, outer + 2, a);
        const p1 = polar(100, 100, outer - thickness - 2, a);
        return (
          <path
            key={i}
            d={`M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`}
            stroke={resolveColor(m.color) ?? V.marker}
            strokeWidth={2.5}
            strokeLinecap="round"
            className={cx(classNames.markers, m.className)}
          />
        );
      })}
      {showValue && (
        <text
          x={100}
          y={100 - (props.sublabel || (props.label && !legend) ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fitFontSize(s.text, Math.max(30, (outer - all.length * (thickness + gap)) * 1.7), all.length > 2 ? 24 : 30)}
          fontFamily={V.valueFont}
          fontWeight={V.valueWeight}
          fill={V.value}
          className={cx('rg-value', classNames.value)}
        >
          {s.text}
        </text>
      )}
      {(props.sublabel || (props.label && !legend)) && (
        <text
          x={100}
          y={100 + (showValue ? 16 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fill={V.muted}
          className={cx('rg-label', classNames.label)}
        >
          {props.sublabel ?? props.label}
        </text>
      )}
      {legend && (
        <g className={cx('rg-legend', classNames.legend)} fontSize={10}>
          {all.map((spec, i) => {
            const min = spec.min ?? 0;
            const max = spec.max ?? 100;
            const f = createFormatter(spec.format, { maxDecimals: 0 });
            const color = valueColor(spec.value, spec.zones, spec.color, true, i === 0 ? s.color : ringColors[i % ringColors.length]);
            const y = legendTop + i * 16 + 8;
            return (
              <g key={i}>
                <circle cx={40} cy={y} r={4} fill={color} />
                <text x={50} y={y} dominantBaseline="central" fill={V.muted}>
                  {spec.label ?? `Ring ${i + 1}`}
                </text>
                <text x={160} y={y} dominantBaseline="central" textAnchor="end" fill={V.text} fontWeight={600}>
                  {f(spec.value, { min, max, ratio: normalize(spec.value, min, max) })}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </GaugeFrame>
  );
}
