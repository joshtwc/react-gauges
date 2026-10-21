import type { CSSProperties, ReactNode } from 'react';
import { resolveAnimation, type AnimateInput } from '../core/animation';
import { cx, useSafeId } from '../core/frame';
import { useReducedMotion } from '../core/ranged';
import type { WeatherCondition, WindLevel } from '../core/weather';

/* ------------------------------------------------------------------ */
/* Geometry (64 × 64 viewBox)                                          */
/* ------------------------------------------------------------------ */

type Circle = [cx: number, cy: number, r: number];

/** Upper intersection of two overlapping circles. */
function upperIntersection([x0, y0, r0]: Circle, [x1, y1, r1]: Circle): [number, number] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - a * a));
  const mx = x0 + (a * dx) / d;
  const my = y0 + (a * dy) / d;
  const p1: [number, number] = [mx + (h * dy) / d, my - (h * dx) / d];
  const p2: [number, number] = [mx - (h * dy) / d, my + (h * dx) / d];
  return p1[1] < p2[1] ? p1 : p2;
}

const f = (n: number) => Math.round(n * 100) / 100;

/** Clockwise arc on circle `c` from point a to point b. */
function arcTo(c: Circle, a: [number, number], b: [number, number]): string {
  const [cxx, cyy, r] = c;
  const t0 = Math.atan2(a[1] - cyy, a[0] - cxx);
  const t1 = Math.atan2(b[1] - cyy, b[0] - cxx);
  const travel = ((t1 - t0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return `A ${r} ${r} 0 ${travel > Math.PI ? 1 : 0} 1 ${f(b[0])} ${f(b[1])}`;
}

/**
 * Cloud outline from puffs sorted left → right. The first and last puff must share
 * a bottom line (cy + r), which becomes the cloud's flat base.
 */
export function cloudPath(puffs: Circle[]): string {
  const first = puffs[0];
  const last = puffs[puffs.length - 1];
  const start: [number, number] = [first[0], first[1] + first[2]];
  const end: [number, number] = [last[0], last[1] + last[2]];
  const joins = puffs.slice(0, -1).map((p, i) => upperIntersection(p, puffs[i + 1]));
  const parts = [`M ${f(start[0])} ${f(start[1])}`];
  puffs.forEach((p, i) => {
    const from = i === 0 ? start : joins[i - 1];
    const to = i === puffs.length - 1 ? end : joins[i];
    parts.push(arcTo(p, from, to));
  });
  parts.push('Z');
  return parts.join(' ');
}

const CLOUD = {
  big: cloudPath([[20, 40, 8], [31, 32, 12], [43, 38, 10]]),
  back: cloudPath([[37, 28, 6], [45, 22, 9], [53, 27, 7]]),
  partial: cloudPath([[27, 44, 7], [37, 37, 10], [47, 43, 8]]),
  precip: cloudPath([[19, 32, 8], [31, 24, 12], [44, 30, 10]]),
  fog: cloudPath([[23, 24, 6], [32, 19, 9], [42, 23, 7]]),
};

function rays(cx0: number, cy0: number, r0: number, r1: number, angles: number[]): string {
  return angles
    .map((a) => {
      const t = (a * Math.PI) / 180;
      return `M ${f(cx0 + r0 * Math.sin(t))} ${f(cy0 - r0 * Math.cos(t))} L ${f(cx0 + r1 * Math.sin(t))} ${f(cy0 - r1 * Math.cos(t))}`;
    })
    .join(' ');
}
const ALL_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Which layers each condition shows. */
const LAYERS: Record<WeatherCondition, string[]> = {
  clear: ['sun'],
  'clear-night': ['moon', 'stars'],
  'partly-cloudy': ['sunBehind', 'cloudPartial'],
  'partly-cloudy-night': ['moonBehind', 'cloudPartial'],
  cloudy: ['cloudBack', 'cloudBig'],
  'low-sun': ['sunLow'],
  drizzle: ['cloudPrecip', 'drizzle'],
  rain: ['cloudPrecip', 'rain'],
  'heavy-rain': ['cloudPrecipDark', 'heavy'],
  snow: ['cloudPrecip', 'snow'],
  thunderstorm: ['cloudPrecipDark', 'bolt', 'rain'],
  fog: ['cloudFog', 'fog'],
  wind: ['windBig'],
};

export interface WeatherIconProps {
  condition: WeatherCondition;
  /** Wind streaks drawn over the icon (0–3). */
  wind?: WindLevel;
  /** `'overlay'` adds streaks (default), `'replace'` shows the wind icon when wind ≥ 2 (like the POS), `'none'` ignores wind. */
  windStyle?: 'overlay' | 'replace' | 'none';
  /** `'color'` (default): sun, rain and bolt in colour. `'mono'`: everything in the current text colour. */
  iconStyle?: 'color' | 'mono';
  /** Px number or CSS length (default 64). */
  size?: number | string;
  /** Ambient motion and cross-fades (default true; off for reduced-motion users). */
  animate?: AnimateInput;
  className?: string;
  style?: CSSProperties;
  /** Accessible name. Omit when a parent already describes the weather. */
  title?: string;
}

/** Stand-alone animated weather icon. */
export function WeatherIcon(props: WeatherIconProps) {
  const { condition, wind = 0, windStyle = 'overlay', iconStyle = 'color' } = props;
  const reduced = useReducedMotion();
  const anim = resolveAnimation(props.animate);
  const motion = !!anim && !(anim.respectReducedMotion && reduced);
  const id = useSafeId('rg-wx');
  const mono = iconStyle === 'mono';

  const shown = new Set(windStyle === 'replace' && wind >= 2 && !condition.includes('rain') && condition !== 'snow' && condition !== 'thunderstorm' ? LAYERS.wind : LAYERS[condition]);
  // With rain or snow the wind shows as slanted drops instead of streaks (which would sit on the drops).
  const precipitating = ['drizzle', 'rain', 'heavy-rain', 'snow', 'thunderstorm'].includes(condition);
  const overlayWind = windStyle === 'overlay' && condition !== 'wind' && !precipitating ? wind : 0;

  const stroke = 'var(--rg-icon-stroke, currentColor)';
  const tint = (v: string, fallback: string) => (mono ? 'color-mix(in srgb, currentColor 16%, transparent)' : `var(${v}, ${fallback})`);
  const sunFill = tint('--rg-sun', '#f2b134');
  const cloudFill = mono ? 'color-mix(in srgb, currentColor 10%, transparent)' : 'var(--rg-cloud, color-mix(in srgb, currentColor 10%, transparent))';
  const cloudDark = mono ? 'color-mix(in srgb, currentColor 28%, transparent)' : 'var(--rg-cloud-dark, color-mix(in srgb, currentColor 30%, transparent))';
  const rainStroke = mono ? 'currentColor' : 'var(--rg-rain, var(--rg-cold, #5b8fd6))';
  const moonFill = tint('--rg-moon', 'color-mix(in srgb, #f2e6b8 70%, transparent)');
  const boltFill = tint('--rg-bolt', '#f2b134');
  const fade = motion ? `opacity ${anim!.duration}ms ease` : undefined;

  const layer = (name: string, children: ReactNode, extra?: CSSProperties) => (
    <g
      key={name}
      className={`rg-wx-${name}`}
      style={{ opacity: shown.has(name) ? 1 : 0, transition: fade, ...extra }}
      aria-hidden="true"
    >
      {children}
    </g>
  );

  const drift = (dx: number, dur: number) =>
    motion ? <animateTransform attributeName="transform" type="translate" values={`0 0; ${dx} 0; 0 0`} dur={`${dur}s`} repeatCount="indefinite" /> : null;

  const drops = (xs: number[], y0: number, len: number, width: number, dur: number) => {
    const slant = -1.5 - wind * 1.5; // wind blows the rain
    return xs.map((x, i) => (
      <g key={x}>
        <path d={`M ${x} ${y0} l ${slant * (len / 8)} ${len}`} stroke={rainStroke} strokeWidth={width} strokeLinecap="round" fill="none">
          {motion && (
            <>
              <animateTransform attributeName="transform" type="translate" values={`0 -3; ${slant * 0.6} 4`} dur={`${dur}s`} begin={`${(i * dur) / xs.length}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;1;0" dur={`${dur}s`} begin={`${(i * dur) / xs.length}s`} repeatCount="indefinite" />
            </>
          )}
        </path>
      </g>
    ));
  };

  const flake = (x: number, y: number, r: number, i: number) => (
    <g key={i} stroke={stroke} strokeWidth={1.6} strokeLinecap="round">
      <path d={`M ${x - r} ${y} H ${x + r} M ${x - r / 2} ${y - r * 0.87} L ${x + r / 2} ${y + r * 0.87} M ${x + r / 2} ${y - r * 0.87} L ${x - r / 2} ${y + r * 0.87}`} />
      {motion && <animateTransform attributeName="transform" type="translate" values="0 -2; 1.5 2; 0 -2" dur={`${3 + i * 0.6}s`} repeatCount="indefinite" />}
    </g>
  );

  const streak = (y: number, x0: number, len: number, curl: boolean, i: number) => (
    <path
      key={i}
      d={curl ? `M ${x0} ${y} H ${x0 + len} a 3.5 3.5 0 1 0 -3.5 -3.5` : `M ${x0} ${y} H ${x0 + len}`}
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeDasharray={motion ? '28 6' : undefined}
    >
      {motion && <animate attributeName="stroke-dashoffset" values="34;0" dur={`${1.6 + i * 0.3}s`} repeatCount="indefinite" />}
    </path>
  );

  const common = { stroke, strokeWidth: 2, strokeLinejoin: 'round' as const };

  return (
    <svg
      viewBox="0 0 64 64"
      width={typeof props.size === 'number' ? props.size : props.size ?? 64}
      className={cx('rg-weather-icon', props.className)}
      style={{ display: 'block', overflow: 'visible', ...props.style, ...(typeof props.size === 'string' ? { width: props.size, height: 'auto' } : {}) }}
      data-condition={condition}
      role={props.title ? 'img' : undefined}
      aria-label={props.title}
      aria-hidden={props.title ? undefined : true}
      focusable="false"
    >
      <defs>
        {/* The sun/moon behind the partial cloud is cut out by the cloud, so cloud fills can stay translucent. */}
        <mask id={`${id}-behind`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d={CLOUD.partial} fill="#000" stroke="#000" strokeWidth={5} />
        </mask>
        <mask id={`${id}-back`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d={CLOUD.big} fill="#000" stroke="#000" strokeWidth={5} />
        </mask>
        <mask id={`${id}-moon`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <circle cx={39} cy={26} r={10} fill="#000" />
        </mask>
        <mask id={`${id}-moon-s`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <circle cx={29} cy={19.5} r={7.5} fill="#000" />
        </mask>
        <clipPath id={`${id}-horizon`}>
          <rect x="0" y="0" width="64" height="44" />
        </clipPath>
      </defs>

      {layer(
        'sun',
        <>
          <circle cx={32} cy={32} r={10} fill={sunFill} {...common} />
          <path d={rays(32, 32, 15, 21, ALL_RAYS)} stroke={stroke} strokeWidth={2.2} strokeLinecap="round">
            {motion && <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="40s" repeatCount="indefinite" />}
          </path>
        </>,
      )}
      {layer(
        'sunBehind',
        <g mask={`url(#${id}-behind)`}>
          <circle cx={23} cy={24} r={8} fill={sunFill} {...common} />
          <path d={rays(23, 24, 12, 16.5, ALL_RAYS)} stroke={stroke} strokeWidth={2} strokeLinecap="round">
            {motion && <animateTransform attributeName="transform" type="rotate" from="0 23 24" to="360 23 24" dur="40s" repeatCount="indefinite" />}
          </path>
        </g>,
      )}
      {layer(
        'sunLow',
        <>
          <g clipPath={`url(#${id}-horizon)`}>
            <circle cx={32} cy={44} r={10} fill={sunFill} {...common} />
          </g>
          <path d={rays(32, 44, 14, 20, [-90, -45, 0, 45, 90])} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
          <path d="M 8 44 H 56 M 16 50 H 48 M 24 55.5 H 40" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        </>,
      )}
      {layer('moon', <circle cx={32} cy={32} r={13} fill={moonFill} {...common} mask={`url(#${id}-moon)`} />)}
      {layer(
        'moonBehind',
        <g mask={`url(#${id}-behind)`}>
          <circle cx={23} cy={24} r={9} fill={moonFill} {...common} mask={`url(#${id}-moon-s)`} />
        </g>,
      )}
      {layer(
        'stars',
        <g fill={mono ? 'currentColor' : 'var(--rg-sun, #f2b134)'}>
          {[
            [49, 17, 3],
            [53, 34, 2.2],
            [44, 47, 1.6],
          ].map(([x, y, r], i) => (
            <path key={i} d={`M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`}>
              {motion && <animate attributeName="opacity" values="1;0.35;1" dur={`${2.4 + i}s`} repeatCount="indefinite" />}
            </path>
          ))}
        </g>,
      )}
      {layer(
        'cloudBack',
        <g mask={`url(#${id}-back)`}>
          <path d={CLOUD.back} fill={cloudFill} {...common} opacity={0.75}>
            {drift(-1.2, 7)}
          </path>
        </g>,
      )}
      {layer('cloudBig', <path d={CLOUD.big} fill={cloudFill} {...common}>{drift(1.2, 6)}</path>)}
      {layer('cloudPartial', <path d={CLOUD.partial} fill={cloudFill} {...common}>{drift(1, 6)}</path>)}
      {layer('cloudPrecip', <path d={CLOUD.precip} fill={cloudFill} {...common} />)}
      {layer('cloudPrecipDark', <path d={CLOUD.precip} fill={cloudDark} {...common} />)}
      {layer('cloudFog', <path d={CLOUD.fog} fill={cloudFill} {...common} />)}
      {layer('drizzle', <>{drops([22, 32, 42], 46, 4, 2, 1.2)}</>)}
      {layer('rain', <>{drops([21, 29, 37, 45], 45, 8, 2, 0.9)}</>)}
      {layer('heavy', <>{drops([17, 24, 31, 38, 45], 44, 12, 2.4, 0.65)}</>)}
      {layer(
        'snow',
        <>
          {flake(22, 49, 3.5, 0)}
          {flake(32, 55, 3.5, 1)}
          {flake(42, 49, 3.5, 2)}
        </>,
      )}
      {layer(
        'bolt',
        <path d="M 34 38 L 27 50 L 32.5 50 L 29 60 L 40 46 L 34.5 46 L 38 38 Z" fill={boltFill} {...common}>
          {motion && <animate attributeName="opacity" values="1;1;0.25;1;1" keyTimes="0;0.7;0.75;0.8;1" dur="2.8s" repeatCount="indefinite" />}
        </path>,
      )}
      {layer(
        'fog',
        <g stroke={stroke} strokeWidth={2} strokeLinecap="round" fill="none">
          <path d="M 12 37 H 52 M 16 44 H 48 M 12 51 H 52">{drift(2, 5)}</path>
        </g>,
      )}
      {layer(
        'windBig',
        <>
          {streak(26, 10, 34, true, 0)}
          {streak(36, 6, 44, false, 1)}
          {streak(46, 12, 28, true, 2)}
        </>,
      )}

      {/* Wind overlay: one to three streaks, bottom-left. */}
      <g className="rg-wx-wind" style={{ opacity: overlayWind > 0 ? 1 : 0, transition: fade }} aria-hidden="true">
        {overlayWind >= 1 && streak(56, 3, 17, true, 0)}
        {overlayWind >= 2 && streak(61, 7, 20, false, 1)}
        {overlayWind >= 3 && streak(51, 1, 11, false, 2)}
      </g>
    </svg>
  );
}
