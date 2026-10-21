import { useAnimatedNumber } from '../core/animation';
import { cx, GaugeFrame, LinearScale, useSafeId } from '../core/frame';
import { useRanged } from '../core/ranged';
import { lerp, normalize } from '../core/scale';
import { V } from '../core/theme';
import type { CommonGaugeProps, RangedGaugeProps } from '../core/types';
import { resolveColor, zoneAt, ZONE_COLORS } from '../core/zones';

export type BubbleLevelSlot = 'vial' | 'liquid' | 'bubble' | 'lines' | 'ticks' | 'tickLabels' | 'value' | 'label';

export interface BubbleLevelProps extends CommonGaugeProps<BubbleLevelSlot>, RangedGaugeProps {
  /** Tilt along X in degrees (vial) – right side up is positive. */
  value: number;
  /** Tilt along Y in degrees. Supplying it (or `variant="bullseye"`) draws a two-axis bullseye level. */
  valueY?: number;
  variant?: 'vial' | 'bullseye';
  /** Tilt considered "level" (default 0.5°). Drawn as the reference lines/ring and coloured `good`. */
  tolerance?: number;
}

/**
 * Spirit level. In a vial the bubble drifts toward the raised end.
 * Zones are matched against |tilt| (the magnitude for a bullseye).
 */
