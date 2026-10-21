import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dial, evaluateLimits, limitZones, Odometer, Thermometer } from '../src';

const cooler = { warnBelow: 2, alarmBelow: 0.5 };

describe('evaluateLimits', () => {
  it('is ok inside the limits and without limits', () => {
    expect(evaluateLimits(3.4, cooler).status).toBe('ok');
    expect(evaluateLimits(-40, undefined).status).toBe('ok');
  });
  it('warns, then alarms, as a reading drops; alarm wins', () => {
    expect(evaluateLimits(1.5, cooler)).toMatchObject({ status: 'warn', limit: 'warnBelow', threshold: 2, label: 'Low warning' });
    expect(evaluateLimits(0.2, cooler)).toMatchObject({ status: 'alarm', limit: 'alarmBelow', label: 'Low alarm' });
  });
  it('treats the limit itself as still ok', () => {
    expect(evaluateLimits(2, cooler).status).toBe('ok');
    expect(evaluateLimits(80, { warnAbove: 80 }).status).toBe('ok');
  });
  it('handles high limits', () => {
    expect(evaluateLimits(96, { warnAbove: 80, alarmAbove: 95 }).status).toBe('alarm');
    expect(evaluateLimits(81, { warnAbove: 80, alarmAbove: 95 }).status).toBe('warn');
  });
  it('holds a crossed limit until the reading clears it by the hysteresis', () => {
    const limits = { ...cooler, hysteresis: 0.5 };
    const first = evaluateLimits(1.9, limits);
    expect(first.status).toBe('warn');
    expect(evaluateLimits(2.3, limits, first.active).status).toBe('warn'); // within the dead band
    expect(evaluateLimits(2.6, limits, first.active).status).toBe('ok');
    expect(evaluateLimits(2.3, limits).status).toBe('ok'); // not previously crossed: no dead band
  });
  it('uses custom labels', () => {
    expect(evaluateLimits(0, { alarmBelow: 1, labels: { alarmBelow: 'Frost risk' } }).label).toBe('Frost risk');
  });
});

describe('limitZones', () => {
  it('pictures the limits across the range', () => {
    expect(limitZones({ ...cooler, warnAbove: 8, alarmAbove: 10 }, -5, 15).map((z) => [z.from, z.to, z.color])).toEqual([
      [-5, 0.5, 'bad'],
      [0.5, 2, 'warn'],
      [8, 10, 'warn'],
      [10, 15, 'bad'],
    ]);
  });
});

describe('gauges with limits', () => {
  it('flags an alarm on the root and in the accessible text', () => {
    const { container, getByRole } = render(<Thermometer value={0.2} min={-5} max={15} limits={cooler} animate={false} />);
    const root = container.querySelector('.rg-root') as HTMLElement;
    expect(root.dataset.status).toBe('alarm');
    expect(root.dataset.limit).toBe('alarmBelow');
    expect(getByRole('meter').getAttribute('aria-valuetext')).toBe('0.2°C, Low alarm');
    expect(root.style.getPropertyValue('--rg-value')).toContain('--rg-bad');
  });
  it('reports ok when inside the limits', () => {
    const { container } = render(<Thermometer value={3.4} min={-5} max={15} limits={cooler} animate={false} />);
    expect((container.querySelector('.rg-root') as HTMLElement).dataset.status).toBe('ok');
  });
  it('draws limit zones and markers when the gauge has no zones', () => {
    const { container } = render(<Thermometer value={3.4} min={-5} max={15} limits={cooler} animate={false} />);
    expect(container.querySelectorAll('.rg-zones rect')).toHaveLength(2);
    expect(container.querySelectorAll('.rg-limit')).toHaveLength(2);
  });
  it('keeps the gauge’s own zones', () => {
    const zones = [{ from: -5, to: 15, color: 'info' }];
    const { container } = render(<Thermometer value={3.4} min={-5} max={15} zones={zones} limits={cooler} animate={false} />);
    expect(container.querySelectorAll('.rg-zones rect')).toHaveLength(1);
  });
  it('calls onStatusChange on mount and on each change', () => {
    const onStatusChange = vi.fn();
    const { rerender } = render(<Dial value={0.2} min={-5} max={15} limits={cooler} onStatusChange={onStatusChange} animate={false} />);
    expect(onStatusChange).toHaveBeenLastCalledWith('alarm', expect.objectContaining({ limit: 'alarmBelow', threshold: 0.5 }));
    rerender(<Dial value={1} min={-5} max={15} limits={cooler} onStatusChange={onStatusChange} animate={false} />);
    expect(onStatusChange).toHaveBeenLastCalledWith('warn', expect.objectContaining({ limit: 'warnBelow' }));
    rerender(<Dial value={1.2} min={-5} max={15} limits={cooler} onStatusChange={onStatusChange} animate={false} />);
    expect(onStatusChange).toHaveBeenCalledTimes(2); // still a warning: no new call
    rerender(<Dial value={4} min={-5} max={15} limits={cooler} onStatusChange={onStatusChange} animate={false} />);
    expect(onStatusChange).toHaveBeenLastCalledWith('ok', expect.objectContaining({ limit: undefined }));
  });
  it('supports limits on the odometer', () => {
    const { container } = render(<Odometer value={120} limits={{ alarmAbove: 100 }} animate={false} />);
    expect((container.querySelector('.rg-root') as HTMLElement).dataset.status).toBe('alarm');
  });
});
