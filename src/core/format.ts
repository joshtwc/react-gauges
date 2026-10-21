/**
 * Value formatting.
 *
 * Every gauge accepts a `format` prop which can be:
 *   • an options object     – `{ decimals: 1, unit: '°C' }`
 *   • a pattern string      – `'0.0 °C'`, `'$#,##0.00'`, `'0%'`
 *   • a function            – `(value, ctx) => string`
 */

export interface FormatContext {
  /** Range minimum of the gauge. */
  min: number;
  /** Range maximum of the gauge. */
  max: number;
  /** Position of the value inside the range, 0..1 (clamped). */
  ratio: number;
}

export type Formatter = (value: number, ctx: FormatContext) => string;

export interface FormatOptions {
  /** Fixed number of decimals (sets both min & max fraction digits). */
  decimals?: number;
  /** Minimum fraction digits (ignored when `decimals` is set). */
  minDecimals?: number;
  /** Maximum fraction digits (ignored when `decimals` is set). */
  maxDecimals?: number;
  /** Text placed before the number, e.g. `'$'` or `'≈ '`. */
  prefix?: string;
  /** Text placed after the number (after any unit). */
  suffix?: string;
  /** Unit appended after the number, e.g. `'km/h'`, `'°C'`, `'%'`. */
  unit?: string;
  /** Put a space between number and unit. Default: true, except for `°`, `%`, `′`, `″`. */
  unitSpace?: boolean;
  /** BCP-47 locale(s) for Intl.NumberFormat. Default: the runtime locale. */
  locale?: string | string[];
  /**
   * `'decimal'` (default), `'currency'`, or `'percent'`.
   * With `'percent'` the value is treated as already being 0–100 (45 → “45%”).
   */
  style?: 'decimal' | 'currency' | 'percent';
  /** ISO currency code for `style: 'currency'` (default `'USD'`). */
  currency?: string;
  /** `'standard'`, `'compact'` (1.2K), `'scientific'`, `'engineering'`. */
  notation?: 'standard' | 'compact' | 'scientific' | 'engineering';
  /** Show sign: `'auto'`, `'always'`, `'exceptZero'`, `'never'`. */
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never';
  /** Thousands separators (default true). */
  grouping?: boolean;
  /** Multiply the value before formatting (e.g. `0.001` to show rpm as ×1000). */
  multiplier?: number;
  /** Display the value as a percentage of the gauge range instead of the raw value. */
  percentOfRange?: boolean;
  /** Text shown for NaN / non-finite values (default `'—'`). */
  invalidText?: string;
  /** Escape hatch: full control. Receives the raw value. */
  formatter?: Formatter;
}

export type FormatInput = FormatOptions | Formatter | string;

const NO_SPACE_UNITS = /^(°|%|′|″|‰)/;
const nfCache = new Map<string, Intl.NumberFormat>();

function getNumberFormat(locale: string | string[] | undefined, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify([locale ?? null, opts]);
  let nf = nfCache.get(key);
  if (!nf) {
    try {
      nf = new Intl.NumberFormat(locale, opts);
    } catch {
      nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    }
    nfCache.set(key, nf);
  }
  return nf;
}

/**
 * Parse an Excel-ish pattern: literal text around a number mask.
 *   '0.0 °C'   → decimals 1, unit '°C'
 *   '$#,##0.00'→ prefix '$', grouping, decimals 2
 *   '0%'       → decimals 0, unit '%'
 *   '+0.0'     → signDisplay 'exceptZero'
 */
