import { formatTelegramMessage } from './telegram.sender';
import { isUrgent } from './notifications.queue';

describe('notifications', () => {
  it('formats a telegram message with a map link', () => {
    const text = formatTelegramMessage({ organizationId: 'o', vehicleId: 'v', alertType: 'SOS', severity: 'CRITICAL', details: 'SOS pressed', timestamp: '2026-08-01T05:00:00.000Z', latitude: 41.3, longitude: 69.2 });
    expect(text).toContain('SOS (CRITICAL)');
    expect(text).toContain('mlat=41.3');
  });

  it('classifies urgency', () => {
    expect(isUrgent({ alertType: 'SPEEDING', severity: 'WARNING' })).toBe(false);
    expect(isUrgent({ alertType: 'SPEEDING', severity: 'CRITICAL' })).toBe(true);
    expect(isUrgent({ alertType: 'GEOFENCE_EXIT', severity: 'WARNING' })).toBe(true);
  });
});
