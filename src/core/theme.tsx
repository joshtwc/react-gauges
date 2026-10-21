import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';

/**
 * Theme tokens. Every token maps to a CSS custom property (`--rg-<kebab-key>`),
 * so you can theme gauges with:
 *   • the `theme` prop / <GaugeThemeProvider>
 *   • plain CSS  (`.my-gauges { --rg-accent: rebeccapurple }`)
 *   • Tailwind   (`gauge-accent-emerald-500` with the bundled utilities, or `[--rg-accent:var(--color-emerald-500)]`)
 *
 * Unset tokens fall back to `currentColor`-based neutrals, so gauges pick up
 * the surrounding text colour (and therefore light/dark mode) automatically.
 */
export interface GaugeTheme {
  /** Value arc / bar / fill colour. */
  accent: string;
  /** Primary text (value readout). */
  text: string;
  /** Secondary text (labels, tick labels). */
  muted: string;
  /** Unfilled track. */
  track: string;
  /** Tick marks. */
  tick: string;
  /** Dial face background. */
  face: string;
  /** Dial face / container outline. */
  faceBorder: string;
  /** Needles and pointers. */
  needle: string;
  /** Needle hub. */
  hub: string;
  /** Marker (target / threshold) colour. */
  marker: string;
  good: string;
  warn: string;
  bad: string;
  info: string;
  cold: string;
  /** Readout colour while warning (default: warn mixed toward the text colour for contrast). */
  warnText: string;
  /** Readout colour while alarming (default: bad mixed toward the text colour for contrast). */
  badText: string;
  /** Font for all gauge text. */
  font: string;
  /** Font for the main value readout. */
  valueFont: string;
  /** Font weight for the value readout. */
  valueWeight: string | number;
}

/** CSS `var()` references with neutral, currentColor-derived fallbacks. */
export const V = {
  accent: 'var(--rg-accent, currentColor)',
  text: 'var(--rg-text, currentColor)',
  muted: 'var(--rg-muted, color-mix(in srgb, currentColor 62%, transparent))',
  track: 'var(--rg-track, color-mix(in srgb, currentColor 12%, transparent))',
  tick: 'var(--rg-tick, color-mix(in srgb, currentColor 50%, transparent))',
  face: 'var(--rg-face, transparent)',
  faceBorder: 'var(--rg-face-border, color-mix(in srgb, currentColor 16%, transparent))',
  needle: 'var(--rg-needle, var(--rg-accent, currentColor))',
  hub: 'var(--rg-hub, var(--rg-needle, var(--rg-accent, currentColor)))',
  marker: 'var(--rg-marker, var(--rg-text, currentColor))',
  font: 'var(--rg-font, inherit)',
  valueFont: 'var(--rg-value-font, var(--rg-font, inherit))',
  valueWeight: 'var(--rg-value-weight, 600)',
  /** Readout colour – follows `text`, and switches to warn/bad while a limit is crossed. */
  value: 'var(--rg-value, var(--rg-text, currentColor))',
} as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Convert a (partial) theme into a style object of CSS variables. */
export function themeToVars(theme: Partial<GaugeTheme> | undefined): CSSProperties {
  const out: Record<string, string | number> = {};
  if (!theme) return out;
  for (const [k, v] of Object.entries(theme)) {
    if (v !== undefined && v !== null && v !== '') out[`--rg-${kebab(k)}`] = v as string | number;
  }
  return out as CSSProperties;
}

/** Ready-made themes. `neutral` is empty on purpose: it inherits from the page. */
export const themes = {
  neutral: {} as Partial<GaugeTheme>,
  /** The Watering Can Flower Market – indigo dye & camel on warm white. */
  wateringCan: {
    accent: '#2b3e59',
    text: '#1a2535',
    // Labels stay indigo: camel is decorative-only per brand contrast rules.
    muted: '#2b3e59',
    track: '#e6e8ed',
    tick: '#8a91a0',
    face: '#ffffff',
    faceBorder: '#b1955d',
    needle: '#1a2535',
    hub: '#b1955d',
    marker: '#2b3e59',
    good: '#4f7d5a',
    warn: '#b1955d',
    bad: '#a8473b',
    info: '#2b3e59',
    cold: '#6f8fb8',
    font: '"Inter", sans-serif',
    valueFont: '"Lora", Georgia, serif',
    valueWeight: 600,
  } as Partial<GaugeTheme>,
  /** The Watering Can on dark surfaces – camel reads well on deep indigo. */
  wateringCanDark: {
    accent: '#b1955d',
    text: '#faf7f2',
    muted: '#c9cdd5',
    track: '#2f3d52',
    tick: '#8a91a0',
    face: '#1f2c40',
    faceBorder: '#b1955d',
    needle: '#faf7f2',
    hub: '#b1955d',
    marker: '#faf7f2',
    good: '#79a884',
    // A true amber, so a warning reads differently from the camel accent.
    warn: '#f0a030',
    bad: '#d77a6c',
    info: '#8fb0d8',
    cold: '#8fb0d8',
    font: '"Inter", sans-serif',
    valueFont: '"Lora", Georgia, serif',
    valueWeight: 600,
  } as Partial<GaugeTheme>,
  /** High-contrast instrument panel. */
  midnight: {
    accent: '#7dd3fc',
    text: '#f1f5f9',
    muted: '#94a3b8',
    track: '#1e293b',
    tick: '#64748b',
    face: '#0b1220',
    faceBorder: '#334155',
    needle: '#fb923c',
    hub: '#e2e8f0',
    marker: '#facc15',
    good: '#4ade80',
    warn: '#facc15',
    bad: '#f87171',
    info: '#38bdf8',
    cold: '#93c5fd',
  } as Partial<GaugeTheme>,
  /** Warm vintage brass instrument. */
  brass: {
    accent: '#8a5a1f',
    text: '#3b2a14',
    muted: '#6b5433',
    track: '#e9dcc3',
    tick: '#7a6242',
    face: '#f6eedc',
    faceBorder: '#b08d57',
    needle: '#9b2d20',
    hub: '#3b2a14',
    marker: '#9b2d20',
    good: '#5f7d3a',
    warn: '#c08a2d',
    bad: '#9b2d20',
    font: 'Georgia, serif',
    valueFont: 'Georgia, serif',
  } as Partial<GaugeTheme>,
};

const ThemeContext = createContext<Partial<GaugeTheme> | undefined>(undefined);

export interface GaugeThemeProviderProps {
  theme: Partial<GaugeTheme>;
  children: ReactNode;
}

/** Provide a theme to every gauge below. A gauge's own `theme` prop is merged on top. */
export function GaugeThemeProvider({ theme, children }: GaugeThemeProviderProps) {
  const parent = useContext(ThemeContext);
  return <ThemeContext.Provider value={{ ...parent, ...theme }}>{children}</ThemeContext.Provider>;
}

export function useGaugeTheme(local?: Partial<GaugeTheme>): Partial<GaugeTheme> | undefined {
  const ctx = useContext(ThemeContext);
  if (!ctx && !local) return undefined;
  return { ...ctx, ...local };
}
