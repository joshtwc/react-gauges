import { useEffect, useRef, type CSSProperties } from 'react';
import { cx, statusVars } from '../core/frame';
import { createFormatter, type FormatInput } from '../core/format';
import { useLimitStatus, type GaugeStatus, type Limits, type StatusInfo } from '../core/limits';
import { themeToVars, useGaugeTheme, V } from '../core/theme';
import type { CommonGaugeProps } from '../core/types';
import {
  CONDITION_LABELS,
  weatherState,
  type WeatherCondition,
  type WeatherOptions,
  type WeatherReading,
  type WeatherState,
  type WindLevel,
} from '../core/weather';
import { WeatherIcon } from './WeatherIcon';

export type WeatherSlot = 'icon' | 'text' | 'temperature' | 'summary' | 'details' | 'label';

export interface WeatherConditionsProps extends CommonGaugeProps<WeatherSlot>, WeatherOptions {
  /**
   * A reading, e.g. weather-node's `data` payload:
   * `{ temperature, raining, rain_intensity, wind_speed, wind_pct, light_level, summary }`.
   */
  reading?: WeatherReading;
  /** Force the icon's condition instead of deriving it. */
  condition?: WeatherCondition;
  /** Force the wind band (0–3) instead of deriving it. */
  wind?: WindLevel;
  /** `'card'` (default): icon, temperature, summary and details. `'compact'`: icon and temperature. `'icon'`: icon only. */
  layout?: 'card' | 'compact' | 'icon';
  /** Temperature format (default `'0.0 °C'`). */
  format?: FormatInput;
  /** Wind speed format (default `'0 km/h'`). */
  windFormat?: FormatInput;
  /** Show wind speed in the details line (default true). */
  showWind?: boolean;
  /** Show rain intensity in the details line while raining (default true). */
  showRain?: boolean;
  /** Show the summary line (default true). */
  showSummary?: boolean;
  /** Use your own wording for derived conditions (a reading's `summary` is shown as-is). */
  conditionLabels?: Partial<Record<WeatherCondition, string>>;
  /** Wind on the icon: `'overlay'` streaks (default), `'replace'` with a wind icon when wind ≥ moderate (as on the POS), or `'none'`. */
  windStyle?: 'overlay' | 'replace' | 'none';
  /** `'color'` (default) or `'mono'` (current text colour only). */
  iconStyle?: 'color' | 'mono';
  /** Temperature limits, e.g. `{ warnBelow: 2, alarmBelow: 0 }` for frost. */
  limits?: Limits;
  onStatusChange?: (status: GaugeStatus, info: StatusInfo) => void;
  /** Called when the derived condition changes (and once on mount). */
  onConditionChange?: (condition: WeatherCondition, state: WeatherState) => void;
}

