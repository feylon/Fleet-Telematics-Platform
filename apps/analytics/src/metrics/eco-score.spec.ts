import { ecoScore } from './eco-score';

describe('ecoScore', () => {
  it('is 100 with no events', () => {
    expect(ecoScore({ mileageKm: 500, harshBrakes: 0, speedingEvents: 0, overRevEvents: 0 })).toBe(100);
  });

  it('never goes below zero or above one hundred', () => {
    expect(ecoScore({ mileageKm: 1, harshBrakes: 500, speedingEvents: 500, overRevEvents: 500 })).toBe(0);
    expect(ecoScore({ mileageKm: 0, harshBrakes: 0, speedingEvents: 0, overRevEvents: 0 })).toBe(100);
  });

  it('decreases monotonically with more events and improves with more mileage', () => {
    const a = ecoScore({ mileageKm: 200, harshBrakes: 2, speedingEvents: 1, overRevEvents: 0 });
    const b = ecoScore({ mileageKm: 200, harshBrakes: 4, speedingEvents: 1, overRevEvents: 0 });
    const c = ecoScore({ mileageKm: 800, harshBrakes: 4, speedingEvents: 1, overRevEvents: 0 });
    expect(b).toBeLessThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it('weights harsh brakes more than speeding', () => {
    const brakes = ecoScore({ mileageKm: 100, harshBrakes: 5, speedingEvents: 0, overRevEvents: 0 });
    const speeding = ecoScore({ mileageKm: 100, harshBrakes: 0, speedingEvents: 5, overRevEvents: 0 });
    expect(brakes).toBeLessThan(speeding);
  });
});