export function BubbleLevel(props: BubbleLevelProps) {
  const variant = props.variant ?? (props.valueY !== undefined ? 'bullseye' : 'vial');
  const { tolerance = 0.5, classNames = {}, showValue = true } = props;
  const clip = useSafeId('rg-vial');
  const s = useRanged(props, {
    min: -10,
    max: 10,
    format: { minDecimals: 1, maxDecimals: 1, unit: '°' },
    ticks: { count: 4, minor: 4 },
    // Limits apply to how far off level it is: |tilt|, or the combined tilt for a bullseye.
    statusValue: props.valueY !== undefined || props.variant === 'bullseye' ? Math.hypot(props.value, props.valueY ?? 0) : Math.abs(props.value),
  });
  const dy = useAnimatedNumber(props.valueY ?? 0, props.animate);
  const extent = Math.max(Math.abs(s.min), Math.abs(s.max)) || 1;

  const magnitude = variant === 'bullseye' ? Math.hypot(s.display, dy) : Math.abs(s.display);
  const colorFor = (m: number) => {
    if (props.color) return resolveColor(props.color)!;
    if (props.zoneColor !== false && s.status !== 'ok') return s.color;
    if (props.zoneColor !== false && props.zones?.length) {
      const z = zoneAt(m, props.zones);
      if (z) return resolveColor(z.color)!;
    }
    return m <= tolerance ? ZONE_COLORS.good : m <= tolerance * 4 ? ZONE_COLORS.warn : ZONE_COLORS.bad;
  };
  const bubbleColor = colorFor(magnitude);
  const liquid = 'var(--rg-liquid, color-mix(in srgb, var(--rg-good, #3f8f5a) 16%, transparent))';
  const bubbleFill = 'var(--rg-bubble, color-mix(in srgb, #fff 80%, transparent))';

  if (variant === 'bullseye') {
    const C = 100;
    const R = 80;
    const br = 14;
    const reach = R - br - 2;
    let bx = (s.display / extent) * reach;
    let by = (-dy / extent) * reach;
    const d = Math.hypot(bx, by);
    if (d > reach) {
      bx = (bx / d) * reach;
      by = (by / d) * reach;
    }
    const tolR = Math.max(br + 2, (tolerance / extent) * reach + br);
    const ctx = { min: 0, max: extent, ratio: normalize(magnitude, 0, extent) };
    const H = 200 + (showValue ? 40 : 0) + (props.label ? 14 : 0);
    const axisText = `X ${s.fmt(s.display, ctx)}  ·  Y ${s.fmt(dy, ctx)}`;
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
        ariaLabel={props.ariaLabel ?? props.label ?? 'Level'}
        valueNow={Math.hypot(props.value, props.valueY ?? 0)}
        valueMin={0}
        valueMax={extent}
        valueText={`Tilt ${s.fmt(Math.hypot(props.value, props.valueY ?? 0), ctx)}`}
      >
        <circle cx={C} cy={C} r={R + 6} fill={V.face} stroke={V.faceBorder} strokeWidth={2} className={classNames.vial} />
        <circle cx={C} cy={C} r={R} fill={liquid} className={classNames.liquid} />
        <g stroke={V.tick} fill="none" className={classNames.lines}>
          <circle cx={C} cy={C} r={tolR} strokeWidth={1.5} />
          <circle cx={C} cy={C} r={R * 0.66} strokeWidth={1} opacity={0.6} />
          <path d={`M ${C - R} ${C} L ${C + R} ${C} M ${C} ${C - R} L ${C} ${C + R}`} strokeWidth={1} opacity={0.5} />
        </g>
        <circle
          cx={C + bx}
          cy={C + by}
          r={br}
          fill={bubbleFill}
          stroke={bubbleColor}
          strokeWidth={3}
          className={cx('rg-bubble', classNames.bubble)}
        />
        <circle cx={C + bx - 4} cy={C + by - 4} r={3} fill="#fff" opacity={0.9} />
        {showValue && (
          <>
            <text
              x={C}
              y={214}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={18}
              fontFamily={V.valueFont}
              fontWeight={V.valueWeight}
              fill={V.value}
              className={cx('rg-value', classNames.value)}
            >
              {s.fmt(magnitude, ctx)}
            </text>
            <text x={C} y={232} textAnchor="middle" dominantBaseline="central" fontSize={9} fill={V.muted} className={classNames.label}>
              {axisText}
            </text>
          </>
        )}
        {props.label && (
          <text x={C} y={H - 7} textAnchor="middle" dominantBaseline="central" fontSize={9} fill={V.muted} className={cx('rg-label', classNames.label)}>
            {props.label}
          </text>
        )}
      </GaugeFrame>
    );
  }

  // Vial
  const x0 = 16;
  const x1 = 264;
  const top = 12;
  const h = 40;
  const bubbleRx = 24;
  const inner0 = x0 + 6 + bubbleRx;
  const inner1 = x1 - 6 - bubbleRx;
  const bx = lerp(inner0, inner1, s.ratio);
  const mid = (x0 + x1) / 2;
  const tolPx = (tolerance / (s.max - s.min)) * (inner1 - inner0);
  const scaleY = top + h + 6;
  const hasTicks = s.ticks.major.length > 0;
  const valueY = scaleY + (hasTicks ? 40 : 14);
  const H = valueY + (showValue ? 14 : 0) + (props.label ? 18 : 0);

  return (
    <GaugeFrame
      width={280}
      height={H}
      defaultSize={280}
      size={props.size}
      className={cx(classNames.root, props.className)}
      svgClassName={classNames.svg}
      style={props.style}
      theme={props.theme}
      id={props.id}
      ariaLabel={props.ariaLabel ?? props.label ?? 'Level'}
      valueNow={props.value}
      valueMin={s.min}
      valueMax={s.max}
      valueText={s.ariaText}
      status={s.statusInfo}
      limits={s.limits}
    >
      <defs>
        <clipPath id={clip}>
          <rect x={x0} y={top} width={x1 - x0} height={h} rx={h / 2} />
        </clipPath>
      </defs>
      <rect x={x0 - 4} y={top - 4} width={x1 - x0 + 8} height={h + 8} rx={h / 2 + 4} fill={V.face} stroke={V.faceBorder} strokeWidth={1.5} className={classNames.vial} />
      <g clipPath={`url(#${clip})`}>
        <rect x={x0} y={top} width={x1 - x0} height={h} fill={liquid} className={classNames.liquid} />
        <ellipse
          cx={bx}
          cy={top + h / 2}
          rx={bubbleRx}
          ry={h / 2 - 7}
          fill={bubbleFill}
          stroke={bubbleColor}
          strokeWidth={2.5}
          className={cx('rg-bubble', classNames.bubble)}
        />
        <ellipse cx={bx - 8} cy={top + h / 2 - 5} rx={7} ry={2.5} fill="#fff" opacity={0.9} />
      </g>
      <path
        d={[-1, 1]
          .map((sgn) => {
            const x = mid + sgn * (bubbleRx + tolPx);
            return `M ${x} ${top - 2} L ${x} ${top + h + 2}`;
          })
          .join(' ')}
        stroke={V.text}
        strokeWidth={1.5}
        className={classNames.lines}
      />
      <LinearScale
        orientation="horizontal"
        start={inner0}
        end={inner1}
        at={scaleY}
        side={1}
        min={s.min}
        max={s.max}
        ticks={s.ticks}
        labels={s.tickOptions.labels}
        labelEvery={s.tickOptions.labelEvery}
        formatTick={s.tickFmt}
        tickClassName={classNames.ticks}
        labelClassName={classNames.tickLabels}
      />
      {showValue && (
        <text
          x={mid}
          y={valueY}
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
        <text x={mid} y={H - 7} textAnchor="middle" dominantBaseline="central" fontSize={9} fill={V.muted} className={cx('rg-label', classNames.label)}>
          {props.label}
        </text>
      )}
    </GaugeFrame>
  );
}
