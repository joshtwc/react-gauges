# @joshtwc/react-gauges

[![npm](https://img.shields.io/npm/v/@joshtwc/react-gauges)](https://www.npmjs.com/package/@joshtwc/react-gauges)
[![CI](https://github.com/joshtwc/react-gauges/actions/workflows/ci.yml/badge.svg)](https://github.com/joshtwc/react-gauges/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@joshtwc/react-gauges)](./LICENSE)

Detailed, themeable SVG gauges and meters for React 18 and 19. No runtime dependencies, no stylesheet to import, and Tailwind-friendly.

| Gauge | Component | Good for |
| --- | --- | --- |
| Radial dial | `Dial` | Anything with a needle or arc – any sweep, bipolar, min/max hold |
| Speedometer / Tachometer | `Speedometer`, `Tachometer` | Presets built on `Dial` |
| Thermometer | `Thermometer` | Liquid-in-glass, °C/°F/K, dual scale, vertical or horizontal |
| Compass | `Compass` | Heading with needle or rotating card, bearing markers, 4/8/16-point readout |
| Clinometer | `Clinometer` | Tilt/slope in degrees and grade %, level or protractor style |
| Bubble level | `BubbleLevel` | Spirit-level vial or two-axis bullseye |
| Attitude indicator | `AttitudeIndicator` | Pitch & roll artificial horizon |
| Linear gauge | `LinearGauge` | Bar, pointer or bullet chart; horizontal or vertical; targets |
| Tank | `TankGauge` | Liquid level with animated waves, 4 vessel shapes |
| Battery | `BatteryGauge` | Charge with cells and charging bolt |
| Segmented meter | `SegmentedMeter` | LED bar / VU meter or segmented arc, peak hold |
| Ring | `RingGauge` | Progress ring, horseshoe, concentric multi-ring |
| Odometer | `Odometer` | Rolling-digit counter, mechanical or plain |
| Weather | `WeatherConditions`, `WeatherIcon` | Animated condition icon with temperature, summary and wind; reads a weather-station payload |

## Install

```bash
npm install @joshtwc/react-gauges
# or: pnpm add @joshtwc/react-gauges · yarn add @joshtwc/react-gauges
```

`react` and `react-dom` 18 or newer are peer dependencies.

## Usage

```tsx
import { Dial, Thermometer, thresholdZones } from '@joshtwc/react-gauges';

export function Greenhouse({ humidity, temp }: { humidity: number; temp: number }) {
  return (
    <>
      <Dial value={humidity} format={{ unit: '%', maxDecimals: 0 }} zones={thresholdZones([0, 60, 85, 100])} label="Humidity" />
      <Thermometer value={temp} min={-5} max={15} unit="C" secondaryUnit="F" />
    </>
  );
}
```

The bundles are marked `'use client'`, so gauges drop straight into a Next.js App Router page. Pass them values from a Server Component as props.

Both ESM (`import`) and CommonJS (`require`) are supported, each with its own type declarations.

## Shared props

Every gauge accepts:

| Prop | Type | Notes |
| --- | --- | --- |
| `size` | `number \| string` | Width (px or any CSS length). Height follows the aspect ratio. |
| `className`, `style` | | On the root element. |
| `classNames` | `{ [slot]: string }` | Classes for individual parts (see each component's `…Slot` type). |
| `theme` | `Partial<GaugeTheme>` | Token overrides for this gauge. |
| `animate` | `boolean \| { duration, easing, onMount, respectReducedMotion }` | Default on. Easings: `linear`, `easeOut`, `easeInOut`, `overshoot`, `elastic`, or a function. |
| `label` | `string` | Caption drawn inside the gauge. |
| `ariaLabel` | `string` | Accessible name (defaults to `label`). |

Ranged gauges (everything except `Compass` and `AttitudeIndicator`) also accept:

| Prop | Type | Notes |
| --- | --- | --- |
| `value`, `min`, `max` | `number` | Values outside the range are pinned visually; the readout shows the real value. |
| `zones` | `Zone[]` | `{ from, to, color, label?, className? }`. `color` is any CSS colour or `good` / `warn` / `bad` / `info` / `cold`. |
| `markers` | `Marker[]` | `{ value, label?, color? }` – thresholds, targets, alarms. |
| `format` | `FormatInput` | See [Formatting](#formatting). |
| `tickFormat` | `FormatInput` | Defaults to `format` without units/symbols. Ranges ≥ 10,000 switch ticks to compact notation. |
| `ticks` | `TickOptions \| false` | `{ count, step, values, minor, labels, labelEvery, show }` |
| `showValue` | `boolean` | Readout on/off. |
| `color` | `string` | Fixed indicator colour. |
| `zoneColor` | `boolean` | Tint the indicator with the current zone's colour (default `true`). |
| `limits` | `Limits` | Warning / alarm limits – see [Warning and alarm limits](#warning-and-alarm-limits). |
| `onStatusChange` | `(status, info) => void` | Called when the reading moves between `ok`, `warn` and `alarm`. |

`AttitudeIndicator` takes `pitch`, `roll`, `pitchRange`, `rollRange` and `rollZones`. `Compass` has no range by design – headings wrap at 360°.

## Warning and alarm limits

Every ranged gauge (and the `Odometer`) takes `limits`. A reading strictly below a `…Below` limit, or strictly above a `…Above` limit, is in that state, and an alarm beats a warning.

```tsx
<Thermometer
  value={coolerTemp}
  min={-5}
  max={15}
  limits={{ warnBelow: 2, alarmBelow: 0.5, warnAbove: 7, alarmAbove: 9, hysteresis: 0.3 }}
  onStatusChange={(status, info) => {
    if (status === 'alarm') page(`Cooler 1: ${info.label} at ${info.value} °C`);
  }}
/>
```

While a limit is crossed, the gauge shows it in several ways:

- **Indicator:** the needle arc, bar, liquid or ring turns amber (warn) or red (alarm).
- **Readout:** the number takes a darker or lighter version of that colour, so it stays readable.
- **Zones and limit lines:** drawn automatically, unless the gauge has its own `zones`. Lines carry the class `rg-limit rg-limit-<key>`.
- **Screen readers:** the text adds the state, e.g. "0.2°C, Low alarm".
- **Root element:** gets `data-status="ok|warn|alarm"` and `data-limit="alarmBelow"` for your own styling, e.g. Tailwind `data-[status=alarm]:ring-2`.

`onStatusChange` fires on mount if the first reading is already out of bounds, and after that only when the state or the crossed limit changes.

| `Limits` option | Default | |
| --- | --- | --- |
| `warnBelow`, `alarmBelow`, `warnAbove`, `alarmAbove` | – | Any combination. |
| `hysteresis` | `0` | Dead band. Once crossed, the reading must come back past the limit by this much to clear, so a reading sitting on a limit doesn't flicker. |
| `showZones` | `true` | Draw the limits as zones when the gauge has no `zones`. |
| `showMarkers` | `true` | Draw a line at each limit. |
| `colorReadout` | `true` | Tint the numeric readout. |
| `blink` | `false` | Blink the readout while alarming. Skipped for users who prefer reduced motion. |
| `labels` | "Low alarm" … | Per-limit wording for the accessible text and `info.label`, e.g. `{ alarmBelow: 'Frost risk' }`. |

Some gauges read the limits in their own way:

- **`BubbleLevel`** tests how far off level it is: `|tilt|`, or the combined X/Y tilt for a bullseye.
- **`zoneColor={false}`** or a fixed `color` keeps the indicator's own colour; the readout still changes.

The same check is available without a gauge: `evaluateLimits(value, limits)`, or the `useLimitStatus(value, limits, onChange)` hook.

## Formatting

`format` accepts three shapes:

```tsx
format="0.0 °C"               // pattern: decimals from the mask, literal text around it
format="$#,##0.00"            // prefix + grouping + 2 decimals
format="+0.0%"                // always signed
format={{ decimals: 1, unit: 'km/h' }}
format={{ style: 'currency', currency: 'CAD' }}
format={{ notation: 'compact' }}           // 125K
format={{ percentOfRange: true }}          // value shown as % of min..max
format={{ multiplier: 0.001, unit: 'k' }}  // scale before formatting
format={{ locale: 'fr-CA', decimals: 2 }}
format={(v, { min, max, ratio }) => `${Math.round(ratio * 100)} pts`}
```

All `FormatOptions`: `decimals`, `minDecimals`, `maxDecimals`, `prefix`, `suffix`, `unit`, `unitSpace`, `locale`, `style` (`decimal` \| `currency` \| `percent`, where percent treats the value as 0–100), `currency`, `notation`, `signDisplay`, `grouping`, `multiplier`, `percentOfRange`, `invalidText`, `formatter`.

`formatNumber`, `createFormatter` and `parseFormatPattern` are exported for your own labels.

## Theming

Colours and fonts are CSS custom properties with neutral fallbacks based on `currentColor`, so an unthemed gauge takes on the text colour around it – including dark mode.

| Token | CSS variable | Default |
| --- | --- | --- |
| `accent` | `--rg-accent` | `currentColor` |
| `text` / `muted` | `--rg-text` / `--rg-muted` | `currentColor` / 62% |
| `track` / `tick` | `--rg-track` / `--rg-tick` | 12% / 50% of `currentColor` |
| `face` / `faceBorder` | `--rg-face` / `--rg-face-border` | transparent / 16% |
| `needle` / `hub` / `marker` | `--rg-needle` / `--rg-hub` / `--rg-marker` | accent / needle / text |
| `good` `warn` `bad` `info` `cold` | `--rg-good` … | semantic zone colours |
| `font` / `valueFont` / `valueWeight` | `--rg-font` … | inherit / inherit / 600 |

Extra variables: `--rg-on-accent` (text over fills), `--rg-sky` / `--rg-ground` (attitude), `--rg-liquid` / `--rg-bubble` (levels), `--rg-north`, `--rg-ring-2…4`, `--rg-odometer-bg` / `-fg` / `-decimal-bg`.

Four ways to theme, in increasing precedence:

```tsx
// 1. CSS anywhere up the tree
.dashboard { --rg-accent: #2b3e59; }

// 2. Provider (nestable)
<GaugeThemeProvider theme={themes.wateringCan}>…</GaugeThemeProvider>

// 3. Per gauge
<Dial theme={{ accent: 'rebeccapurple' }} />

// 4. Slot classes – beat everything because SVG colours are presentation attributes
<Dial classNames={{ needle: 'fill-rose-600', value: 'font-bold' }} />
```

Built-in themes: `themes.neutral` (inherit), `themes.wateringCan` and `themes.wateringCanDark` (The Watering Can brand), `themes.midnight` (for dark panels), `themes.brass`.

### Tailwind CSS v4

```css
@import "tailwindcss";
@import "@joshtwc/react-gauges/tailwind.css";
```

This adds one utility per token, fed from your Tailwind palette, with every variant:

```tsx
<Dial
  value={58}
  className="text-slate-700 dark:text-slate-200 gauge-accent-sky-500 gauge-track-slate-200 dark:gauge-track-slate-800"
/>
<LinearGauge value={40} className="gauge-accent-[#2b3e59]" />
```

Utilities: `gauge-accent-*`, `gauge-text-*`, `gauge-muted-*`, `gauge-track-*`, `gauge-tick-*`, `gauge-face-*`, `gauge-border-*`, `gauge-needle-*`, `gauge-hub-*`, `gauge-marker-*`, `gauge-good-*`, `gauge-warn-*`, `gauge-bad-*`, `gauge-info-*`, `gauge-cold-*`, `gauge-on-accent-*`, `gauge-sky-*`, `gauge-ground-*`, `gauge-liquid-*`, `gauge-font-*`, `gauge-value-font-*`.

Note: a `theme` prop or provider writes inline variables on the gauge root, which outrank utility classes on that same element. Use one approach per gauge.

## Component reference

### Dial

`startAngle` (−135) · `endAngle` (135) – 0° is 12 o'clock, clockwise. Swap them for a counter-clockwise dial.
`variant`: `both` \| `needle` \| `arc` · `arcWidth` · `rounded` · `origin` (bipolar fill start) · `zoneStyle`: `band` \| `track` · `face` · `needle: { shape: tapered | line | arrow | triangle, length, width, tail, color, hubRadius }` · `valuePosition`: `auto` \| `center` \| `bottom` \| `none` · `valueSize` · `minHold` / `maxHold` · `showRangeLabels`.

Presets: `<Speedometer unit="km/h" | "mph" />`, `<Tachometer redline={6500} />`.

### Thermometer

`unit`: `C` \| `F` \| `K` · `secondaryUnit` · `secondaryScale: { toSecondary, toPrimary, format, ticks }` · `orientation` · `scaleSide` · `tubeWidth` · `bulbRadius`. Helper: `convertTemperature(v, from, to)`.

### Compass

`heading` · `mode`: `needle` \| `card` · `declination` · `markers` (bearings) · `readout`: `both` \| `degrees` \| `cardinal` \| `none` · `cardinalPoints`: 4 \| 8 \| 16 · `format` · `showDegreeLabels` · `showIntercardinals` · `labelOrientation`: `upright` \| `radial` · `needleStyle`: `classic` \| `arrow` \| `minimal`. Helper: `headingToCardinal(deg, points)`.

### Clinometer

`value` (degrees, positive = right side up) · `variant`: `level` \| `protractor` · `display`: `degrees` \| `percent` \| `both` · `gradeFormat` · `mirror` · `dialProps` (protractor). Helpers: `angleToGrade`, `gradeToAngle`, `formatSlope`.

### BubbleLevel

`value` (X tilt) · `valueY` (Y tilt → bullseye) · `variant`: `vial` \| `bullseye` · `tolerance` (default 0.5°). Zones match the tilt magnitude; without zones the bubble is green inside tolerance, amber to 4×, red beyond.

### AttitudeIndicator

`pitch` · `roll` · `pitchRange` (30) · `pitchStep` (10) · `rollRange` (60) · `rollZones` · `format` · `skyColor` · `groundColor`.

### LinearGauge

`orientation` · `variant`: `bar` \| `pointer` \| `bullet` · `thickness` · `rounded` · `origin` · `target` · `valuePosition`: `top` \| `end` \| `inside` \| `none` · `length`.

### TankGauge

`shape`: `rounded` \| `rect` \| `cylinder` \| `circle` · `wave` · `waveAmplitude` · `waveSpeed` · `showScale`. Defaults to showing percent of range; pass `format` for real units. The readout is drawn twice and clipped so it stays legible above and below the waterline.

### BatteryGauge

`segments` · `charging` · `orientation` · `valuePosition`: `inside` \| `outside` \| `none`. Default zones: red < 15%, amber < 35%, green above.

### SegmentedMeter

`segments` (20) · `layout`: `linear` \| `arc` · `orientation` · `shape`: `rect` \| `round` \| `dot` · `gap` · `unlitOpacity` · `peak` · `startAngle` / `endAngle` (arc). Each segment takes the colour of the zone at its midpoint.

### RingGauge

`thickness` · `gap` · `startAngle` · `sweep` (270 for a horseshoe) · `rounded` · `showZones` · `sublabel` · `rings: RingSpec[]` (`{ value, min, max, color, zones, label, format }`) · `legend`.

### Odometer

`size` is the digit height in px. `variant`: `mechanical` \| `plain` · `minDigits` · `highlightDecimals` · `clampToRange`. `minDigits` pads before grouping, so pair it with `format={{ grouping: false }}` for a classic look.

### WeatherConditions

Pass a reading and the gauge picks the icon. Field names follow TWC's weather-node payload, and every field is optional:

```tsx
// weather-node pushes { type: "weather", data: { temperature, raining, rain_intensity, wind_speed, wind_pct, light_level, summary } }
<WeatherConditions reading={data} limits={{ warnBelow: 2, alarmBelow: 0 }} />
```

**Sky.** The sky comes from the first choice that's available:

1. `reading.sky` (`'sunny' | 'partly_cloudy' | 'cloudy' | 'low_sun' | 'night'`);
2. the first part of `reading.summary` ("Partly Cloudy, light winds" → partly cloudy);
3. `light_level`, using the same clear-sky-index classifier as weather-node. This needs `latitude` / `longitude`; without them it falls back to rough lux bands.

**Precipitation.** Precipitation (`raining`) overrides the sky:

- Intensity below 33 is drizzle, below 66 rain, and anything higher heavy rain. These are the POS's bands; change them with `rainBands`.
- At or below `snowAtOrBelow` (0 °C) it shows as snow.

**Wind.** The wind band (calm / light / moderate / high) comes from `wind_pct`. When that's missing, it's worked out from `wind_speed` over weather-node's 4.5–36.5 km/h range. Wind shows as streaks on the icon (`windStyle="overlay"`), or as slanted rain while it's raining. Use `windStyle="replace"` for the POS behaviour, where the whole icon becomes wind when it's moderate or stronger.

Props:

- `layout`: `card` (icon, temperature, summary, wind and rain), `compact` (icon and temperature) or `icon`.
- `format` / `windFormat`: formatting for the temperature and wind speed.
- `limits`: temperature limits, which show "Too cold", "Getting hot" and so on.
- `condition` / `wind`: force the icon.
- `conditionLabels`: your own wording for the conditions.
- `iconStyle`: `color` or `mono`.
- `onConditionChange`: called when the condition changes.

The root element carries `data-condition` and `data-wind`.

Conditions: `clear`, `clear-night`, `partly-cloudy`, `partly-cloudy-night`, `cloudy`, `low-sun`, `drizzle`, `rain`, `heavy-rain`, `snow`, `thunderstorm`, `fog`, `wind`.

`WeatherIcon` is the icon on its own, e.g. `<WeatherIcon condition="rain" wind={2} size={24} />`. It fades between conditions and animates gently (turning sun rays, falling rain, drifting cloud); both switch off with `animate={false}` or for users who prefer reduced motion. Recolour it with `--rg-sun`, `--rg-rain`, `--rg-cloud`, `--rg-cloud-dark`, `--rg-moon`, `--rg-bolt` and `--rg-icon-stroke`.

The logic is exported too: `weatherState(reading, options)`, `classifySky`, `solarElevation`, `skyFromSummary`, `windFraction` and `windLevel`.

## Accessibility

Ranged gauges render `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and a formatted `aria-valuetext`. `Compass` and `AttitudeIndicator` render `role="img"` with a descriptive label ("Heading 245° WSW"). The SVG itself is `aria-hidden`. Animations, waves and odometer rolls switch off for users who prefer reduced motion.

## Development

```bash
npm install
npm run dev            # playground at http://localhost:5173 (demo/)
npm test               # vitest
npm run typecheck
npm run build          # dist/: ESM + CJS + .d.ts/.d.cts + tailwind.css
npm run lint:package   # publint + are-the-types-wrong against the packed tarball
```

```
src/
  core/       format, scale, zones, geometry, animation, theme, shared frame & scales
  gauges/     one file per gauge
  tailwind.css
demo/         Vite + Tailwind v4 playground (not published)
test/         vitest unit + render tests
scripts/      postbuild (CommonJS type twin, tailwind.css copy)
```

### Releasing

1. Update `version` in `package.json` and add a section to `CHANGELOG.md`.
2. `npm login` (as `joshtwc`), then `npm publish`.

`prepublishOnly` runs the type-check, tests, build and package lint first, and `publishConfig.access` is `public`, so the scoped package publishes publicly.

## License

[MIT](./LICENSE)
