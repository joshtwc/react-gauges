import { cx, fitFontSize, GaugeFrame, LinearScale, useSafeId } from '../core/frame';
import { useRanged, useReducedMotion } from '../core/ranged';
import { V } from '../core/theme';
import type { CommonGaugeProps, RangedGaugeProps } from '../core/types';
import { clipZone, resolveColor } from '../core/zones';

export type TankSlot = 'vessel' | 'liquid' | 'wave' | 'zones' | 'ticks' | 'tickLabels' | 'value' | 'label' | 'markers';

export interface TankGaugeProps extends CommonGaugeProps<TankSlot>, RangedGaugeProps {
  /** Vessel shape (default `'rounded'`). `'circle'` makes a classic liquid-fill ball. */
  shape?: 'rect' | 'rounded' | 'cylinder' | 'circle';
  /** Animated surface waves (default true; disabled for reduced-motion users). */
  wave?: boolean;
  /** Wave height in viewBox units (default 4). */
  waveAmplitude?: number;
  /** Seconds per wave cycle (default 2.4). */
  waveSpeed?: number;
  /** Side scale (default true for rect/rounded/cylinder, false for circle). */
  showScale?: boolean;
}

/** Liquid level / fill gauge with animated waves and contrast-safe readout. */
export function TankGauge(props: TankGaugeProps) {
  const { shape = 'rounded', waveAmplitude = 4, waveSpeed = 2.4, classNames = {}, showValue = true } = props;
  const reduced = useReducedMotion();
  const wave = (props.wave ?? true) && !reduced;
  const ids = { vessel: useSafeId('rg-tank'), liquid: useSafeId('rg-liq') };
  const s = useRanged(props, {
    min: 0,
    max: 100,
    ticks: { count: 5, minor: 1 },
    format: props.format ? { maxDecimals: 1 } : { percentOfRange: true },
  });
  const { zones, markers } = s;
  const circle = shape === 'circle';
  const showScale = (props.showScale ?? !circle) && s.ticks.major.length > 0;

  const vx = showScale ? 44 : 8;
  const vy = 8;
  const vw = circle ? 170 : 120;
  const vh = circle ? 170 : 180;
  const e = shape === 'cylinder' ? 12 : 0;
  const W = vx + vw + 8;
  const H = vy + vh + 8;

  const interior = (() => {
    switch (shape) {
      case 'circle':
        return <circle cx={vx + vw / 2} cy={vy + vh / 2} r={vw / 2} />;
      case 'cylinder':
        return (
          <path
            d={`M ${vx} ${vy + e} A ${vw / 2} ${e} 0 0 1 ${vx + vw} ${vy + e} L ${vx + vw} ${vy + vh - e} A ${vw / 2} ${e} 0 0 1 ${vx} ${vy + vh - e} Z`}
          />
        );
      default:
        return <rect x={vx} y={vy} width={vw} height={vh} rx={shape === 'rounded' ? 18 : 3} />;
    }
  })();

  // Level mapping (for a cylinder, the fillable part excludes the caps' curvature).
  const bottom = vy + vh - e;
  const top = vy + e;
  const levelY = (v: number) => bottom - ((v - s.min) / (s.max - s.min || 1)) * (bottom - top);
  const surface = bottom - s.ratio * (bottom - top);
  const L = vw / 1.5; // wavelength
  const amp = wave && s.ratio > 0 && s.ratio < 1 ? waveAmplitude : 0;

  const wavePath = (phase: number) => {
    const x0 = vx - L * 2 + phase;
    const parts = [`M ${x0} ${surface}`];
    let x = x0;
    let up = true;
    while (x < vx + vw + L) {
      parts.push(`Q ${x + L / 4} ${surface + (up ? -2 : 2) * amp} ${x + L / 2} ${surface}`);
      x += L / 2;
      up = !up;
    }
    parts.push(`L ${x} ${vy + vh + 20} L ${x0} ${vy + vh + 20} Z`);
    return parts.join(' ');
  };
  const drift = (dur: number, reverse = false) =>
    wave ? (
      <animateTransform
        attributeName="transform"
        type="translate"
        from={reverse ? `${L} 0` : '0 0'}
        to={reverse ? '0 0' : `${L} 0`}
        dur={`${dur}s`}
        repeatCount="indefinite"
      />
    ) : null;

  const readout = (fill: string) => (
    <>
      {showValue && (
        <text
          x={vx + vw / 2}
          y={vy + vh / 2 - (props.label ? 6 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fitFontSize(s.text, vw * 0.84, circle ? 32 : 26)}
          fontFamily={V.valueFont}
          fontWeight={V.valueWeight}
          fill={fill}
          className={cx('rg-value', classNames.value)}
        >
          {s.text}
        </text>
      )}
      {props.label && (
        <text
          x={vx + vw / 2}
          y={vy + vh / 2 + (showValue ? 18 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fill={fill}
          className={cx('rg-label', classNames.label)}
        >
          {props.label}
        </text>
      )}
    </>
  );

  return (
    <GaugeFrame
      width={W}
      height={H}
      defaultSize={circle ? 180 : 160}
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
        <clipPath id={ids.vessel}>{interior}</clipPath>
        <clipPath id={ids.liquid}>
          <path d={wavePath(0)}>{drift(waveSpeed)}</path>
        </clipPath>
      </defs>

      {/* Vessel background */}
      <g fill={V.track} className={classNames.vessel}>
        {interior}
      </g>

      <g clipPath={`url(#${ids.vessel})`}>
        {readout(V.value)}
        {s.ratio > 0 && (
          <g className={cx('rg-liquid', classNames.liquid)} fill={s.color}>
            {wave && <path d={wavePath(L / 3)} opacity={0.4} className={classNames.wave}>{drift(waveSpeed * 1.4, true)}</path>}
            <path d={wavePath(0)}>{drift(waveSpeed)}</path>
          </g>
        )}
        {/* Same readout in the on-accent colour, clipped to the liquid → always legible. */}
        {s.ratio > 0 && <g clipPath={`url(#${ids.liquid})`}>{readout('var(--rg-on-accent, #fff)')}</g>}
        {markers.map((m, i) => (
          <g key={i} className={cx(classNames.markers, m.className)}>
            <line
              x1={vx}
              x2={vx + vw}
              y1={levelY(m.value)}
              y2={levelY(m.value)}
              stroke={resolveColor(m.color) ?? V.marker}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {m.label && (
              <text x={vx + vw - 8} y={levelY(m.value) - 5} fontSize={9} textAnchor="end" fill={resolveColor(m.color) ?? V.marker}>
                {m.label}
              </text>
            )}
          </g>
        ))}
      </g>

      {/* Outline (+ cylinder rim) */}
      <g fill="none" stroke={V.faceBorder} strokeWidth={2} className={classNames.vessel}>
        {interior}
        {shape === 'cylinder' && (
          <path d={`M ${vx} ${vy + e} A ${vw / 2} ${e} 0 0 0 ${vx + vw} ${vy + e}`} strokeWidth={1.5} opacity={0.8} />
        )}
      </g>

      {showScale && (
        <>
          <g className={cx('rg-zones', classNames.zones)}>
            {zones.map((z, i) => {
              const c = clipZone(z, s.min, s.max);
              if (!c) return null;
              return (
                <rect
                  key={i}
                  x={vx - 7}
                  y={levelY(c.to)}
                  width={3}
                  height={Math.max(0, levelY(c.from) - levelY(c.to))}
                  fill={resolveColor(z.color)}
                  className={z.className}
                />
              );
            })}
          </g>
          <LinearScale
            orientation="vertical"
            start={bottom}
            end={top}
            at={vx - 9}
            side={-1}
            min={s.min}
            max={s.max}
            ticks={s.ticks}
            majorLength={7}
            minorLength={4}
            labels={s.tickOptions.labels}
            labelEvery={s.tickOptions.labelEvery}
            formatTick={s.tickFmt}
            tickClassName={classNames.ticks}
            labelClassName={classNames.tickLabels}
          />
        </>
      )}
    </GaugeFrame>
  );
}
