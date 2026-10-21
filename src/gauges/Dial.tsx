import { anchorForAngle, arcPath, DEG, polar, sectorPath, sweepExtent } from '../core/geometry';
import { ArcScale, cx, fitFontSize, fmtCtx, GaugeFrame, textWidth } from '../core/frame';
import { useRanged } from '../core/ranged';
import { normalize } from '../core/scale';
import { V } from '../core/theme';
import type { CommonGaugeProps, RangedGaugeProps } from '../core/types';
import { clipZone, resolveColor } from '../core/zones';

export type DialSlot =
  | 'face'
  | 'track'
  | 'fill'
  | 'zones'
  | 'ticks'
  | 'tickLabels'
  | 'needle'
  | 'hub'
  | 'value'
  | 'label'
  | 'markers';

export interface NeedleOptions {
  /** `'tapered'` (default), `'line'`, `'arrow'`, `'triangle'`. */
  shape?: 'tapered' | 'line' | 'arrow' | 'triangle';
  /** Length as a fraction of the dial radius (default 0.78). */
  length?: number;
  /** Base width in viewBox units (default 6). */
  width?: number;
  /** Counterweight tail length, fraction of radius (default 0.12). */
  tail?: number;
  color?: string;
  /** Hub radius (default 7, 0 to hide). */
  hubRadius?: number;
}

export interface DialProps extends CommonGaugeProps<DialSlot>, RangedGaugeProps {
  /** Angle of the range minimum. 0 = 12 o'clock, clockwise (default -135). */
  startAngle?: number;
  /** Angle of the range maximum (default 135). Use a smaller value than start for counter-clockwise dials. */
  endAngle?: number;
  /** Needle only, value arc only, or both (default). */
  variant?: 'needle' | 'arc' | 'both';
  /** Width of the value arc (default 10). */
  arcWidth?: number;
  /** Round the ends of the value arc. */
  rounded?: boolean;
  /** Where the arc fill starts – set for bipolar dials (e.g. `0` on a −50…50 range). */
  origin?: number;
  /** `'band'` = thin coloured ring outside the track (default); `'track'` = zones tint the track itself. */
  zoneStyle?: 'band' | 'track';
  needle?: NeedleOptions;
  /** Draw a filled face and bezel. */
  face?: boolean;
  /** Readout placement (default `'auto'`). */
  valuePosition?: 'auto' | 'center' | 'bottom' | 'none';
  /** Font size of the readout (viewBox units, default depends on layout). */
  valueSize?: number;
  /** Recorded minimum – drawn as a small ghost pointer. */
  minHold?: number;
  /** Recorded maximum – drawn as a small ghost pointer. */
  maxHold?: number;
}

const CX = 100;
const CY = 100;
const OUTER = 90;

