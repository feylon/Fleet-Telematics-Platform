export interface DrivingStats {
  mileageKm: number;
  harshBrakes: number;
  speedingEvents: number;
  overRevEvents: number;
}

export const Weights = { harshBrake: 3, speeding: 2, overRev: 1 } as const;

export const ecoScore = (stats: DrivingStats): number => {
  const normalizer = Math.max(stats.mileageKm, 10) / 100;
  const penalty = (stats.harshBrakes * Weights.harshBrake + stats.speedingEvents * Weights.speeding + stats.overRevEvents * Weights.overRev) / normalizer;
  const score = 100 - penalty;
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
};
