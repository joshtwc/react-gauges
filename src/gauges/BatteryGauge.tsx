import { cx, GaugeFrame, useSafeId } from '../core/frame';
import { useRanged } from '../core/ranged';
import { V } from '../core/theme';
import type { CommonGaugeProps, RangedGaugeProps } from '../core/types';
import { thresholdZones } from '../core/zones';

export type BatterySlot = 'body' | 'terminal' | 'fill' | 'segments' | 'bolt' | 'value' | 'label';

export interface BatteryGaugeProps extends CommonGaugeProps<BatterySlot>, RangedGaugeProps {
  /** Split the charge into N cells (default 0 = continuous). */
  segments?: number;
  /** Draw a charging bolt. */
  charging?: boolean;
  orientation?: 'horizontal' | 'vertical';
  /** Readout inside the body (default), beside it, or hidden. */
  valuePosition?: 'inside' | 'outside' | 'none';
}

/** Battery / charge meter. Defaults to red <15 %, amber <35 %, green above. */
export function BatteryGauge(props: BatteryGaugeProps) {
  const { segments = 0, charging = false, orientation = 'horizontal', valuePosition = 'inside', classNames = {}, showValue = true } = props;
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const span = max - min;
  // Default charge bands, unless the gauge has its own zones or limits to draw.
  const zones = props.zones ?? (props.limits ? undefined : thresholdZones([min, min + span * 0.15, min + span * 0.35, max], ['bad', 'warn', 'good']));
  const s = useRanged(
    { ...props, zones },
    { min: 0, max: 100, format: props.format ? { maxDecimals: 1 } : { percentOfRange: true } },
  );
  const clip = useSafeId('rg-batt');
  const vertical = orientation === 'vertical';
  const outside = showValue && valuePosition === 'outside';

  // Drawn horizontally, then rotated -90° for vertical (terminal on top).
  const bw = 160;
  const bh = 72;
  const pad = 6;
  const tw = 10;
  const th = 30;
  const bodyW = bw + tw + 2;
  const innerW = bw - pad * 2;
  const innerH = bh - pad * 2;
  const rotate = vertical ? `translate(0 ${bodyW}) rotate(-90)` : undefined;
  const outsideSpace = outside ? (vertical ? 30 : 70) : 0;
  const labelSpace = props.label ? 16 : 0;
  const W = vertical ? bh + 2 : bodyW + outsideSpace;
  const H = vertical ? bodyW + outsideSpace + labelSpace : bh + 2 + labelSpace;

  const fillW = s.ratio > 0 ? Math.max(innerH * 0.15, innerW * s.ratio) : 0;
  const cells: JSXCell[] = [];
  if (segments > 0) {
    const gap = 4;
    const cw = (innerW - gap * (segments - 1)) / segments;
    for (let i = 0; i < segments; i++) {
      const cellStart = i / segments;
      const cellEnd = (i + 1) / segments;
      const lit = Math.max(0, Math.min(1, (s.ratio - cellStart) / (cellEnd - cellStart)));
      cells.push({ x: 1 + pad + i * (cw + gap), w: cw, lit });
    }
  }

  const bodyCenter = vertical ? { x: W / 2, y: bodyW - 1 - bw / 2 } : { x: 1 + bw / 2, y: 1 + bh / 2 };
  const text = showValue && valuePosition !== 'none' ? s.text : null;

  return (
    <GaugeFrame
      width={W}
      height={H}
      defaultSize={vertical ? 70 : 180}
      size={props.size}
      className={cx(classNames.root, props.className)}
      svgClassName={classNames.svg}
      style={props.style}
      theme={props.theme}
      id={props.id}
      ariaLabel={props.ariaLabel ?? props.label ?? 'Battery'}
      valueNow={props.value}
      valueMin={s.min}
      valueMax={s.max}
      valueText={s.ariaText + (charging ? ', charging' : '')}
      status={s.statusInfo}
      limits={s.limits}
    >
      <g transform={rotate}>
        <rect x={1} y={1} width={bw} height={bh} rx={10} fill={V.face} stroke={V.faceBorder} strokeWidth={2.5} className={classNames.body} />
        <rect x={bw + 2} y={1 + (bh - th) / 2} width={tw} height={th} rx={3} fill={V.faceBorder} className={classNames.terminal} />
        {segments > 0 ? (
          <g className={cx('rg-segments', classNames.segments)}>
            {cells.map((c, i) => (
              <g key={i}>
                <rect x={c.x} y={1 + pad} width={c.w} height={innerH} rx={3} fill={V.track} />
                {c.lit > 0 && <rect x={c.x} y={1 + pad} width={c.w * c.lit} height={innerH} rx={3} fill={s.color} />}
              </g>
            ))}
          </g>
        ) : (
          <>
            <rect x={1 + pad} y={1 + pad} width={innerW} height={innerH} rx={5} fill={V.track} />
            {s.ratio > 0 && (
              <rect
                x={1 + pad}
                y={1 + pad}
                width={fillW}
                height={innerH}
                rx={5}
                fill={s.color}
                className={cx('rg-fill', classNames.fill)}
              />
            )}
          </>
        )}
        {charging && (
          <path
            transform={`translate(${1 + bw / 2 - 14} ${1 + bh / 2 - 22}) ${vertical ? 'rotate(90 14 22)' : ''}`}
            d="M 17 0 L 2 25 L 13 25 L 9 44 L 26 17 L 15 17 L 19 0 Z"
            fill={text && valuePosition === 'inside' ? 'none' : V.text}
            stroke={V.text}
            strokeWidth={1.5}
            strokeLinejoin="round"
            opacity={text && valuePosition === 'inside' ? 0.35 : 1}
            className={cx('rg-bolt', classNames.bolt)}
          />
        )}
      </g>
      {text && valuePosition === 'inside' && (
        <>
          <defs>
            <clipPath id={clip}>
              {segments > 0 ? (
                cells.map((c, i) =>
                  c.lit > 0 ? <rect key={i} transform={rotate} x={c.x} y={1 + pad} width={c.w * c.lit} height={innerH} /> : null,
                )
              ) : (
                <rect transform={rotate} x={1 + pad} y={1 + pad} width={fillW} height={innerH} />
              )}
            </clipPath>
          </defs>
          {[V.text, 'var(--rg-on-accent, #fff)'].map((fill, i) => (
            <text
              key={i}
              x={bodyCenter.x}
              y={bodyCenter.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={vertical ? 16 : 24}
              fontFamily={V.valueFont}
              fontWeight={V.valueWeight}
              fill={fill}
              clipPath={i === 1 ? `url(#${clip})` : undefined}
              className={cx('rg-value', classNames.value)}
            >
              {text}
            </text>
          ))}
        </>
      )}
      {text && outside && (
        <text
          x={vertical ? W / 2 : bodyW + 12}
          y={vertical ? bodyW + 18 : bh / 2 + 1}
          textAnchor={vertical ? 'middle' : 'start'}
          dominantBaseline="central"
          fontSize={vertical ? 14 : 22}
          fontFamily={V.valueFont}
          fontWeight={V.valueWeight}
          fill={V.value}
          className={cx('rg-value', classNames.value)}
        >
          {text}
        </text>
      )}
      {props.label && (
        <text x={W / 2} y={H - 6} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={V.muted} className={cx('rg-label', classNames.label)}>
          {props.label}
        </text>
      )}
    </GaugeFrame>
  );
}

interface JSXCell {
  x: number;
  w: number;
  lit: number;
}