/** Radial dial / speedometer-style gauge. */
export function Dial(props: DialProps) {
  const {
    startAngle = -135,
    endAngle = 135,
    variant = 'both',
    arcWidth = 10,
    rounded = false,
    zoneStyle = 'band',
    face = false,
    valuePosition = 'auto',
    classNames = {},
    showValue = true,
  } = props;
  const s = useRanged(props, {
    min: 0,
    max: 100,
    ticks: { count: 10, minor: 4 },
    format: { maxDecimals: 1 },
  });
  const { zones, markers } = s;
  const sweep = endAngle - startAngle;
  const absSweep = Math.abs(sweep);
  const angleOf = (v: number) => startAngle + normalize(v, s.min, s.max) * sweep;
  const showArc = variant !== 'needle';
  const showNeedle = variant !== 'arc';

  // Radii (outside → in).
  const trackR = OUTER - arcWidth / 2;
  const tickStart = showArc ? OUTER - arcWidth - 4 : OUTER;
  const majorLen = 8;
  const labelR = tickStart - majorLen - 10;
  const bandOuter = showArc ? OUTER + 5 : tickStart;
  const bandInner = showArc ? OUTER + 2 : tickStart - 5;

  const n = props.needle ?? {};
  const needleLen = (n.length ?? 0.78) * OUTER;
  const needleW = n.width ?? 6;
  const tail = (n.tail ?? 0.12) * OUTER;
  const hubR = n.hubRadius ?? 7;
  const needleAngle = angleOf(s.pos);
  const needleColor = resolveColor(n.color) ?? (props.color ? resolveColor(props.color)! : V.needle);

  // Readout placement.
  const pos = valuePosition === 'auto' ? (absSweep >= 220 || !showNeedle ? 'center' : 'bottom') : valuePosition;
  const baseSize = props.valueSize ?? (showNeedle ? 20 : absSweep >= 220 ? 30 : 26);
  const preferredY = (size: number) => {
    if (!showNeedle) return absSweep >= 220 ? CY + size * 0.1 : CY - size * 0.35;
    if (pos === 'center') return absSweep > 300 ? CY + hubR + size * 0.9 : CY + OUTER * 0.42;
    return CY + hubR + size * 0.9;
  };

  // The first and last tick labels sit low on wide sweeps – exactly where the readout goes.
  // Keep the readout (and caption) clear of them: shrink a little, else drop below them.
  const endLabels =
    s.tickOptions.labels !== false && s.ticks.major.length > 0
      ? [s.ticks.major[0], s.ticks.major[s.ticks.major.length - 1]].map((v) => {
          const p = polar(CX, CY, labelR, angleOf(v));
          return { x: p.x, y: p.y, w: textWidth(s.tickFmt(v, fmtCtx(v, s.min, s.max)), 10) };
        })
      : [];
  const collides = (y: number, size: number, text: string) => {
    const half = textWidth(text, size) / 2;
    return endLabels.some(
      (l) => Math.abs(l.x - CX) < half + l.w / 2 + 3 && Math.abs(l.y - y) < size / 2 + 5 + 2,
    );
  };
  // Size and place for the widest reading this gauge can show, so nothing jumps while the value animates.
  const texts = [s.ariaText, s.fmt(s.min, fmtCtx(s.min, s.min, s.max)), s.fmt(s.max, fmtCtx(s.max, s.min, s.max))];
  const widest = texts.reduce((a, b) => (textWidth(b, 10) > textWidth(a, 10) ? b : a));
  let valueSize = props.valueSize ?? fitFontSize(widest, pos === 'bottom' ? OUTER * 1.7 : labelR * 1.45, baseSize);
  let valueY = preferredY(valueSize);
  if (showValue && pos !== 'none' && props.valueSize === undefined && texts.some((t) => collides(valueY, valueSize, t))) {
    const shrunk = Array.from({ length: 4 }, (_, i) => valueSize * (1 - 0.05 * (i + 1))).find(
      (size) => !texts.some((t) => collides(preferredY(size), size, t)),
    );
    if (shrunk) {
      valueSize = shrunk;
      valueY = preferredY(shrunk);
    } else {
      // Below the end labels there is no arc, so the readout gets the full width.
      valueSize = fitFontSize(widest, labelR * 2, baseSize);
      valueY = Math.max(...endLabels.map((l) => l.y)) + 6 + 2 + valueSize / 2;
    }
  }
  const labelY = valueY + valueSize * 0.55 + 8;

  // Tight viewBox: crop to the swept part of the circle plus the readout.
  // A face is a full circle, so it needs the whole disc in view – not just the swept arc.
  const faceR = OUTER + 9; // face radius + half its stroke
  const ext = face
    ? { minX: CX - faceR, maxX: CX + faceR, minY: CY - faceR, maxY: CY + faceR }
    : sweepExtent(CX, CY, bandOuter + 2, startAngle, endAngle);
  // Marker labels sit outside the ring – widen the box so they aren't cropped.
  const markerPad = markers.some((m) => m.label) ? 10 + Math.max(...markers.map((m) => (m.label ?? '').length)) * 5 : 0;
  const top = Math.min(ext.minY, CY - hubR) - 6 - (markerPad ? 12 : 0);
  let bottom = Math.max(ext.maxY, CY + (showNeedle ? Math.max(hubR, tail) : 0)) + 6;
  if (showValue && pos !== 'none') bottom = Math.max(bottom, valueY + valueSize * 0.45 + 6);
  if (props.label) bottom = Math.max(bottom, labelY + 8);
  const left = Math.min(ext.minX, CX - labelR) - 6 - markerPad;
  const right = Math.max(ext.maxX, CX + labelR) + 6 + markerPad;

  const fillFrom = props.origin !== undefined ? angleOf(props.origin) : startAngle;
  const fillTo = angleOf(s.pos);

  const needlePath = (() => {
    const tipY = CY - needleLen;
    const baseY = CY + tail;
    switch (n.shape ?? 'tapered') {
      case 'line':
        return null;
      case 'triangle':
        return `M ${CX - needleW / 2} ${CY} L ${CX} ${tipY} L ${CX + needleW / 2} ${CY} Z`;
      case 'arrow':
        return `M ${CX - needleW * 0.9} ${tipY + 12} L ${CX} ${tipY} L ${CX + needleW * 0.9} ${tipY + 12} Z`;
      default:
        return `M ${CX - needleW / 2} ${baseY} L ${CX - needleW * 0.14} ${tipY} L ${CX + needleW * 0.14} ${tipY} L ${CX + needleW / 2} ${baseY} Z`;
    }
  })();

  const holdPointer = (v: number, key: string) => {
    const a = angleOf(v);
    const tip = polar(CX, CY, tickStart - 1, a);
    const l = polar(CX, CY, tickStart + 7, a - 3.2);
    const r = polar(CX, CY, tickStart + 7, a + 3.2);
    return (
      <path
        key={key}
        d={`M ${tip.x} ${tip.y} L ${l.x} ${l.y} L ${r.x} ${r.y} Z`}
        fill={V.muted}
        opacity={0.8}
        className={classNames.markers}
      />
    );
  };

  return (
    <GaugeFrame
      x={left}
      y={top}
      width={right - left}
      height={bottom - top}
      defaultSize={220}
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
      {face && (
        <circle
          cx={CX}
          cy={CY}
          r={OUTER + 8}
          fill={V.face}
          stroke={V.faceBorder}
          strokeWidth={2}
          className={classNames.face}
        />
      )}

      {/* Zones */}
      {(zoneStyle === 'band' || !showArc) && (
        <g className={cx('rg-zones', classNames.zones)}>
          {zones.map((z, i) => {
            const c = clipZone(z, s.min, s.max);
            if (!c) return null;
            return (
              <path
                key={i}
                d={sectorPath(CX, CY, bandOuter, bandInner, angleOf(c.from), angleOf(c.to))}
                fill={resolveColor(z.color)}
                className={z.className}
              />
            );
          })}
        </g>
      )}

      {/* Track + fill */}
      {showArc && (
        <>
          <path
            d={arcPath(CX, CY, trackR, startAngle, endAngle)}
            stroke={V.track}
            strokeWidth={arcWidth}
            fill="none"
            strokeLinecap={rounded ? 'round' : 'butt'}
            className={classNames.track}
          />
          {zoneStyle === 'track' &&
            zones.map((z, i) => {
              const c = clipZone(z, s.min, s.max);
              if (!c) return null;
              return (
                <path
                  key={i}
                  d={arcPath(CX, CY, trackR, angleOf(c.from), angleOf(c.to))}
                  stroke={resolveColor(z.color)}
                  strokeOpacity={0.3}
                  strokeWidth={arcWidth}
                  fill="none"
                  className={cx(classNames.zones, z.className)}
                />
              );
            })}
          {Math.abs(fillTo - fillFrom) > 0.05 && (
            <path
              d={arcPath(CX, CY, trackR, fillFrom, fillTo)}
              stroke={s.color}
              strokeWidth={arcWidth}
              fill="none"
              strokeLinecap={rounded ? 'round' : 'butt'}
              className={cx('rg-fill', classNames.fill)}
            />
          )}
        </>
      )}

      {/* Ticks */}
      <ArcScale
        cx={CX}
        cy={CY}
        radius={tickStart}
        startAngle={startAngle}
        endAngle={endAngle}
        min={s.min}
        max={s.max}
        ticks={s.ticks}
        majorLength={majorLen}
        minorLength={4}
        labelRadius={labelR}
        labels={s.tickOptions.labels}
        labelEvery={s.tickOptions.labelEvery}
        formatTick={s.tickFmt}
        labelSize={10}
        tickClassName={classNames.ticks}
        labelClassName={classNames.tickLabels}
        skipLastLabel={absSweep >= 359}
      />

      {/* Range labels when ticks are hidden */}
      {props.showRangeLabels &&
        [s.min, s.max].map((v, i) => {
          const p = polar(CX, CY, trackR, angleOf(v));
          return (
            <text
              key={i}
              x={p.x}
              y={p.y + arcWidth / 2 + 10}
              textAnchor="middle"
              fontSize={10}
              fill={V.muted}
              className={classNames.tickLabels}
            >
              {s.tickFmt(v, fmtCtx(v, s.min, s.max))}
            </text>
          );
        })}

      {/* Markers */}
      <g className={cx('rg-markers', classNames.markers)}>
        {markers.map((m, i) => {
          const a = angleOf(m.value);
          const inner = showArc ? OUTER - arcWidth - 3 : tickStart - majorLen - 2;
          const outer = showArc ? OUTER + 3 : tickStart + 3;
          const p0 = polar(CX, CY, inner, a);
          const p1 = polar(CX, CY, outer, a);
          const lp = polar(CX, CY, outer + 4, a);
          const anchor = anchorForAngle(a);
          const baseline = anchor !== 'middle' ? 'central' : Math.cos(a * DEG) > 0 ? 'auto' : 'hanging';
          return (
            <g key={i} className={m.className}>
              <path
                d={`M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`}
                stroke={resolveColor(m.color) ?? V.marker}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              {m.label && (
                <text
                  x={lp.x}
                  y={lp.y}
                  fontSize={9}
                  textAnchor={anchor}
                  dominantBaseline={baseline}
                  fill={resolveColor(m.color) ?? V.marker}
                >
                  {m.label}
                </text>
              )}
            </g>
          );
        })}
        {props.minHold !== undefined && holdPointer(props.minHold, 'min')}
        {props.maxHold !== undefined && holdPointer(props.maxHold, 'max')}
      </g>

      {/* Over/under-range flag */}
      {(s.over || s.under) && (
        <circle
          cx={polar(CX, CY, tickStart - majorLen - 3, s.over ? endAngle : startAngle).x}
          cy={polar(CX, CY, tickStart - majorLen - 3, s.over ? endAngle : startAngle).y}
          r={3}
          fill="var(--rg-bad, #c2463d)"
        >
          <title>{s.over ? 'Above range' : 'Below range'}</title>
        </circle>
      )}

      {/* Readout */}
      {showValue && pos !== 'none' && (
        <text
          x={CX}
          y={valueY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={valueSize}
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
          x={CX}
          y={showValue && pos !== 'none' ? labelY : valueY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fill={V.muted}
          className={cx('rg-label', classNames.label)}
        >
          {props.label}
        </text>
      )}

      {/* Needle */}
      {showNeedle && (
        <g transform={`rotate(${needleAngle} ${CX} ${CY})`} className={cx('rg-needle', classNames.needle)}>
          {n.shape === 'line' || n.shape === 'arrow' ? (
            <line
              x1={CX}
              y1={CY + tail}
              x2={CX}
              y2={CY - needleLen + (n.shape === 'arrow' ? 8 : 0)}
              stroke={needleColor}
              strokeWidth={Math.max(1.5, needleW / 2.5)}
              strokeLinecap="round"
            />
          ) : null}
          {needlePath && <path d={needlePath} fill={needleColor} />}
        </g>
      )}
      {showNeedle && hubR > 0 && (
        <g className={cx('rg-hub', classNames.hub)}>
          <circle cx={CX} cy={CY} r={hubR} fill={V.hub} />
          <circle cx={CX} cy={CY} r={hubR * 0.38} fill="var(--rg-face, #fff)" opacity={0.85} />
        </g>
      )}
    </GaugeFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Presets                                                            */
/* ------------------------------------------------------------------ */

export interface SpeedometerProps extends Omit<DialProps, 'value'> {
  value: number;
  /** `'km/h'` (default) or `'mph'` – sets the label and default range. */
  unit?: 'km/h' | 'mph';
}

/** Dial preset: 0–240 km/h (or 0–160 mph), 270° sweep, needle + arc. */
export function Speedometer({ unit = 'km/h', ...props }: SpeedometerProps) {
  return (
    <Dial
      max={unit === 'mph' ? 160 : 240}
      ticks={{ step: 20, minor: 3 }}
      format={{ decimals: 0 }}
      label={unit}
      face
      needle={{ shape: 'tapered' }}
      animate={{ easing: 'overshoot', duration: 900 }}
      {...props}
    />
  );
}

export interface TachometerProps extends Omit<DialProps, 'value'> {
  value: number;
  /** Start of the red zone in rpm (default 6500). */
  redline?: number;
}

/** Dial preset: 0–8000 rpm with ×1000 tick labels and a red zone. */
export function Tachometer({ redline = 6500, ...props }: TachometerProps) {
  const max = props.max ?? 8000;
  return (
    <Dial
      max={max}
      ticks={{ step: 1000, minor: 4 }}
      tickFormat={{ multiplier: 0.001, maxDecimals: 0 }}
      format={{ decimals: 0 }}
      label="rpm"
      variant="needle"
      face
      zones={[
        { from: redline - 1000, to: redline, color: 'warn' },
        { from: redline, to: max, color: 'bad' },
      ]}
      animate={{ easing: 'overshoot', duration: 700 }}
      {...props}
    />
  );
}
