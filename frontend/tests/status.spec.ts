import { describe, expect, it } from 'vitest';
import { statusColor, vehicleIconSvg } from '~/utils/status';

describe('status helpers', () => {
  it('maps statuses to colours', () => {
    expect(statusColor('MOVING')).toBe('#16a34a');
    expect(statusColor('IDLE')).toBe('#f59e0b');
    expect(statusColor('OFFLINE')).toBe('#6b7280');
    expect(statusColor('EMERGENCY')).toBe('#dc2626');
    expect(statusColor('unknown')).toBe('#6b7280');
  });

  it('rotates the vehicle icon by heading and pulses emergencies', () => {
    const svg = vehicleIconSvg('MOVING', 135);
    expect(svg).toContain('rotate(135 20 20)');
    expect(svg).toContain('#16a34a');
    expect(vehicleIconSvg('EMERGENCY', 725)).toContain('rotate(5 20 20)');
    expect(vehicleIconSvg('EMERGENCY', 0)).toContain('pulse-emergency');
  });
});
