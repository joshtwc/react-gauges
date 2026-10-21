import { useAnimatedNumber } from '../core/animation';
import { cx, GaugeFrame } from '../core/frame';
import { createFormatter, type FormatInput } from '../core/format';
import { anchorForAngle, DEG, polar, wrap360 } from '../core/geometry';
import { V } from '../core/theme';
import type { CommonGaugeProps } from '../core/types';
import { resolveColor, type Marker } from '../core/zones';

export type CompassSlot =
  | 'bezel'
  | 'card'
  | 'ticks'
  | 'cardinals'
  | 'degrees'
  | 'needle'
  | 'lubber'
  | 'value'
  | 'cardinal'
  | 'label'
  | 'markers';

const POINTS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/** Name of the compass point nearest to `deg` (4, 8 or 16-point rose). */
export function headingToCardinal(deg: number, points: 4 | 8 | 16 = 16): string {
  const step = 16 / points;
  const idx = Math.round(wrap360(deg) / (360 / points)) % points;
  return POINTS_16[idx * step];
}

export interface CompassProps extends CommonGaugeProps<CompassSlot> {
  /** Heading in degrees (0 = north, clockwise). Any number; it is wrapped to 0–360. */
  heading: number;
  /**
   * `'card'` – the rose rotates so the heading is under the lubber line at the top (like a ship's compass).
   * `'needle'` – the rose is fixed and a needle points at the heading (default).
   */
  mode?: 'needle' | 'card';
  /** Magnetic declination added to `heading` (east positive). */
  declination?: number;
  /** Bearings to show on the rose, e.g. a destination or wind direction. `value` is the bearing in degrees. */
  markers?: Marker[];
  /** Readout: `'degrees'`, `'cardinal'`, `'both'` (default) or `'none'`. */
  readout?: 'degrees' | 'cardinal' | 'both' | 'none';
  /** Resolution of the cardinal readout (default 16). */
  cardinalPoints?: 4 | 8 | 16;
  /** Degree readout format (default `'0°'`). */
  format?: FormatInput;
  /** Draw degree numbers every 30° (default true). */
  showDegreeLabels?: boolean;
  /** Draw NE/SE/SW/NW (default true). */
  showIntercardinals?: boolean;
  /** In card mode: keep letters upright (default) or radial like a real card. */
  labelOrientation?: 'upright' | 'radial';
  /** Needle style (needle mode). */
  needleStyle?: 'classic' | 'arrow' | 'minimal';
}

const C = 100;
const R = 94;