export function parseFormatPattern(pattern: string): FormatOptions {
  const m = pattern.match(/([+]?)([#0,]*0[#0,]*|#+)(?:\.([0#]+))?/);
  if (!m || m.index === undefined) return { suffix: pattern };
  const [whole, sign, intPart, frac = ''] = m;
  const prefix = pattern.slice(0, m.index);
  const rest = pattern.slice(m.index + whole.length);
  const minDecimals = (frac.match(/0/g) || []).length;
  const maxDecimals = frac.length;
  const opts: FormatOptions = {
    grouping: intPart.includes(','),
    minDecimals,
    maxDecimals,
  };
  if (prefix) opts.prefix = prefix;
  if (sign) opts.signDisplay = 'exceptZero';
  const unit = rest.trim();
  if (unit) {
    opts.unit = unit;
    opts.unitSpace = /^\s/.test(rest);
  }
  return opts;
}

/** Normalise a FormatInput to a FormatOptions or function. */
function toOptions(input: FormatInput | undefined): FormatOptions | Formatter {
  if (input === undefined) return {};
  if (typeof input === 'function') return input;
  if (typeof input === 'string') return parseFormatPattern(input);
  return input;
}

/** Format a number with the given options (no gauge context needed). */
export function formatNumber(value: number, options: FormatOptions = {}, ctx?: FormatContext): string {
  const context: FormatContext = ctx ?? { min: 0, max: 100, ratio: 0 };
  if (options.formatter) return options.formatter(value, context);
  if (!Number.isFinite(value)) return options.invalidText ?? '—';

  let v = value;
  if (options.percentOfRange) {
    const span = context.max - context.min;
    v = span === 0 ? 0 : ((value - context.min) / span) * 100;
  }
  if (options.multiplier !== undefined) v *= options.multiplier;

  const style = options.style ?? 'decimal';
  const intl: Intl.NumberFormatOptions = {
    useGrouping: options.grouping ?? true,
    notation: options.notation,
    signDisplay: options.signDisplay,
  };
  if (options.decimals !== undefined) {
    intl.minimumFractionDigits = options.decimals;
    intl.maximumFractionDigits = options.decimals;
  } else {
    if (options.minDecimals !== undefined) intl.minimumFractionDigits = options.minDecimals;
    intl.maximumFractionDigits = Math.max(options.maxDecimals ?? (options.percentOfRange ? 0 : 2), intl.minimumFractionDigits ?? 0);
  }
  if (style === 'currency') {
    intl.style = 'currency';
    intl.currency = options.currency ?? 'USD';
  } else if (style === 'percent') {
    intl.style = 'percent';
    v /= 100;
  }

  let out = getNumberFormat(options.locale, intl).format(v);
  let unit = options.unit;
  if (!unit && options.percentOfRange && style !== 'percent') unit = '%';
  if (unit) {
    const space = options.unitSpace ?? !NO_SPACE_UNITS.test(unit);
    out += (space ? ' ' : '') + unit; // thin space reads better than a full space
  }
  return (options.prefix ?? '') + out + (options.suffix ?? '');
}

/**
 * Build a formatter for a gauge. `defaults` are the gauge's own sensible
 * defaults (e.g. a thermometer's `°C`); user options override them.
 */
export function createFormatter(input: FormatInput | undefined, defaults: FormatOptions = {}): Formatter {
  const resolved = toOptions(input);
  if (typeof resolved === 'function') return resolved;
  const merged = { ...defaults, ...resolved };
  // A pattern/explicit decimals should win over default min/max decimals.
  if (resolved.decimals !== undefined) {
    delete merged.minDecimals;
    delete merged.maxDecimals;
  }
  return (value, ctx) => formatNumber(value, merged, ctx);
}

/** Build a tick-label formatter: inherits the value format but drops prefix/suffix/unit unless asked. */
export function createTickFormatter(
  tickInput: FormatInput | undefined,
  valueInput: FormatInput | undefined,
  step: number,
  defaults: FormatOptions = {},
): Formatter {
  if (tickInput !== undefined) return createFormatter(tickInput, defaults);
  const base = toOptions(valueInput);
  if (typeof base === 'function') {
    return createFormatter({ ...defaults, maxDecimals: defaults.notation === 'compact' ? 1 : stepDecimals(step) });
  }
  // Ticks keep locale, grouping and notation but drop units, symbols and fixed decimals.
  const {
    prefix: _p,
    suffix: _s,
    unit: _u,
    decimals: _d,
    minDecimals: _mn,
    maxDecimals: _mx,
    percentOfRange: _pr,
    style: _st,
    currency: _c,
    signDisplay: _sd,
    ...rest
  } = base;
  const merged: FormatOptions = { ...defaults, ...rest };
  return createFormatter({ ...merged, maxDecimals: merged.notation === 'compact' ? 1 : stepDecimals(step) });
}

function stepDecimals(step: number): number {
  if (!step || !Number.isFinite(step)) return 0;
  for (let d = 0; d <= 6; d++) {
    if (Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) < 1e-7) return d;
  }
  return 6;
}
