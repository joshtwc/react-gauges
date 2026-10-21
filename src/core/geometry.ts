/**
 * Geometry helpers.
 *
 * Angle convention used throughout the library: degrees, 0° = 12 o'clock,
 * positive = clockwise (the same way a compass or a clock face reads).
 */

export const DEG = Math.PI / 180;

export interface Point {
  x: number;
  y: number;
}

/** Round to a fixed number of decimals to keep SVG path strings compact. */
export function r3(n: number): number {
  return Math.round(n * 1000) / 1000 + 0; // + 0 turns -0 into 0
}

/** Point on a circle at `deg` (0 = up, clockwise). */
export function polar(cx: number, cy: number, radius: number, deg: number): Point {
  const a = deg * DEG;
  return { x: r3(cx + radius * Math.sin(a)), y: r3(cy - radius * Math.cos(a)) };
}

/** Open arc path from `start` to `end` degrees. Handles either direction and full circles. */
export function arcPath(cx: number, cy: number, radius: number, start: number, end: number): string {
  const delta = end - start;
  if (Math.abs(delta) < 1e-6 || radius <= 0) return '';
  if (Math.abs(delta) >= 360) {
    // A single SVG arc can't draw a full circle – split it in two halves.
    const mid = start + delta / 2;
    return `${arcPath(cx, cy, radius, start, mid)} ${arcSegment(cx, cy, radius, mid, start + delta)}`;
  }
  const p0 = polar(cx, cy, radius, start);
  return `M ${p0.x} ${p0.y} ${arcSegment(cx, cy, radius, start, end)}`;
}

function arcSegment(cx: number, cy: number, radius: number, start: number, end: number): string {
  const p1 = polar(cx, cy, radius, end);
  const delta = end - start;
  const large = Math.abs(delta) > 180 ? 1 : 0;
  const sweep = delta > 0 ? 1 : 0;
  return `A ${r3(radius)} ${r3(radius)} 0 ${large} ${sweep} ${p1.x} ${p1.y}`;
}

/** Closed annular sector (a thick arc) – used for zones and segmented rings. */
export function sectorPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string {
  const delta = end - start;
  if (Math.abs(delta) < 1e-6) return '';
  if (Math.abs(delta) >= 360) {
    // Full ring: two concentric circles with even-odd fill.
    return `${circlePath(cx, cy, outer)} ${circlePath(cx, cy, inner)}`;
  }
  const o0 = polar(cx, cy, outer, start);
  const o1 = polar(cx, cy, outer, end);
  const i0 = polar(cx, cy, inner, end);
  const i1 = polar(cx, cy, inner, start);
  const large = Math.abs(delta) > 180 ? 1 : 0;
  const sweep = delta > 0 ? 1 : 0;
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${outer} ${outer} 0 ${large} ${sweep} ${o1.x} ${o1.y}`,
    `L ${i0.x} ${i0.y}`,
    `A ${inner} ${inner} 0 ${large} ${1 - sweep} ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ');
}

export function circlePath(cx: number, cy: number, radius: number): string {
  return `M ${r3(cx - radius)} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0 Z`;
}

/**
 * Vertical extent (min/max y) of a circle of `radius` swept from `start` to `end`.
 * Used to crop the viewBox of partial dials (e.g. a semicircle has no lower half).
 */
export function sweepExtent(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const angles = [lo, hi];
  for (let a = Math.ceil(lo / 90) * 90; a <= hi; a += 90) angles.push(a);
  const pts = angles.map((a) => polar(cx, cy, radius, a));
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}

/** Text-anchor that makes a label sit outside/inside a circle at a given angle. */
export function anchorForAngle(deg: number): 'start' | 'middle' | 'end' {
  const s = Math.sin(deg * DEG);
  if (Math.abs(s) < 0.3) return 'middle';
  return s > 0 ? 'start' : 'end';
}

/** Normalise any angle into [0, 360). */
export function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
