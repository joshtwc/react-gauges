import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { classifySky, cloudPath, skyFromSummary, solarElevation, weatherState, WeatherConditions, WeatherIcon, windFraction } from '../src';

// Shapes published by weather-node (data.data of a "weather" message).
const sunny = { temperature: 18.4, raining: false, rain_intensity: 0, wind_speed: 12, wind_pct: 0.23, light_level: 82000, summary: 'Sunny' };
const showers = { temperature: 14.1, raining: true, rain_intensity: 48, wind_speed: 22, wind_pct: 0.55, light_level: 9000, summary: 'Cloudy, light showers, moderate winds' };

describe('weatherState', () => {
  it('reads the sky from weather-node’s summary', () => {
    expect(skyFromSummary('Partly Cloudy, light winds')).toBe('partly_cloudy');
    expect(skyFromSummary('Low Sun')).toBe('low_sun');
    expect(skyFromSummary('Night, high winds')).toBe('night');
    expect(skyFromSummary('Something else')).toBeUndefined();
    expect(weatherState(sunny)).toMatchObject({ condition: 'clear', sky: 'sunny', wind: 0 });
  });
  it('maps rain intensity to drizzle / rain / heavy like the POS', () => {
    expect(weatherState({ raining: true, rain_intensity: 10 }).condition).toBe('drizzle');
    expect(weatherState(showers)).toMatchObject({ condition: 'rain', wind: 2, precipitation: 'rain' });
    expect(weatherState({ raining: true, rain_intensity: 80 }).condition).toBe('heavy-rain');
    expect(weatherState({ raining: true, rain_intensity: 50 }, { rainBands: [60, 90] }).condition).toBe('drizzle');
  });
  it('shows freezing precipitation as snow', () => {
    expect(weatherState({ raining: true, rain_intensity: 50, temperature: -2 }).condition).toBe('snow');
    expect(weatherState({ raining: true, rain_intensity: 50, temperature: -2 }, { snowAtOrBelow: -Infinity }).condition).toBe('rain');
  });
  it('maps night and partly cloudy', () => {
    expect(weatherState({ summary: 'Night' }).condition).toBe('clear-night');
    expect(weatherState({ sky: 'partly_cloudy' }).condition).toBe('partly-cloudy');
  });
  it('derives wind from speed with weather-node’s range when wind_pct is missing', () => {
    expect(windFraction(4.5)).toBe(0);
    expect(windFraction(36.5)).toBe(1);
    expect(weatherState({ wind_speed: 30 }).wind).toBe(3);
    expect(weatherState({ wind_speed: 8 }).wind).toBe(0);
  });
  it('builds a summary when the reading has none', () => {
    expect(weatherState({ light_level: 90000, wind_speed: 30 }).label).toBe('Sunny, high winds');
  });
});

describe('sky classification', () => {
  it('computes a plausible sun elevation (Vineland, ON)', () => {
    const noon = solarElevation(new Date('2026-06-21T17:15:00Z'), 43.158, -79.41);
    const midnight = solarElevation(new Date('2026-06-21T05:00:00Z'), 43.158, -79.41);
    expect(noon).toBeGreaterThan(65);
    expect(noon).toBeLessThan(72);
    expect(midnight).toBeLessThan(0);
  });
  it('matches weather-node’s classifier with a location', () => {
    const at = { latitude: 43.158, longitude: -79.41, now: new Date('2026-06-21T17:15:00Z') };
    expect(classifySky(95000, at)).toBe('sunny');
    expect(classifySky(50000, at)).toBe('partly_cloudy');
    expect(classifySky(15000, at)).toBe('cloudy');
    expect(classifySky(5, at)).toBe('night');
    expect(classifySky(50000, { ...at, now: new Date('2026-06-21T05:00:00Z') })).toBe('night');
  });
});

describe('icon', () => {
  it('builds valid cloud paths', () => {
    const d = cloudPath([[20, 40, 8], [31, 32, 12], [43, 38, 10]]);
    expect(d).not.toMatch(/NaN/);
    expect(d.match(/A /g)).toHaveLength(3);
  });
  it('renders every condition', () => {
    for (const c of ['clear', 'clear-night', 'partly-cloudy', 'partly-cloudy-night', 'cloudy', 'low-sun', 'drizzle', 'rain', 'heavy-rain', 'snow', 'thunderstorm', 'fog', 'wind'] as const) {
      const { container } = render(<WeatherIcon condition={c} animate={false} />);
      expect(container.innerHTML).not.toMatch(/NaN|undefined/);
      expect(container.querySelector('svg')?.getAttribute('data-condition')).toBe(c);
    }
  });
});

describe('WeatherConditions', () => {
  it('describes the weather for screen readers', () => {
    const { getByRole } = render(<WeatherConditions reading={showers} label="Vineland" animate={false} />);
    expect(getByRole('img').getAttribute('aria-label')).toBe('Vineland, Cloudy, light showers, moderate winds, 14.1°C, Wind 22\u2009km/h, Rain 48%');
  });
  it('flags temperature limits', () => {
    const { container } = render(<WeatherConditions reading={{ ...sunny, temperature: -1 }} limits={{ alarmBelow: 0 }} animate={false} />);
    const root = container.querySelector('.rg-root') as HTMLElement;
    expect(root.dataset.status).toBe('alarm');
    expect(root.textContent).toContain('Too cold');
  });
  it('reports condition changes', () => {
    const onConditionChange = vi.fn();
    const { rerender } = render(<WeatherConditions reading={sunny} onConditionChange={onConditionChange} animate={false} />);
    rerender(<WeatherConditions reading={{ ...sunny, temperature: 19 }} onConditionChange={onConditionChange} animate={false} />);
    rerender(<WeatherConditions reading={showers} onConditionChange={onConditionChange} animate={false} />);
    expect(onConditionChange.mock.calls.map((c) => c[0])).toEqual(['clear', 'rain']);
  });
  it('lets a condition be forced', () => {
    const { container } = render(<WeatherConditions reading={sunny} condition="fog" animate={false} />);
    expect((container.querySelector('.rg-root') as HTMLElement).dataset.condition).toBe('fog');
  });
});