/** Compass rose with rotating-card or needle modes and bearing markers. */
export function Compass(props: CompassProps) {
  const {
    mode = 'needle',
    readout = 'both',
    cardinalPoints = 16,
    showDegreeLabels = true,
    showIntercardinals = true,
    labelOrientation = 'upright',
    needleStyle = 'classic',
    markers = [],
    classNames = {},
  } = props;
  const target = (props.heading ?? 0) + (props.declination ?? 0);
  const display = useAnimatedNumber(target, props.animate ?? { duration: 800, easing: 'easeInOut' }, { circular: true });
  const fmt = createFormatter(props.format, { decimals: 0, unit: '°' });
  const decimals = typeof props.format === 'object' && props.format.decimals !== undefined ? props.format.decimals : 0;
  const snapped = (v: number) => {
    const f = 10 ** decimals;
    return wrap360(Math.round(wrap360(v) * f) / f);
  };
  const shown = snapped(display);
  const ctx = { min: 0, max: 360, ratio: shown / 360 };
  const degText = fmt(shown, ctx);
  const cardText = headingToCardinal(shown, cardinalPoints);
  const ariaText = `Heading ${fmt(snapped(target), ctx)} ${headingToCardinal(snapped(target), cardinalPoints)}`;

  const cardRotation = mode === 'card' ? -display : 0;
  // Room outside the bezel for bearing labels, so they stay inside the gauge's box.
  const labelPad = markers.some((m) => m.label) ? 12 + Math.max(...markers.map((m) => (m.label ?? '').length)) * 5 : markers.length ? 8 : 0;
  const centerReadout = mode === 'card';
  // Push the readout down when a bearing label could hang below the bezel.
  const readoutShift = !centerReadout && readout !== 'none' && markers.some((m) => m.label) ? 14 : 0;
  const bottomPad = centerReadout ? 0 : (readout !== 'none' ? (readout === 'both' ? 42 : 26) + readoutShift : 0) + (props.label ? 16 : 0);

  // Rose ticks (in card coordinates).
  const ticks: string[] = [];
  const bigTicks: string[] = [];
  for (let a = 0; a < 360; a += 5) {
    const major = a % 30 === 0;
    const mid = a % 10 === 0;
    const len = major ? 11 : mid ? 7 : 4;
    const p0 = polar(C, C, R - 6, a);
    const p1 = polar(C, C, R - 6 - len, a);
    (major ? bigTicks : ticks).push(`M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`);
  }

  const upright = (x: number, y: number) =>
    mode === 'card' && labelOrientation === 'upright' ? `rotate(${display} ${x} ${y})` : undefined;
  const radial = (a: number, x: number, y: number) =>
    mode === 'card' && labelOrientation === 'radial' ? `rotate(${a} ${x} ${y})` : undefined;

  const cardinals: Array<[string, number, boolean]> = [
    ['N', 0, true],
    ['E', 90, true],
    ['S', 180, true],
    ['W', 270, true],
  ];
  if (showIntercardinals) cardinals.push(['NE', 45, false], ['SE', 135, false], ['SW', 225, false], ['NW', 315, false]);

  const needle = (() => {
    if (mode !== 'needle') return null;
    const len = R - 26;
    const w = needleStyle === 'minimal' ? 3 : 9;
    const north = resolveColor('bad');
    if (needleStyle === 'arrow') {
      return (
        <g transform={`rotate(${display} ${C} ${C})`} className={cx('rg-needle', classNames.needle)}>
          <line x1={C} y1={C + len * 0.7} x2={C} y2={C - len + 10} stroke={V.needle} strokeWidth={3} strokeLinecap="round" />
          <path d={`M ${C - 9} ${C - len + 14} L ${C} ${C - len} L ${C + 9} ${C - len + 14} Z`} fill={V.needle} />
          <path d={`M ${C - 6} ${C + len * 0.7 + 4} L ${C} ${C + len * 0.7 - 6} L ${C + 6} ${C + len * 0.7 + 4}`} fill="none" stroke={V.needle} strokeWidth={2} />
        </g>
      );
    }
    return (
      <g transform={`rotate(${display} ${C} ${C})`} className={cx('rg-needle', classNames.needle)}>
        <path d={`M ${C - w / 2} ${C} L ${C} ${C - len} L ${C + w / 2} ${C} Z`} fill={`var(--rg-needle, ${north})`} />
        <path d={`M ${C - w / 2} ${C} L ${C} ${C + len} L ${C + w / 2} ${C} Z`} fill={V.muted} />
        <circle cx={C} cy={C} r={needleStyle === 'minimal' ? 3 : 5} fill={V.hub} />
      </g>
    );
  })();

  return (
    <GaugeFrame
      x={-labelPad}
      y={-labelPad}
      width={200 + labelPad * 2}
      height={200 + bottomPad + labelPad * 2}
      defaultSize={220}
      size={props.size}
      className={cx(classNames.root, props.className)}
      svgClassName={classNames.svg}
      style={props.style}
      theme={props.theme}
      id={props.id}
      role="img"
      ariaLabel={props.ariaLabel ?? (props.label ? `${props.label}: ${ariaText}` : ariaText)}
      valueText={ariaText}
    >
      {/* Bezel */}
      <circle cx={C} cy={C} r={R} fill={V.face} stroke={V.faceBorder} strokeWidth={2} className={classNames.bezel} />

      {/* Card */}
      <g transform={`rotate(${cardRotation} ${C} ${C})`} className={cx('rg-card', classNames.card)}>
        <path d={ticks.join(' ')} stroke={V.tick} strokeWidth={1} className={classNames.ticks} />
        <path d={bigTicks.join(' ')} stroke={V.text} strokeWidth={2} strokeLinecap="round" className={classNames.ticks} />
        {cardinals.map(([t, a, primary]) => {
          const p = polar(C, C, primary ? R - 30 : R - 29, a);
          return (
            <text
              key={t}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={primary ? 16 : 9}
              fontWeight={primary ? 700 : 600}
              fill={t === 'N' ? `var(--rg-north, ${resolveColor('bad')})` : primary ? V.text : V.muted}
              transform={upright(p.x, p.y) ?? radial(a, p.x, p.y)}
              className={classNames.cardinals}
            >
              {t}
            </text>
          );
        })}
        {showDegreeLabels &&
          [30, 60, 120, 150, 210, 240, 300, 330].map((a) => {
            const p = polar(C, C, R - 47, a);
            return (
              <text
                key={a}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8}
                fill={V.muted}
                transform={upright(p.x, p.y) ?? radial(a, p.x, p.y)}
                className={classNames.degrees}
              >
                {a}
              </text>
            );
          })}
        {/* Bearing markers ride on the card */}
        {markers.map((m, i) => {
          const a = m.value;
          const tip = polar(C, C, R - 4, a);
          const l = polar(C, C, R + 6, a - 4);
          const r = polar(C, C, R + 6, a + 4);
          const color = resolveColor(m.color) ?? V.marker;
          // Anchor the label so it grows away from the marker, whatever the angle on screen.
          const screen = mode === 'card' ? a - display : a;
          const lp = polar(C, C, R + 10, a);
          const anchor = anchorForAngle(screen);
          const vertical = Math.cos(screen * DEG);
          const baseline = anchor !== 'middle' ? 'central' : vertical > 0 ? 'auto' : 'hanging';
          return (
            <g key={i} className={cx(classNames.markers, m.className)}>
              <path d={`M ${tip.x} ${tip.y} L ${l.x} ${l.y} L ${r.x} ${r.y} Z`} fill={color} />
              {m.label && (
                <text
                  x={lp.x}
                  y={lp.y}
                  fontSize={9}
                  textAnchor={anchor}
                  dominantBaseline={baseline}
                  fill={color}
                  transform={mode === 'card' ? `rotate(${display} ${lp.x} ${lp.y})` : undefined}
                >
                  {m.label}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Lubber line (card mode) */}
      {mode === 'card' && (
        <path
          d={`M ${C - 7} ${C - R - 6} L ${C + 7} ${C - R - 6} L ${C} ${C - R + 8} Z`}
          fill={V.needle}
          className={cx('rg-lubber', classNames.lubber)}
        />
      )}

      {needle}

      {/* Readout */}
      {readout !== 'none' && (
        <g className="rg-readout">
          {(readout === 'degrees' || readout === 'both') && (
            <text
              x={C}
              y={centerReadout ? C - (readout === 'both' ? 6 : 0) : 200 + 14 + readoutShift}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={centerReadout ? 24 : 20}
              fontFamily={V.valueFont}
              fontWeight={V.valueWeight}
              fill={V.text}
              className={cx('rg-value', classNames.value)}
            >
              {degText}
            </text>
          )}
          {(readout === 'cardinal' || readout === 'both') && (
            <text
              x={C}
              y={centerReadout ? C + (readout === 'both' ? 16 : 0) : 200 + (readout === 'both' ? 32 : 14) + readoutShift}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={readout === 'cardinal' ? 20 : 11}
              fontWeight={600}
              fill={V.muted}
              className={classNames.cardinal}
            >
              {cardText}
            </text>
          )}
        </g>
      )}
      {props.label && (
        <text
          x={C}
          y={centerReadout ? C + 32 : 200 + bottomPad - 8}
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