/** Weather card: an animated condition icon with temperature, summary and wind. */
export function WeatherConditions(props: WeatherConditionsProps) {
  const {
    reading = {},
    layout = 'card',
    showWind = true,
    showRain = true,
    showSummary = true,
    classNames = {},
    windStyle = 'overlay',
    iconStyle = 'color',
  } = props;
  const theme = useGaugeTheme(props.theme);
  const state = weatherState(reading, props);
  const condition = props.condition ?? state.condition;
  const wind = props.wind ?? state.wind;
  const temperature = reading.temperature;
  const status = useLimitStatus(temperature ?? NaN, props.limits, props.onStatusChange);

  const conditionRef = useRef<WeatherCondition | undefined>(undefined);
  const onCondition = useRef(props.onConditionChange);
  onCondition.current = props.onConditionChange;
  useEffect(() => {
    if (conditionRef.current !== condition) {
      conditionRef.current = condition;
      onCondition.current?.(condition, { ...state, condition });
    }
  });

  const ctx = { min: -50, max: 50, ratio: 0 };
  const tempFmt = createFormatter(props.format, { minDecimals: 1, maxDecimals: 1, unit: '°C' });
  const windFmt = createFormatter(props.windFormat, { maxDecimals: 0, unit: 'km/h' });
  const tempText = temperature !== undefined && Number.isFinite(temperature) ? tempFmt(temperature, ctx) : '—';

  // A reading's own summary wins; otherwise describe what we derived.
  const labels = { ...CONDITION_LABELS, ...props.conditionLabels };
  const summary = reading.summary?.trim() || (props.condition ? labels[props.condition] : describe(state, labels));
  const details = [
    showWind && reading.wind_speed !== undefined ? `Wind ${windFmt(reading.wind_speed, ctx)}` : undefined,
    showRain && reading.raining && reading.rain_intensity !== undefined ? `Rain ${Math.round(reading.rain_intensity)}%` : undefined,
  ].filter(Boolean);

  // Custom limit labels win; otherwise temperature wording ("Too cold") rather than "Low alarm".
  const statusText = status.limit ? props.limits?.labels?.[status.limit] ?? statusWord(status) : undefined;
  const ariaParts = [props.label, summary, temperature !== undefined ? tempText : undefined, ...details, statusText];
  const ariaLabel = props.ariaLabel ?? ariaParts.filter(Boolean).join(', ');

  const defaultSize = layout === 'icon' ? 64 : layout === 'compact' ? 170 : 300;
  const size = props.size ?? defaultSize;
  const rootStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: layout === 'icon' ? 0 : '0.75em',
    width: typeof size === 'number' ? `${size}px` : size,
    maxWidth: '100%',
    // Text scales with the gauge's own width, not the viewport.
    containerType: 'inline-size',
    fontFamily: V.font,
    color: V.text,
    lineHeight: 1.2,
    fontVariantNumeric: 'tabular-nums',
    ...themeToVars(theme),
    ...statusVars(status, props.limits),
    ...props.style,
  };

  const iconWidth = layout === 'icon' ? '100%' : layout === 'compact' ? '38%' : '34%';

  return (
    <div
      id={props.id}
      className={cx('rg-root rg-weather', classNames.root, props.className)}
      style={rootStyle}
      role="img"
      aria-label={ariaLabel}
      data-condition={condition}
      data-wind={wind}
      data-status={props.limits ? status.status : undefined}
      data-limit={status.limit}
    >
      <div className={classNames.icon} style={{ width: iconWidth, flex: 'none' }} aria-hidden="true">
        <WeatherIcon condition={condition} wind={wind} windStyle={windStyle} iconStyle={iconStyle} animate={props.animate} size="100%" />
      </div>
      {layout !== 'icon' && (
        <div className={cx('rg-weather-text', classNames.text)} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.15em' }} aria-hidden="true">
          {props.label && layout === 'card' && (
            <span className={cx('rg-label', classNames.label)} style={{ color: V.muted, fontSize: 'clamp(10px, 4cqw, 14px)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {props.label}
            </span>
          )}
          <span
            className={cx('rg-value', classNames.temperature)}
            style={{
              fontFamily: V.valueFont,
              fontWeight: V.valueWeight as CSSProperties['fontWeight'],
              color: V.value,
              fontSize: layout === 'compact' ? 'clamp(14px, 16cqw, 44px)' : 'clamp(18px, 12cqw, 46px)',
              lineHeight: 1.05,
              whiteSpace: 'nowrap',
            }}
          >
            {tempText}
          </span>
          {layout === 'card' && showSummary && summary && (
            <span className={cx('rg-weather-summary', classNames.summary)} style={{ fontSize: 'clamp(11px, 5cqw, 17px)', overflowWrap: 'anywhere' }}>
              {summary}
            </span>
          )}
          {layout === 'card' && details.length > 0 && (
            <span className={cx('rg-weather-details', classNames.details)} style={{ color: V.muted, fontSize: 'clamp(10px, 4.2cqw, 14px)' }}>
              {details.join(' · ')}
            </span>
          )}
          {layout === 'card' && statusText && (
            <span className="rg-weather-status" style={{ color: V.value, fontSize: 'clamp(10px, 4.2cqw, 14px)', fontWeight: 600 }}>
              {statusText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function describe(state: WeatherState, labels: Record<WeatherCondition, string>): string {
  const skyCondition: Record<WeatherState['sky'], WeatherCondition> = {
    sunny: 'clear',
    partly_cloudy: 'partly-cloudy',
    cloudy: 'cloudy',
    night: 'clear-night',
    low_sun: 'low-sun',
  };
  const parts = [labels[skyCondition[state.sky]]];
  if (state.condition !== skyCondition[state.sky]) parts.push(labels[state.condition].toLowerCase());
  if (state.wind > 0) parts.push(['', 'light winds', 'moderate winds', 'high winds'][state.wind]);
  return parts.join(', ');
}

/** "Low alarm" reads oddly for weather – say what it means for temperature. */
function statusWord(status: StatusInfo): string {
  switch (status.limit) {
    case 'alarmBelow':
      return 'Too cold';
    case 'warnBelow':
      return 'Getting cold';
    case 'warnAbove':
      return 'Getting hot';
    case 'alarmAbove':
      return 'Too hot';
    default:
      return status.label ?? '';
  }
}
