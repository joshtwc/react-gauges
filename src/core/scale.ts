/** Numeric scale helpers: clamping, normalising and tick generation. */

export interface Range {
  min: number;
  max: number;
}

export function clamp(value: number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.min(hi, Math.max(lo, value));
}

/** Map `value` into 0..1 across [min, max] (clamped). */
export function normalize(value: number, min: number, max: number): number {
  if (max === min || !Number.isFinite(value)) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Number of decimals needed to represent `n` exactly (up to 10). */
export function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  for (let d = 0; d <= 10; d++) {
    if (Math.abs(Math.round(n * 10 ** d) - n * 10 ** d) < 1e-7) return d;
  }
  return 10;
}

function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** A "nice" step (1, 2, 2.5, 5 × 10ⁿ) that divides `span` into roughly `target` parts. */
export function niceStep(span: number, target = 5): number {
  const s = Math.abs(span);
  if (s === 0 || target <= 0) return 1;
  const raw = s / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 2.25 ? 2 : norm < 3.5 ? 2.5 : norm < 7.5 ? 5 : 10;
  return nice * mag;
}

export interface TickOptions {
  /** Hide all ticks. */
  show?: boolean;
  /** Approximate number of major intervals (a "nice" step is chosen). */
  count?: number;
  /** Exact spacing between major ticks. Takes precedence over `count`. */
  step?: number;
  /** Explicit major tick values. Takes precedence over `step` and `count`. */
  values?: number[];
  /** Minor ticks drawn between each pair of majors. `0` disables. */
  minor?: number;
  /** Show labels on major ticks (default true). */
  labels?: boolean;
  /** Only label every n-th major tick (default 1). */
  labelEvery?: number;
}

export interface Ticks {
  major: number[];
  minor: number[];
  step: number;
}

/** Generate major and minor tick values for a range. */
export function generateTicks(min: number, max: number, opts: TickOptions = {}, defaultCount = 5): Ticks {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (opts.show === false || lo === hi) return { major: [], minor: [], step: 0 };

  let major: number[];
  let step: number;
  if (opts.values && opts.values.length) {
    major = [...opts.values].filter((v) => v >= lo && v <= hi).sort((a, b) => a - b);
    step = major.length > 1 ? major[1] - major[0] : hi - lo;
  } else {
    step = opts.step && opts.step > 0 ? opts.step : niceStep(hi - lo, opts.count ?? defaultCount);
    const d = decimalsOf(step);
    major = [];
    // Guard against absurd tick counts from user input.
    const first = Math.ceil(roundTo(lo / step, 6)) * step;
    for (let v = first, i = 0; v <= hi + step * 1e-6 && i < 1000; i++, v = first + i * step) {
      major.push(roundTo(v, d + 2));
    }
  }

  const minorCount = Math.max(0, Math.floor(opts.minor ?? 0));
  const minor: number[] = [];
  if (minorCount > 0 && major.length > 0) {
    // Include partial intervals before the first and after the last major tick.
    const edges = [...major];
    const firstGap = major.length > 1 ? major[1] - major[0] : step;
    const lastGap = major.length > 1 ? major[major.length - 1] - major[major.length - 2] : step;
    edges.unshift(major[0] - firstGap);
    edges.push(major[major.length - 1] + lastGap);
    for (let i = 0; i < edges.length - 1; i++) {
      const a = edges[i];
      const b = edges[i + 1];
      const sub = (b - a) / (minorCount + 1);
      for (let k = 1; k <= minorCount; k++) {
        const v = roundTo(a + sub * k, 8);
        if (v >= lo - 1e-9 && v <= hi + 1e-9) minor.push(v);
      }
    }
  }
  return { major, minor, step };
}
