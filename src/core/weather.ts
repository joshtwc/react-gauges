/**
 * Weather condition logic for <WeatherConditions> / <WeatherIcon>.
 *
 * The input shape matches the payload published by TWC's weather-node service
 * (temperature, raining, rain_intensity, wind_speed, wind_pct, light_level,
 * summary), but every field is optional and the logic works for any station.
 * The sky classifier is a port of weather-node's `classifySkyFromLux`.
 */

/** Sky state as weather-node classifies it. */
export type SkyLevel = 'night' | 'low_sun' | 'cloudy' | 'partly_cloudy' | 'sunny';

/** Icon-level condition. */
export type WeatherCondition =
  | 'clear'
  | 'clear-night'
  | 'partly-cloudy'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'low-sun'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'thunderstorm'
  | 'fog'
  | 'wind';

/** Wind strength band: 0 calm · 1 light · 2 moderate · 3 high. */
export type WindLevel = 0 | 1 | 2 | 3;

/** A weather reading. Field names follow weather-node's payload. */
export interface WeatherReading {
  /** Air temperature (°C unless you format it otherwise). */
  temperature?: number;
  /** Precipitation sensor. */
  raining?: boolean;
  /** Rain intensity, 0–100. */
  rain_intensity?: number;
  /** Wind speed in km/h. */
  wind_speed?: number;
  /** Wind as a fraction 0–1 of the station's range (weather-node's `wind_pct`). */
  wind_pct?: number;
  /** Ambient light in lux. */
  light_level?: number;
  /** Human summary, e.g. "Partly Cloudy, light showers, moderate winds". Its first part names the sky. */
  summary?: string;
  /** Sky level, if the source provides it directly. */
  sky?: SkyLevel;
}

export interface WeatherOptions {
  /** Rain intensity bands: below [0] is drizzle, below [1] rain, else heavy (default `[33, 66]`, as on the POS). */
  rainBands?: [number, number];
  /** Precipitation at or below this temperature shows as snow (default 0). Set `-Infinity` to disable. */
  snowAtOrBelow?: number;
  /** Wind speed (km/h) mapped to 0–1 when `wind_pct` is missing (default 4.5–36.5, as in weather-node). */
  windRange?: [number, number];
  /** Latitude / longitude for classifying the sky from `light_level` (default: none – lux thresholds only). */
  latitude?: number;
  longitude?: number;
  /** Time used for the sun position (default: now). */
  now?: Date;
  /** Classifier tuning, same meaning as weather-node's SkyOptions. */
  sky?: Partial<SkyOptions>;
}

export interface SkyOptions {
  /** Clear-sky noon peak lux (default 100 000). */
  lmaxLux: number;
  /** Clear-sky curve exponent (default 1.1). */
  p: number;
  /** Clear-sky index below which it's cloudy (default 0.35). */
  cloudyCsi: number;
  /** Clear-sky index below which it's partly cloudy (default 0.75). */
  partlyCsi: number;
  /** Below this lux it's night (default 10). */
  nightLux: number;
  /** Below this sun elevation it's "low sun" (default 8°). */
  lowSunElevationDeg: number;
}

export const SKY_DEFAULTS: SkyOptions = {
  lmaxLux: 100_000,
  p: 1.1,
  cloudyCsi: 0.35,
  partlyCsi: 0.75,
  nightLux: 10,
  lowSunElevationDeg: 8,
};

export interface WeatherState {
  condition: WeatherCondition;
  sky: SkyLevel;
  night: boolean;
  wind: WindLevel;
  precipitation: 'none' | 'drizzle' | 'rain' | 'heavy' | 'snow';
  /** Readable description, e.g. "Partly cloudy, light winds". */
  label: string;
}

export const CONDITION_LABELS: Record<WeatherCondition, string> = {
  clear: 'Sunny',
  'clear-night': 'Clear night',
  'partly-cloudy': 'Partly cloudy',
  'partly-cloudy-night': 'Partly cloudy',
  cloudy: 'Cloudy',
  'low-sun': 'Low sun',
  drizzle: 'Drizzle',
  rain: 'Rain',
  'heavy-rain': 'Heavy rain',
  snow: 'Snow',
  thunderstorm: 'Thunderstorm',
  fog: 'Fog',
  wind: 'Windy',
};

const WIND_WORDS = ['', 'light winds', 'moderate winds', 'high winds'];

/* ------------------------------------------------------------------ */
/* Sun position & sky classification (port of weather-node sky.ts)    */
/* ------------------------------------------------------------------ */

const d2r = (d: number) => (d * Math.PI) / 180;
const r2d = (r: number) => (r * 180) / Math.PI;
const mod = (n: number, m: number) => ((n % m) + m) % m;
const clampN = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Sun elevation in degrees (NOAA-style approximation – fine for classification). */
export function solarElevation(date: Date, lat: number, lon: number): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  const A = Math.floor((14 - month) / 12);
  const y = year + 4800 - A;
  const m = month + 12 * A - 3;
  const JDN = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  const JD = JDN + (hour - 12) / 24 + minute / 1440 + second / 86400;
  const T = (JD - 2451545.0) / 36525.0;

  const L0 = mod(280.46646 + T * (36000.76983 + 0.0003032 * T), 360);
  const M = mod(357.52911 + T * (35999.05029 - 0.0001537 * T), 360);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const Mr = d2r(M);
  const C = (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(Mr) + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) + 0.000289 * Math.sin(3 * Mr);
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(d2r(omega));
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(d2r(omega));
  const decl = Math.asin(Math.sin(d2r(eps)) * Math.sin(d2r(lambda)));

  const yT = Math.tan(d2r(eps) / 2) ** 2;
  const L0r = d2r(L0);
  const Etime =
    4 *
    r2d(
      yT * Math.sin(2 * L0r) -
        2 * e * Math.sin(Mr) +
        4 * e * yT * Math.sin(Mr) * Math.cos(2 * L0r) -
        0.5 * yT * yT * Math.sin(4 * L0r) -
        1.25 * e * e * Math.sin(2 * Mr),
    );
  const trueSolarTime = mod(hour * 60 + minute + second / 60 + Etime + 4 * lon, 1440);
  const haDeg = trueSolarTime / 4 < 0 ? trueSolarTime / 4 + 180 : trueSolarTime / 4 - 180;
  const latR = d2r(lat);
  const cosZen = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(d2r(haDeg));
  return 90 - r2d(Math.acos(clampN(cosZen, -1, 1)));
}

