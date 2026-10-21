import { describe, expect, it } from 'vitest';
import { createFormatter, createTickFormatter, formatNumber, parseFormatPattern } from '../src/core/format';
import { arcPath, polar, sweepExtent, wrap360 } from '../src/core/geometry';
import { clamp, generateTicks, niceStep, normalize } from '../src/core/scale';
import { clipZone, thresholdZones, zoneAt } from '../src/core/zones';
import { headingToCardinal } from '../src/gauges/Compass';
import { angleToGrade, gradeToAngle } from '../src/gauges/Clinometer';
import { convertTemperature } from '../src/gauges/Thermometer';

const ctx = { min: 0, max: 100, ratio: 0 };

describe('scale', () => {
  it('clamps and normalises, including inverted ranges', () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-5, 100, 0)).toBe(0);
    expect(normalize(25, 0, 100)).toBe(0.25);
    expect(normalize(5, 5, 5)).toBe(0);
  });
  it('picks nice steps', () => {
    expect(niceStep(100, 10)).toBe(10);
    expect(niceStep(240, 12)).toBe(20);
    expect(niceStep(1, 4)).toBe(0.25);
  });
  it('generates majors without floating point drift', () => {
    const t = generateTicks(0, 1, { step: 0.1 });
    expect(t.major).toHaveLength(11);
    expect(t.major[3]).toBe(0.3);
  });
  it('generates minors between majors and at the edges', () => {
    const t = generateTicks(-5, 15, { step: 5, minor: 4 });
    expect(t.major).toEqual([-5, 0, 5, 10, 15]);
    expect(t.minor).toContain(-4);
    expect(t.minor).not.toContain(0);
    expect(t.minor).toHaveLength(16);
  });
  it('honours explicit values and hiding', () => {
    expect(generateTicks(0, 100, { values: [0, 33, 150] }).major).toEqual([0, 33]);
    expect(generateTicks(0, 100, { show: false }).major).toEqual([]);
  });
});

describe('format', () => {
  it('formats with units and decimals', () => {
    expect(formatNumber(3.456, { decimals: 1, unit: '°C', locale: 'en-US' })).toBe('3.5°C');
    expect(formatNumber(42, { unit: 'km/h', locale: 'en-US' })).toBe('42 km/h');
  });
  it('supports currency, percent, compact and signs', () => {
    expect(formatNumber(1234.5, { style: 'currency', currency: 'USD', locale: 'en-US' })).toBe('$1,234.50');
    expect(formatNumber(45, { style: 'percent', locale: 'en-US' })).toBe('45%');
    expect(formatNumber(125000, { notation: 'compact', locale: 'en-US' })).toBe('125K');
    expect(formatNumber(2, { signDisplay: 'always', locale: 'en-US' })).toBe('+2');
  });
  it('can express the value as a percentage of the range', () => {
    expect(formatNumber(150, { percentOfRange: true, locale: 'en-US' }, { min: 100, max: 200, ratio: 0.5 })).toBe('50%');
  });
  it('parses patterns', () => {
    expect(parseFormatPattern('0.0 °C')).toMatchObject({ minDecimals: 1, maxDecimals: 1, unit: '°C', unitSpace: true });
    expect(parseFormatPattern('$#,##0.00')).toMatchObject({ prefix: '$', grouping: true, minDecimals: 2 });
    const f = createFormatter('+0.0%', {});
    expect(f(3, ctx)).toBe('+3.0%');
    expect(createFormatter('#,##0 stems')(1250, ctx)).toBe('1,250\u2009stems');
  });
  it('lets user options override gauge defaults', () => {
    const f = createFormatter({ decimals: 0 }, { maxDecimals: 1, unit: '°C' });
    expect(f(3.7, ctx)).toBe('4°C');
  });
  it('accepts a function', () => {
    const f = createFormatter((v, c) => `${v}/${c.max}`);
    expect(f(5, ctx)).toBe('5/100');
  });
  it('builds tick formatters without units or currency', () => {
    const t = createTickFormatter(undefined, { unit: 'km/h', decimals: 1 }, 20);
    expect(t(40, ctx)).toBe('40');
    const c = createTickFormatter(undefined, { style: 'currency', currency: 'CAD', locale: 'en-CA' }, 1000);
    expect(c(2000, ctx)).toBe('2,000');
    const compact = createTickFormatter(undefined, undefined, 2500, { notation: 'compact', locale: 'en-US' });
    expect(compact(12500, ctx)).toBe('12.5K');
  });
  it('handles invalid numbers', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity, { invalidText: 'n/a' })).toBe('n/a');
  });
});

describe('zones', () => {
  it('finds and clips zones', () => {
    const zones = thresholdZones([0, 60, 85, 100]);
    expect(zones.map((z) => z.color)).toEqual(['good', 'warn', 'bad']);
    expect(zoneAt(70, zones)?.color).toBe('warn');
    expect(zoneAt(120, zones)).toBeUndefined();
    expect(clipZone({ from: -10, to: 20, color: 'x' }, 0, 100)).toMatchObject({ from: 0, to: 20 });
    expect(clipZone({ from: 200, to: 300, color: 'x' }, 0, 100)).toBeNull();
  });
});

describe('geometry', () => {
  it('uses 0° = up, clockwise', () => {
    expect(polar(0, 0, 10, 0)).toEqual({ x: 0, y: -10 });
    expect(polar(0, 0, 10, 90)).toEqual({ x: 10, y: 0 });
  });
  it('draws full circles as two arcs', () => {
    expect(arcPath(100, 100, 50, 0, 360).match(/A /g)).toHaveLength(2);
  });
  it('computes the extent of a partial sweep', () => {
    const e = sweepExtent(100, 100, 90, -90, 90);
    expect(e.maxY).toBe(100);
    expect(e.minY).toBe(10);
  });
  it('wraps angles', () => {
    expect(wrap360(-10)).toBe(350);
    expect(wrap360(725)).toBe(5);
  });
});

describe('instrument helpers', () => {
  it('names compass points', () => {
    expect(headingToCardinal(0)).toBe('N');
    expect(headingToCardinal(245)).toBe('WSW');
    expect(headingToCardinal(350, 8)).toBe('N');
    expect(headingToCardinal(-45, 4)).toBe('N');
    expect(headingToCardinal(135, 8)).toBe('SE');
  });
  it('converts slope angle and grade', () => {
    expect(angleToGrade(45)).toBeCloseTo(100);
    expect(gradeToAngle(100)).toBeCloseTo(45);
    expect(angleToGrade(90)).toBe(Infinity);
  });
  it('converts temperatures', () => {
    expect(convertTemperature(100, 'C', 'F')).toBeCloseTo(212);
    expect(convertTemperature(32, 'F', 'K')).toBeCloseTo(273.15);
  });
});
