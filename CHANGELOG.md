# Changelog

All notable changes to `@joshtwc/react-gauges`. The project follows [Semantic Versioning](https://semver.org/).

## 0.3.0 – 2026-09-29

### Added

- **`WeatherConditions`**: a weather card (`card`, `compact` or `icon` layout) that takes a weather-station reading in weather-node's payload shape.
  - It works out the condition from the sky (the summary, or light level plus sun position), rain intensity, temperature (snow) and wind.
  - It supports temperature `limits`, `onConditionChange`, and custom formats and labels.
- **`WeatherIcon`**: 13 animated line-style condition icons with wind overlays, colour and mono styles, and cross-fades between conditions.
- `weatherState`, `classifySky`, `solarElevation`, `skyFromSummary`, `windFraction`, `windLevel` and `cloudPath`.

## 0.2.0 – 2026-09-29

### Added

- **Warning and alarm limits** on every ranged gauge and the `Odometer`: `limits={{ warnBelow, alarmBelow, warnAbove, alarmAbove, hysteresis }}`.
  - Crossing a limit tints the indicator and readout, draws limit zones and lines, adds the state to the accessible text, and sets `data-status` / `data-limit` on the root.
  - It also calls `onStatusChange(status, info)`.
  - Options: `showZones`, `showMarkers`, `colorReadout`, `blink` and `labels`.
- `evaluateLimits`, `useLimitStatus`, `limitZones`, `limitMarkers`, `statusColor` and `statusTextColor` for use outside a gauge.
- Theme tokens `warnText` and `badText` (`--rg-warn-text`, `--rg-bad-text`) for status readouts.

### Changed

- `themes.wateringCanDark` uses a distinct amber for `warn`, so a warning no longer looks like the camel accent.

## 0.1.1 – 2026-09-29

### Fixed

- `Dial`: a long readout (for example `56.0%RH` or `95 km/Hr`) no longer overlaps the min and max tick labels on wide sweeps. The dial shrinks the readout slightly, or moves it below those labels when it still doesn't fit. Layout is based on the widest reading the dial can show, so it doesn't jump while the value animates. An explicit `valueSize` is left as given.

## 0.1.0 – 2026-09-29

First release.

- **Gauges:** `Dial` (with `Speedometer` and `Tachometer` presets), `Thermometer`, `Compass`, `Clinometer`, `BubbleLevel`, `AttitudeIndicator`, `LinearGauge`, `TankGauge`, `BatteryGauge`, `SegmentedMeter`, `RingGauge` and `Odometer`.
- **Ranges:** `min` / `max`, coloured `zones` and `markers` on every gauge except `Compass`.
- **Formatting:** pattern strings (`'0.0 °C'`), `Intl.NumberFormat`-based options, or a function. Tick labels inherit the format without units.
- **Theming:** `--rg-*` CSS variables that fall back to `currentColor`, `GaugeThemeProvider`, built-in themes, per-part `classNames`, and Tailwind v4 utilities in `@joshtwc/react-gauges/tailwind.css`.
- **Accessibility:** `role="meter"` with formatted `aria-valuetext`; animations respect `prefers-reduced-motion`.
- **Packaging:** ESM and CommonJS builds with bundled type declarations for both, marked `'use client'` for React Server Components.
