import type { JSX } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AttitudeIndicator,
  BatteryGauge,
  BubbleLevel,
  Clinometer,
  Compass,
  Dial,
  GaugeThemeProvider,
  LinearGauge,
  Odometer,
  RingGauge,
  SegmentedMeter,
  Speedometer,
  Tachometer,
  TankGauge,
  Thermometer,
  themes,
} from '../src';

const cases: Array<[string, JSX.Element]> = [
  ['Dial', <Dial value={42} zones={[{ from: 80, to: 100, color: 'bad' }]} markers={[{ value: 60, label: 'T' }]} minHold={10} maxHold={90} />],
  ['Dial semicircle arc', <Dial value={42} startAngle={-90} endAngle={90} variant="arc" />],
  ['Speedometer', <Speedometer value={88} />],
  ['Tachometer', <Tachometer value={7000} />],
  ['Thermometer', <Thermometer value={21} secondaryUnit="F" markers={[{ value: 30, label: 'hi' }]} />],
  ['Thermometer horizontal', <Thermometer value={21} orientation="horizontal" />],
  ['Compass needle', <Compass heading={245} markers={[{ value: 90, label: 'E' }]} />],
  ['Compass card', <Compass heading={10} mode="card" />],
  ['Clinometer level', <Clinometer value={12} display="both" />],
  ['Clinometer protractor', <Clinometer value={-20} variant="protractor" />],
  ['BubbleLevel vial', <BubbleLevel value={1} />],
  ['BubbleLevel bullseye', <BubbleLevel value={1} valueY={-2} />],
  ['AttitudeIndicator', <AttitudeIndicator pitch={5} roll={-20} />],
  ['LinearGauge bullet', <LinearGauge value={70} variant="bullet" target={80} />],
  ['LinearGauge vertical pointer', <LinearGauge value={70} variant="pointer" orientation="vertical" />],
  ['TankGauge circle', <TankGauge value={60} shape="circle" />],
  ['BatteryGauge', <BatteryGauge value={12} segments={5} charging />],
  ['SegmentedMeter arc', <SegmentedMeter value={50} layout="arc" peak={80} />],
  ['RingGauge', <RingGauge value={30} rings={[{ value: 50 }, { value: 70 }]} />],
  ['Odometer', <Odometer value={1234.5} format={{ decimals: 1 }} minDigits={6} />],
];

describe('every gauge renders', () => {
  for (const [name, el] of cases) {
    it(name, () => {
      const { container } = render(el);
      expect(container.querySelector('.rg-root')).toBeTruthy();
      expect(container.innerHTML).not.toMatch(/NaN|undefined/);
    });
  }
});

describe('accessibility', () => {
  it('exposes meter semantics with formatted text', () => {
    const { getByRole } = render(<Dial value={72} format={{ unit: '%', maxDecimals: 0 }} label="Humidity" animate={false} />);
    const m = getByRole('meter');
    expect(m.getAttribute('aria-valuenow')).toBe('72');
    expect(m.getAttribute('aria-valuetext')).toBe('72%');
    expect(m.getAttribute('aria-label')).toBe('Humidity');
  });
  it('labels the compass as an image with heading text', () => {
    const { getByRole } = render(<Compass heading={90} animate={false} />);
    expect(getByRole('img').getAttribute('aria-label')).toBe('Heading 90° E');
  });
});

describe('theming', () => {
  it('turns theme tokens into CSS variables, provider first then props', () => {
    const { container } = render(
      <GaugeThemeProvider theme={themes.wateringCan}>
        <Dial value={10} theme={{ accent: 'red' }} />
      </GaugeThemeProvider>,
    );
    const root = container.querySelector('.rg-root') as HTMLElement;
    expect(root.style.getPropertyValue('--rg-accent')).toBe('red');
    expect(root.style.getPropertyValue('--rg-face')).toBe('#ffffff');
  });
  it('passes slot classes to parts', () => {
    const { container } = render(<Dial value={10} classNames={{ value: 'fill-rose-600', needle: 'needle-x' }} />);
    expect(container.querySelector('.rg-value')?.getAttribute('class')).toContain('fill-rose-600');
    expect(container.querySelector('.needle-x')).toBeTruthy();
  });
});

describe('dial readout layout', () => {
  const valueY = (el: JSX.Element) => {
    const { container } = render(el);
    return Number(container.querySelector('.rg-value')?.getAttribute('y'));
  };
  it('keeps a short readout in its usual spot', () => {
    expect(valueY(<Dial value={7} format="0%" animate={false} />)).toBeCloseTo(137.8, 1);
  });
  it('drops a long readout below the min/max tick labels instead of overlapping them', () => {
    const y = valueY(<Dial value={56} format={{ unit: '%RH', decimals: 1 }} animate={false} />);
    expect(y).toBeGreaterThan(150);
  });
  it('leaves an explicit valueSize alone', () => {
    expect(valueY(<Dial value={56} valueSize={20} format={{ unit: '%RH', decimals: 1 }} animate={false} />)).toBeCloseTo(137.8, 1);
  });
});