/**
 * Classify the sky from a light reading.
 * With latitude/longitude it compares lux with the expected clear-sky lux for the
 * sun's height (weather-node's method). Without them it falls back to fixed lux bands.
 */
export function classifySky(lux: number, opts: Pick<WeatherOptions, 'latitude' | 'longitude' | 'now' | 'sky'> = {}): SkyLevel {
  const o = { ...SKY_DEFAULTS, ...opts.sky };
  if (!Number.isFinite(lux) || lux < o.nightLux) return 'night';
  if (opts.latitude === undefined || opts.longitude === undefined) {
    // No sun position: rough daylight bands for an outdoor sensor.
    if (lux < 1_000) return 'low_sun';
    if (lux < o.lmaxLux * o.cloudyCsi * 0.5) return 'cloudy';
    if (lux < o.lmaxLux * o.partlyCsi * 0.5) return 'partly_cloudy';
    return 'sunny';
  }
  const elev = solarElevation(opts.now ?? new Date(), opts.latitude, opts.longitude);
  if (elev <= 0) return 'night';
  const expected = clampN(o.lmaxLux * Math.sin(d2r(clampN(elev, 0, 90))) ** o.p, 0, o.lmaxLux);
  if (elev < o.lowSunElevationDeg) return 'low_sun';
  const csi = expected > 1 ? lux / expected : 0;
  return csi < o.cloudyCsi ? 'cloudy' : csi < o.partlyCsi ? 'partly_cloudy' : 'sunny';
}

/** Read the sky level from a weather-node style summary ("Partly Cloudy, light showers…"). */
export function skyFromSummary(summary: string | undefined): SkyLevel | undefined {
  if (!summary) return undefined;
  const head = summary.split(',')[0].trim().toLowerCase().replace(/[\s-]+/g, '_');
  const known: Record<string, SkyLevel> = {
    sunny: 'sunny',
    clear: 'sunny',
    partly_cloudy: 'partly_cloudy',
    cloudy: 'cloudy',
    overcast: 'cloudy',
    night: 'night',
    low_sun: 'low_sun',
  };
  return known[head];
}

/** weather-node's wind mapping: km/h → 0–1 across the station's range. */
export function windFraction(speed: number | undefined, range: [number, number] = [4.5, 36.5]): number {
  if (speed === undefined || !Number.isFinite(speed)) return 0;
  const [lo, hi] = range;
  return (clampN(speed, lo, hi) - lo) / (hi - lo || 1);
}

/** Wind band from a 0–1 fraction (quarters, as weather-node's summary). */
export function windLevel(fraction: number): WindLevel {
  return Math.min(3, Math.max(0, Math.floor(fraction / 0.25))) as WindLevel;
}

/** Work out the icon condition and a description from a reading. */
export function weatherState(reading: WeatherReading = {}, opts: WeatherOptions = {}): WeatherState {
  const sky: SkyLevel =
    reading.sky ??
    skyFromSummary(reading.summary) ??
    (reading.light_level !== undefined ? classifySky(reading.light_level, opts) : 'cloudy');
  const night = sky === 'night';
  const wind = windLevel(reading.wind_pct ?? windFraction(reading.wind_speed, opts.windRange));

  let precipitation: WeatherState['precipitation'] = 'none';
  if (reading.raining) {
    const [drizzleBelow, rainBelow] = opts.rainBands ?? [33, 66];
    const i = reading.rain_intensity ?? 0;
    const cold = reading.temperature !== undefined && reading.temperature <= (opts.snowAtOrBelow ?? 0);
    precipitation = cold ? 'snow' : i < drizzleBelow ? 'drizzle' : i < rainBelow ? 'rain' : 'heavy';
  }

  const skyCondition: Record<SkyLevel, WeatherCondition> = {
    sunny: 'clear',
    partly_cloudy: 'partly-cloudy',
    cloudy: 'cloudy',
    night: 'clear-night',
    low_sun: 'low-sun',
  };
  const precipCondition: Record<Exclude<WeatherState['precipitation'], 'none'>, WeatherCondition> = {
    drizzle: 'drizzle',
    rain: 'rain',
    heavy: 'heavy-rain',
    snow: 'snow',
  };
  const condition = precipitation === 'none' ? skyCondition[sky] : precipCondition[precipitation];

  const parts = [CONDITION_LABELS[skyCondition[sky]]];
  if (precipitation !== 'none') parts.push(CONDITION_LABELS[precipCondition[precipitation]].toLowerCase());
  if (wind > 0) parts.push(WIND_WORDS[wind]);
  return { condition, sky, night, wind, precipitation, label: reading.summary?.trim() || parts.join(', ') };
}
