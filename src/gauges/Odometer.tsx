import type { CSSProperties } from 'react';
import { cx } from '../core/frame';
import { createFormatter, parseFormatPattern } from '../core/format';
import { statusTextColor, useLimitStatus } from '../core/limits';
import { useReducedMotion } from '../core/ranged';
import { clamp, normalize } from '../core/scale';
import { resolveAnimation } from '../core/animation';
import { themeToVars, useGaugeTheme, V } from '../core/theme';
import type { CommonGaugeProps, RangedGaugeProps } from '../core/types';
import { resolveColor, zoneAt } from '../core/zones';

export type OdometerSlot = 'digit' | 'decimalDigit' | 'separator' | 'unit' | 'label';

export interface OdometerProps extends CommonGaugeProps<OdometerSlot>, Omit<RangedGaugeProps, 'ticks' | 'tickFormat' | 'markers'> {
  /** Pad the integer part with leading zeros to this many digits. */
  minDigits?: number;
  /** `'plain'` rolling numbers or `'mechanical'` boxed wheels (default). */
  variant?: 'plain' | 'mechanical';
  /** Highlight decimal wheels like a classic trip meter (default true for mechanical). */
  highlightDecimals?: boolean;
  /** Clamp to min/max (default false: odometers usually run free). */
  clampToRange?: boolean;
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Rolling-digit counter. `size` is the digit height in px (default 36).
 * Uses CSS transforms, so it animates smoothly and respects reduced motion.
 */
export function Odometer(props: OdometerProps) {
  const { variant = 'mechanical', minDigits = 0, classNames = {}, clampToRange = false } = props;
  const highlight = props.highlightDecimals ?? variant === 'mechanical';
  const theme = useGaugeTheme(props.theme);
  const reduced = useReducedMotion();
  const anim = resolveAnimation(props.animate);
  const duration = anim && !(anim.respectReducedMotion && reduced) ? anim.duration + 200 : 0;
  const min = props.min ?? 0;
  const max = props.max ?? 999999;
  const value = clampToRange ? clamp(props.value, min, max) : props.value;
  const fmt = createFormatter(props.format, { maxDecimals: 0 });
  const ctx = { min, max, ratio: normalize(value, min, max) };
  let text = fmt(value, ctx);

  // How many trailing digits are decimals (drives padding and highlighting).
  const fo = typeof props.format === 'string' ? parseFormatPattern(props.format) : typeof props.format === 'object' ? props.format : {};
  const decimals = fo.decimals ?? fo.minDecimals ?? 0;
  if (minDigits > 0) {
    const intDigits = (text.match(/\d/g) || []).length - decimals;
    if (intDigits < minDigits) text = text.replace(/\d/, '0'.repeat(minDigits - intDigits) + '$&');
  }

  const status = useLimitStatus(props.value, props.limits, props.onStatusChange);
  const zone = props.zoneColor === false ? undefined : zoneAt(value, props.zones);
  const alert =
    status.status !== 'ok' && props.zoneColor !== false && props.limits?.colorReadout !== false ? statusTextColor(status.status) : undefined;
  const color = resolveColor(props.color) ?? alert ?? (zone ? resolveColor(zone.color) : undefined);
  const blink = status.status === 'alarm' && !!props.limits?.blink && !reduced;
  const fontSize = typeof props.size === 'number' ? props.size : props.size ? undefined : 36;

  const chars = Array.from(text);
  const digitIdx = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
  const decimalSet = new Set(decimals > 0 ? digitIdx.slice(-decimals) : []);
  const rootStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'stretch',
    gap: variant === 'mechanical' ? '0.08em' : 0,
    fontSize: fontSize ?? props.size,
    lineHeight: 1,
    fontFamily: V.valueFont,
    fontWeight: V.valueWeight as CSSProperties['fontWeight'],
    fontVariantNumeric: 'tabular-nums',
    color: color ?? V.text,
  };

  const wheelStyle = (digit: number, isDecimal: boolean): CSSProperties => ({
    display: 'inline-block',
    height: '1.15em',
    overflow: 'hidden',
    position: 'relative',
    width: '0.68em',
    textAlign: 'center',
    ...(variant === 'mechanical'
      ? {
          background: isDecimal && highlight ? 'var(--rg-odometer-decimal-bg, var(--rg-bad, #c2463d))' : 'var(--rg-odometer-bg, #1c2230)',
          color: 'var(--rg-odometer-fg, #f5f5f0)',
          borderRadius: '0.12em',
          boxShadow: 'inset 0 0.18em 0.2em rgba(0,0,0,.45), inset 0 -0.18em 0.2em rgba(0,0,0,.45)',
          width: '0.78em',
        }
      : {}),
    ['--d' as string]: digit,
  });

  return (
    <div
      id={props.id}
      className={cx('rg-root rg-odometer', classNames.root, props.className)}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, ...themeToVars(theme), ...props.style }}
      data-status={props.limits ? status.status : undefined}
      data-limit={status.limit}
      role="meter"
      aria-label={props.ariaLabel ?? props.label ?? 'Counter'}
      aria-valuenow={Number.isFinite(props.value) ? props.value : undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={status.label ? `${text}, ${status.label}` : text}
    >
      {blink && <style>{'@keyframes rg-blink{50%{opacity:.25}}'}</style>}
      <span style={blink ? { ...rootStyle, animation: 'rg-blink 1s steps(1,end) infinite' } : rootStyle} aria-hidden="true">
        {chars.map((ch, idx) => {
          // Key by distance from the end so digits keep their wheel when the length changes.
          const key = chars.length - idx;
          const isDecimal = decimalSet.has(idx);
          if (!/\d/.test(ch)) {
            const isUnit = /[^\d\s.,+\-−]/.test(ch);
            return (
              <span
                key={`s${key}`}
                className={isUnit ? classNames.unit : classNames.separator}
                style={{ alignSelf: 'center', padding: variant === 'mechanical' && ch === ' ' ? 0 : '0 0.02em', whiteSpace: 'pre' }}
              >
                {ch}
              </span>
            );
          }
          const d = Number(ch);
          return (
            <span key={`d${key}`} className={isDecimal ? classNames.decimalDigit ?? classNames.digit : classNames.digit} style={wheelStyle(d, isDecimal)}>
              <span
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  transform: `translateY(${-d * 1.15}em)`,
                  transition: duration ? `transform ${duration}ms cubic-bezier(.2,.8,.2,1)` : undefined,
                }}
              >
                {DIGITS.map((g) => (
                  <span key={g} style={{ height: '1.15em', lineHeight: '1.15em' }}>
                    {g}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
      {props.label && (
        <span className={cx('rg-label', classNames.label)} style={{ fontSize: 12, color: V.muted, fontFamily: V.font, lineHeight: 1.2 }}>
          {props.label}
        </span>
      )}
    </div>
  );
}
