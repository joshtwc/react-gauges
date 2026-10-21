import type { CSSProperties } from 'react';
import type { AnimateInput } from './animation';
import type { FormatInput } from './format';
import type { TickOptions } from './scale';
import type { GaugeStatus, Limits, StatusInfo } from './limits';
import type { GaugeTheme } from './theme';
import type { Marker, Zone } from './zones';

/** Props every gauge accepts. `Slot` is the component's list of stylable parts. */
export interface CommonGaugeProps<Slot extends string = string> {
  /** Rendered width. Number = px; any CSS length is accepted (`'100%'`, `'12rem'`). Height follows the aspect ratio. */
  size?: number | string;
  /** Class on the root element (Tailwind friendly: `text-slate-700 gauge-accent-sky-500`). */
  className?: string;
  style?: CSSProperties;
  /**
   * Classes for individual parts. SVG colours are set as presentation attributes,
   * so utility classes such as `fill-rose-500` or `stroke-slate-300` override them.
   */
  classNames?: Partial<Record<Slot | 'root' | 'svg', string>>;
  /** Theme tokens for this gauge (merged over any <GaugeThemeProvider>). */
  theme?: Partial<GaugeTheme>;
  /** Animate value changes. `true` (default), `false`, or options. */
  animate?: AnimateInput;
  /** Small caption drawn inside the gauge (e.g. "Cooler 2"). */
  label?: string;
  /** Accessible name. Defaults to `label`. */
  ariaLabel?: string;
  id?: string;
}

/** Props for gauges that show a value inside a min/max range. */
export interface RangedGaugeProps {
  value: number;
  /** Range minimum (default 0 unless noted). */
  min?: number;
  /** Range maximum (default 100 unless noted). */
  max?: number;
  /** Coloured bands, e.g. `[{ from: 80, to: 100, color: 'bad' }]`. */
  zones?: Zone[];
  /** Reference lines / targets. */
  markers?: Marker[];
  /** Value readout format: options object, pattern string (`'0.0 °C'`) or function. */
  format?: FormatInput;
  /** Tick label format. Defaults to the value format without unit/prefix/suffix. */
  tickFormat?: FormatInput;
  /** Tick configuration, or `false` to hide ticks. */
  ticks?: TickOptions | false;
  /** Show the numeric readout (default true). */
  showValue?: boolean;
  /** Fixed indicator colour (overrides zone colouring). */
  color?: string;
  /** Tint the indicator with the colour of the zone the value is in (default true). */
  zoneColor?: boolean;
  /** Show the min/max range labels where applicable. */
  showRangeLabels?: boolean;
  /**
   * Warning / alarm limits, e.g. `{ warnBelow: 2, alarmBelow: 0.5 }`.
   * Crossing one tints the indicator and readout, is announced in the accessible
   * text, sets `data-status` on the root, and calls `onStatusChange`.
   */
  limits?: Limits;
  /** Called when the reading moves between `'ok'`, `'warn'` and `'alarm'` (and on mount if it starts out of bounds). */
  onStatusChange?: (status: GaugeStatus, info: StatusInfo) => void;
}
