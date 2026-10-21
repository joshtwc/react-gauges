import { cx, fitFontSize, GaugeFrame, LinearScale } from '../core/frame';
import { sectorPath } from '../core/geometry';
import { useRanged } from '../core/ranged';
import { lerp, normalize } from '../core/scale';
import { V } from '../core/theme';
import type { CommonGaugeProps, RangedGaugeProps } from '../core/types';
import { resolveColor, zoneAt } from '../core/zones';

export type SegmentedSlot = 'segment' | 'lit' | 'unlit' | 'peak' | 'ticks' | 'tickLabels' | 'value' | 'label';

export interface SegmentedMeterProps extends CommonGaugeProps<SegmentedSlot>, RangedGaugeProps {
  /** Number of segments (default 20). */
  segments?: number;
  /** `'linear'` LED bar (default) or `'arc'` segmented ring. */
  layout?: 'linear' | 'arc';
  orientation?: 'horizontal' | 'vertical';
  /** Segment shape for linear layout. */
  shape?: 'rect' | 'round' | 'dot';
  /** Gap between segments (viewBox units, default 3). */
  gap?: number;
  /** Opacity of unlit segments (default 0.18). */
  unlitOpacity?: number;
  /** Peak-hold value – that segment stays lit. */
  peak?: number;
  /** Arc layout start/end angles (default -120 / 120). */
  startAngle?: number;
  endAngle?: number;
}

/** LED-style segmented meter (VU meter, signal strength, load). */
export function SegmentedMeter(props: SegmentedMeterProps) {
  const {
    segments = 20,
    layout = 'linear',
    orientation = 'horizontal',
    shape = 'rect',
    gap = 3,
    unlitOpacity = 0.18,
    startAngle = -120,
    endAngle = 120,
    classNames = {},
    showValue = true,
  } = props;
  const s = useRanged(props, {
    min: 0,
    max: 100,
    format: { maxDecimals: 0 },
    ticks: layout === 'arc' ? { show: false } : { count: 5, minor: 0 },
  });
  const n = Math.max(1, Math.round(segments));
  const lit = Math.round(s.ratio * n);
  const peakIdx = props.peak !== undefined ? Math.min(n - 1, Math.max(0, Math.ceil(normalize(props.peak, s.min, s.max) * n) - 1)) : -1;

  const segColor = (i: number) => {
    if (props.color) return resolveColor(props.color)!;
    const mid = lerp(s.min, s.max, (i + 0.5) / n);
    const z = props.zoneColor === false ? undefined : zoneAt(mid, s.zones);
    return z ? resolveColor(z.color)! : V.accent;
  };

  const common = {
    size: props.size,
    className: cx(classNames.root, props.className),
    svgClassName: classNames.svg,
    style: props.style,
    theme: props.theme,
    id: props.id,
    ariaLabel: props.ariaLabel ?? props.label,
    valueNow: props.value,
    valueMin: s.min,
    valueMax: s.max,
    valueText: s.ariaText,
    status: s.statusInfo,
    limits: s.limits,
  };

  const segEl = (i: number, el: (fill: string, opacity: number, cls?: string) => JSX_Like) => {
    const on = i < lit;
    const isPeak = i === peakIdx && !on;
    return el(segColor(i), on || isPeak ? 1 : unlitOpacity, cx(classNames.segment, on ? classNames.lit : isPeak ? classNames.peak : classNames.unlit));
  };

  if (layout === 'arc') {
    const C = 100;
    const outer = 92;
    const inner = 70;
    const sweep = endAngle - startAngle;
    const gapDeg = (gap / outer) * (180 / Math.PI);
    const per = sweep / n;
    const H = sweep >= 250 || sweep <= -250 ? 200 : 160;
    return (
      <GaugeFrame width={200} height={H} defaultSize={220} {...common}>
        {Array.from({ length: n }, (_, i) =>
          segEl(i, (fill, opacity, cls) => (
            <path
              key={i}
              d={sectorPath(C, C, outer, inner, startAngle + per * i + gapDeg / 2, startAngle + per * (i + 1) - gapDeg / 2)}
              fill={fill}
              opacity={opacity}
              className={cls}
            />
          )),
        )}
        {showValue && (
          <text
            x={C}
            y={C}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fitFontSize(s.text, 118, 30)}
            fontFamily={V.valueFont}
            fontWeight={V.valueWeight}
            fill={V.value}
            className={cx('rg-value', classNames.value)}
          >
            {s.text}
          </text>
        )}
        {props.label && (
          <text x={C} y={C + 26} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={V.muted} className={cx('rg-label', classNames.label)}>
            {props.label}
          </text>
        )}
      </GaugeFrame>
    );
  }

  const vertical = orientation === 'vertical';
  const len = vertical ? 200 : 280;
  const thick = shape === 'dot' ? 12 : 18;
  const header = props.label || showValue ? (vertical ? 28 : 22) : 0;
  const hasTicks = s.ticks.major.length > 0;
  const start = vertical ? header + len : 10;
  const end = vertical ? header : 10 + len;
  const c0 = vertical ? 12 : header + 2;
  const W = vertical ? c0 + thick + (hasTicks ? 40 : 12) : len + 20;
  const H = vertical ? header + len + 10 : c0 + thick + (hasTicks ? 24 : 6);
  const per = len / n;

  return (
    <GaugeFrame width={W} height={H} defaultSize={vertical ? 80 : 300} {...common}>
      {Array.from({ length: n }, (_, i) =>
        segEl(i, (fill, opacity, cls) => {
          const a0 = vertical ? start - per * (i + 1) + gap / 2 : start + per * i + gap / 2;
          const sz = per - gap;
          if (shape === 'dot') {
            const r = Math.min(sz, thick) / 2;
            const ca = a0 + sz / 2;
            return (
              <circle key={i} cx={vertical ? c0 + thick / 2 : ca} cy={vertical ? ca : c0 + thick / 2} r={r} fill={fill} opacity={opacity} className={cls} />
            );
          }
          return (
            <rect
              key={i}
              x={vertical ? c0 : a0}
              y={vertical ? a0 : c0}
              width={vertical ? thick : sz}
              height={vertical ? sz : thick}
              rx={shape === 'round' ? Math.min(sz, thick) / 2 : 1.5}
              fill={fill}
              opacity={opacity}
              className={cls}
            />
          );
        }),
      )}
      <LinearScale
        orientation={orientation}
        start={start}
        end={end}
        at={c0 + thick + 3}
        side={1}
        min={s.min}
        max={s.max}
        ticks={s.ticks}
        majorLength={5}
        labels={s.tickOptions.labels}
        labelEvery={s.tickOptions.labelEvery}
        formatTick={s.tickFmt}
        tickClassName={classNames.ticks}
        labelClassName={classNames.tickLabels}
      />
      {showValue && (
        <text
          x={vertical ? c0 + thick / 2 : end}
          y={vertical ? 12 : 9}
          textAnchor={vertical ? 'middle' : 'end'}
          dominantBaseline="central"
          fontSize={14}
          fontFamily={V.valueFont}
          fontWeight={V.valueWeight}
          fill={V.value}
          className={cx('rg-value', classNames.value)}
        >
          {s.text}
        </text>
      )}
      {props.label && !vertical && (
        <text x={start} y={9} textAnchor="start" dominantBaseline="central" fontSize={11} fill={V.muted} className={cx('rg-label', classNames.label)}>
          {props.label}
        </text>
      )}
    </GaugeFrame>
  );
}

type JSX_Like = import('react').ReactElement;
