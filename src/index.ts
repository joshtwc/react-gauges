// Gauges
export { Dial, Speedometer, Tachometer } from './gauges/Dial';
export type { DialProps, DialSlot, NeedleOptions, SpeedometerProps, TachometerProps } from './gauges/Dial';
export { Thermometer, convertTemperature } from './gauges/Thermometer';
export type { ThermometerProps, ThermometerSlot, TemperatureUnit, SecondaryScale } from './gauges/Thermometer';
export { Compass, headingToCardinal } from './gauges/Compass';
export type { CompassProps, CompassSlot } from './gauges/Compass';
export { Clinometer, angleToGrade, gradeToAngle, formatSlope } from './gauges/Clinometer';
export type { ClinometerProps, ClinometerSlot } from './gauges/Clinometer';
export { BubbleLevel } from './gauges/BubbleLevel';
export type { BubbleLevelProps, BubbleLevelSlot } from './gauges/BubbleLevel';
export { AttitudeIndicator } from './gauges/AttitudeIndicator';
export type { AttitudeIndicatorProps, AttitudeSlot } from './gauges/AttitudeIndicator';
export { LinearGauge } from './gauges/LinearGauge';
export type { LinearGaugeProps, LinearGaugeSlot } from './gauges/LinearGauge';
export { TankGauge } from './gauges/TankGauge';
export type { TankGaugeProps, TankSlot } from './gauges/TankGauge';
export { BatteryGauge } from './gauges/BatteryGauge';
export type { BatteryGaugeProps, BatterySlot } from './gauges/BatteryGauge';
export { SegmentedMeter } from './gauges/SegmentedMeter';
export type { SegmentedMeterProps, SegmentedSlot } from './gauges/SegmentedMeter';
export { RingGauge } from './gauges/RingGauge';
export type { RingGaugeProps, RingSlot, RingSpec } from './gauges/RingGauge';
export { Odometer } from './gauges/Odometer';
export { WeatherConditions } from './gauges/WeatherConditions';
export type { WeatherConditionsProps, WeatherSlot } from './gauges/WeatherConditions';
export { WeatherIcon, cloudPath } from './gauges/WeatherIcon';
export type { WeatherIconProps } from './gauges/WeatherIcon';
export type { OdometerProps, OdometerSlot } from './gauges/Odometer';

// Core
export {
  weatherState,
  classifySky,
  skyFromSummary,
  solarElevation,
  windFraction,
  windLevel,
  CONDITION_LABELS,
  SKY_DEFAULTS,
} from './core/weather';
export type { WeatherCondition, WeatherReading, WeatherOptions, WeatherState, SkyLevel, SkyOptions, WindLevel } from './core/weather';
export { createFormatter, formatNumber, parseFormatPattern } from './core/format';
export type { FormatInput, FormatOptions, Formatter, FormatContext } from './core/format';
export { generateTicks, niceStep, clamp, normalize } from './core/scale';
export type { TickOptions, Ticks, Range } from './core/scale';
export { thresholdZones, zoneAt, ZONE_COLORS } from './core/zones';
export { evaluateLimits, limitMarkers, limitZones, statusColor, statusTextColor, useLimitStatus, LIMIT_LABELS } from './core/limits';
export type { GaugeStatus, LimitKey, Limits, StatusInfo } from './core/limits';
export type { Zone, Marker } from './core/zones';
export { useAnimatedNumber, EASINGS } from './core/animation';
export type { AnimateInput, AnimationOptions, Easing, EasingName } from './core/animation';
export { GaugeThemeProvider, themes, themeToVars } from './core/theme';
export type { GaugeTheme, GaugeThemeProviderProps } from './core/theme';
export type { CommonGaugeProps, RangedGaugeProps } from './core/types';
