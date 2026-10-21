import { useEffect, useRef, useState } from 'react';

export type EasingName = 'linear' | 'easeOut' | 'easeInOut' | 'overshoot' | 'elastic';
export type Easing = EasingName | ((t: number) => number);

export interface AnimationOptions {
  /** Duration in ms (default 700). */
  duration?: number;
  /** Easing curve (default `'easeOut'`). `'overshoot'` gives a mechanical needle feel. */
  easing?: Easing;
  /** Sweep from the range minimum on first render (default false). */
  onMount?: boolean;
  /** Skip animation when the user prefers reduced motion (default true). */
  respectReducedMotion?: boolean;
}

/** `true` = default animation, `false` = none, or an options object. */
export type AnimateInput = boolean | AnimationOptions;

export const EASINGS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  easeOut: (t) => 1 - (1 - t) ** 3,
  easeInOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  overshoot: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

export function resolveAnimation(input: AnimateInput | undefined): Required<AnimationOptions> | null {
  if (input === false) return null;
  const o = typeof input === 'object' ? input : {};
  return {
    duration: o.duration ?? 700,
    easing: o.easing ?? 'easeOut',
    onMount: o.onMount ?? false,
    respectReducedMotion: o.respectReducedMotion ?? true,
  };
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

interface AnimatedNumberOptions {
  /** Value to start from when `onMount` is enabled. */
  initial?: number;
  /** Treat the value as an angle and always take the shortest way round. */
  circular?: boolean;
}

/**
 * Tween a number towards `target` with requestAnimationFrame.
 * SSR-safe: the first render always returns a real value.
 */
export function useAnimatedNumber(target: number, animate: AnimateInput | undefined, opts: AnimatedNumberOptions = {}): number {
  const anim = resolveAnimation(animate);
  const startOnMount = !!anim?.onMount && opts.initial !== undefined;
  const [display, setDisplay] = useState(startOnMount ? (opts.initial as number) : target);
  const current = useRef(display);
  const frame = useRef<number | null>(null);

  const duration = anim?.duration;
  const easing = anim?.easing;
  const enabled = !!anim;
  const respect = anim?.respectReducedMotion;

  useEffect(() => {
    if (!Number.isFinite(target)) {
      current.current = target;
      setDisplay(target);
      return;
    }
    const from = Number.isFinite(current.current) ? current.current : target;
    let to = target;
    if (opts.circular) {
      const delta = ((((target - from) % 360) + 540) % 360) - 180;
      to = from + delta;
    }
    if (!enabled || (respect && prefersReducedMotion()) || from === to || typeof requestAnimationFrame === 'undefined') {
      current.current = to;
      setDisplay(to);
      return;
    }
    const ease = typeof easing === 'function' ? easing : EASINGS[easing ?? 'easeOut'];
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / (duration ?? 700));
      const v = from + (to - from) * ease(t);
      current.current = v;
      setDisplay(v);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, enabled, duration, easing, respect, opts.circular]);

  return display;
}
